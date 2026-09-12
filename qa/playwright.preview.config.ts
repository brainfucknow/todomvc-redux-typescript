import { defineProxiedSuite } from './suite-config';

/** The same procedures against `npm run preview`: the production build, served by Vite. */
export default defineProxiedSuite('preview', Number(process.env.QA_PREVIEW_PORT || 4173));
