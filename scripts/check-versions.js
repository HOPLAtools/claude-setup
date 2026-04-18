#!/usr/bin/env node
// prepublishOnly guard: fails the publish if the three version sources drift.
// Run manually with: node scripts/check-versions.js

import fs from "fs";

const pkg = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
const plugin = JSON.parse(
    fs.readFileSync(new URL("../.claude-plugin/plugin.json", import.meta.url), "utf8")
);
const marketplace = JSON.parse(
    fs.readFileSync(new URL("../.claude-plugin/marketplace.json", import.meta.url), "utf8")
);

const pkgV = pkg.version;
const pluginV = plugin.version;
const marketV = marketplace.plugins?.[0]?.version;

if (!pkgV || !pluginV || !marketV || pkgV !== pluginV || pkgV !== marketV) {
    console.error("✗ Version mismatch — bump all three before publishing:");
    console.error(`  package.json:     ${pkgV}`);
    console.error(`  plugin.json:      ${pluginV}`);
    console.error(`  marketplace.json: ${marketV}`);
    process.exit(1);
}

console.log(`✓ Versions synced at ${pkgV}`);
