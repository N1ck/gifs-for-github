const {readFileSync, writeFileSync, existsSync} = require('node:fs');
const path = require('node:path');

const manifestPath = path.resolve('./distribution/manifest.json');

if (!existsSync(manifestPath)) {
  throw new Error('manifest.json does not exist. Please build first.');
}

const manifest = readFileSync(manifestPath, 'utf8');
const manifestObject = JSON.parse(manifest);

const newManifest = {
  ...manifestObject,

  manifest_version: 2,
  background: {
    scripts: [manifestObject.background.service_worker],
  },
};

// Convert action to browser_action for MV2
if (newManifest.action) {
  newManifest.browser_action = newManifest.action;
  delete newManifest.action;
}

delete newManifest.background.service_worker;
delete newManifest.background.type;

writeFileSync(manifestPath, JSON.stringify(newManifest, undefined, 2));
