import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Each build gets a version stamp. It's baked into the app and also written to
// /version.json, so a running app can tell when a newer build has been deployed.
const BUILD_VERSION = Date.now().toString(36);

const versionFile = () => ({
  name: 'alle-version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: BUILD_VERSION }) });
  },
});

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __APP_VERSION__: JSON.stringify(BUILD_VERSION) },
  server: { host: true },
});
