import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export type FixtureName = 'EMPTY' | 'ONE_ACTIVE' | 'TWO_COMPLETED' | 'THREE_MIXED';
export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * The stub backend's control channel: test scaffolding, not the app under test.
 * Used for setup and synchronization only. No procedure decides pass or fail
 * from it, and no procedure drives the app through `api/todos/`.
 */
export class StubControl {
  constructor(private readonly request: APIRequestContext) {}

  async reset(fixture: FixtureName): Promise<void> {
    await accepted(this.request.post('/__qa/reset', { data: { fixture } }));
  }

  async armTransportFault(method: Method, path: string): Promise<void> {
    await accepted(this.request.post('/__qa/faults', { data: { kind: 'transport', method, path } }));
  }

  async armStatusFault(method: Method, path: string, code: number, body: string): Promise<void> {
    await accepted(this.request.post('/__qa/faults', { data: { kind: 'status', method, path, code, body } }));
  }

  async clearFaults(): Promise<void> {
    await accepted(this.request.delete('/__qa/faults'));
  }

  async faultedRequests(method: Method, path: string): Promise<number> {
    const response = await accepted(this.request.get('/__qa/faults'));
    const { faults } = (await response.json()) as { faults: ArmedFault[] };
    const armed = faults.find((fault) => fault.method === method && fault.path === path);
    return armed ? armed.matched : 0;
  }
}

interface ArmedFault {
  kind: string;
  method: string;
  path: string;
  matched: number;
}

async function accepted(pending: Promise<APIResponse>): Promise<APIResponse> {
  const response = await pending;
  if (!response.ok()) {
    throw new Error(`stub control channel: ${response.status()} ${await response.text()}`);
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
