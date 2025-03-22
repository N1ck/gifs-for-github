const {readFileSync, writeFileSync, existsSync} = require('node:fs')
const {resolve} = require('node:path')

const manifestPath = resolve('./distribution/manifest.json')

if (!existsSync(manifestPath)) {
  throw new Error('manifest.json does not exist. Please build first.')
}

const manifest = readFileSync(manifestPath, 'utf8')
const manifestObject = JSON.parse(manifest)

const newManifest = {
  ...manifestObject,
  background: {
    scripts: [manifestObject.background.service_worker]
  }
}
delete newManifest.background.service_worker
delete newManifest.background.type

writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2))
