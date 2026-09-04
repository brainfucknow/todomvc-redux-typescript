import { defineSuite, stubServer } from './suite-config';

/**
 * The default run: the stub serves the production build and the control channel
 * on one origin, so no proxy stands between the browser and either of them.
 */
const port = Number(process.env.QA_STUB_PORT || 3100);

export default defineSuite({
  baseURL: `http://127.0.0.1:${port}`,
  controlOrigin: '',
  webServer: stubServer(port),
});
