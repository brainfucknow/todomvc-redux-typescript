import { defineProxiedSuite } from './suite-config';

/**
 * The same procedures against `npm run dev`. React.StrictMode makes the initial
 * `GET api/todos/` happen twice here, which is why faults are armed per
 * method-and-path rather than per request.
 */
export default defineProxiedSuite('dev', Number(process.env.QA_DEV_PORT || 3000));
