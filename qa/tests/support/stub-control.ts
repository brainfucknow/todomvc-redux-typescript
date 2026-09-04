import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export type FixtureName = 'EMPTY' | 'ONE_ACTIVE' | 'TWO_COMPLETED' | 'THREE_MIXED';
export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type FaultKind = 'transport' | 'status';

/**
 * The stub backend's control channel: test scaffolding, not the app under test.
 * Used for setup and synchronization only. No procedure decides pass or fail
 * from it, and no procedure drives the app through `api/todos/`.
 *
 * `origin` is empty when the stub also serves the app, and the stub's own
 * origin when a Vite server does. Vite proxies `/api` and nothing else, so a
 * relative `/__qa/` request there is answered by the SPA fallback: `200` and a
 * page of HTML, which would arm no fault while every status check still passed.
 */
export class StubControl {
  constructor(private readonly request: APIRequestContext, private readonly origin: string = '') {}

  async reset(fixture: FixtureName): Promise<void> {
    await accepted(this.request.post(this.url('/__qa/reset'), { data: { fixture } }));
  }

  async armTransportFault(method: Method, path: string): Promise<void> {
    await this.arm({ kind: 'transport', method, path });
  }

  async armStatusFault(method: Method, path: string, code: number, body: string): Promise<void> {
    await this.arm({ kind: 'status', method, path, code, body });
  }

  async clearFaults(): Promise<void> {
    await accepted(this.request.delete(this.url('/__qa/faults')));
  }

  async faultedRequests(method: Method, path: string): Promise<number> {
    const response = await accepted(this.request.get(this.url('/__qa/faults')));
    const { faults } = (await response.json()) as { faults: ArmedFault[] };
    const armed = faults.find((fault) => fault.method === method && fault.path === path);
    return armed ? armed.matched : 0;
  }

  private async arm(fault: ArmRequest): Promise<void> {
    await accepted(this.request.post(this.url('/__qa/faults'), { data: fault }));
  }

  private url(controlPath: string): string {
    return `${this.origin}${controlPath}`;
  }
}

interface ArmRequest {
  kind: FaultKind;
  method: Method;
  path: string;
  code?: number;
  body?: string;
}

interface ArmedFault {
  kind: string;
  method: string;
  path: string;
  matched: number;
}

/**
 * A control call must reach the stub, not merely return `200`. The JSON check is
 * what tells a real answer apart from a web server's SPA fallback.
 */
async function accepted(pending: Promise<APIResponse>): Promise<APIResponse> {
  const response = await pending;
  const contentType = response.headers()['content-type'] ?? '';
  if (!response.ok() || !contentType.includes('application/json')) {
    throw new Error(
      `stub control channel: ${response.url()} answered ${response.status()} ${contentType} ${(await response.text()).slice(0, 120)}`,
    );
  }
  return response;
}

/**
 * Synchronization for the failure procedures, never the assertion: they assert
 * absences, and the app shows nothing at the moment a request fails.
 */
export async function waitForFaultedRequest(stub: StubControl, method: Method, path: string): Promise<void> {
  await expect
    .poll(() => stub.faultedRequests(method, path), { message: `stub never faulted ${method} ${path}` })
    .toBeGreaterThan(0);
}
