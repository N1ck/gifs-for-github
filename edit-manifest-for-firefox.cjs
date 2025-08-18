const { readFileSync, writeFileSync, existsSync } = require('node:fs');
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

// Move host permissions to regular permissions
if (newManifest.host_permissions) {
  newManifest.permissions = [...newManifest.permissions, ...newManifest.host_permissions];
  delete newManifest.host_permissions;
}

// For Firefox, storage can't be optional, so move it to required permissions
if (newManifest.optional_permissions && newManifest.optional_permissions.includes('storage')) {
  // Remove 'storage' from optional permissions
  newManifest.optional_permissions = newManifest.optional_permissions.filter(p => p !== 'storage');

  // Add 'storage' to required permissions if not already there
  if (!newManifest.permissions.includes('storage')) {
    newManifest.permissions.push('storage');
  }

  // Remove optional_permissions key if empty
  if (newManifest.optional_permissions.length === 0) {
    delete newManifest.optional_permissions;
  }
}

// Move optional host permissions to optional permissions
if (newManifest.optional_host_permissions) {
  if (!newManifest.optional_permissions) {
    newManifest.optional_permissions = [];
  }
  newManifest.optional_permissions = [...newManifest.optional_permissions, ...newManifest.optional_host_permissions];
  delete newManifest.optional_host_permissions;
}

// Convert web_accessible_resources to v2 format
if (newManifest.web_accessible_resources?.[0]?.resources) {
  newManifest.web_accessible_resources = newManifest.web_accessible_resources[0].resources;
}

delete newManifest.background.service_worker;
delete newManifest.background.type;

writeFileSync(manifestPath, JSON.stringify(newManifest, undefined, 2));
