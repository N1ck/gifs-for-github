const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.resolve(__dirname, './distribution/manifest.json');

const isManifestExist = fs.existsSync(manifestPath);
if (!isManifestExist) {
  console.error('manifest.json does not exist. Please build first.');
  process.exit(1);
}

const manifest = fs.readFileSync(manifestPath, "utf8");
const manifestObject = JSON.parse(manifest);

const newManifest = {
  ...manifestObject,
  background: {
    scripts: [manifestObject.background.service_worker]
  }
}
delete newManifest.background.service_worker;
delete newManifest.background.type;

fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2));
