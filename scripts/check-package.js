#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = readJson("package.json");
const codex = readJson(".codex-plugin/plugin.json");
const claude = readJson(".claude-plugin/plugin.json");
const gemini = readJson("gemini-extension/gemini-extension.json");
const marketplace = readJson("marketplaces/claude-npm/.claude-plugin/marketplace.json");
const skillNames = fs
  .readdirSync(path.join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

assert(pkg.name === "rn-perf-plugin", "package name must stay rn-perf-plugin");
assert(pkg.version === "0.1.0", "package version must be 0.1.0");
assert(codex.name === "rn-perf", "Codex plugin name must be rn-perf");
assert(codex.version === pkg.version, "Codex plugin version must match package version");
assert(claude.name === "rn-perf", "Claude plugin name must be rn-perf");
assert(claude.version === pkg.version, "Claude plugin version must match package version");
assert(gemini.name === "rn-perf", "Gemini extension name must be rn-perf");
assert(gemini.version === pkg.version, "Gemini extension version must match package version");
assert(marketplace.plugins.length === 1, "Claude npm marketplace must contain one plugin");
assert(marketplace.plugins[0].source.package === pkg.name, "Claude marketplace npm package must match package name");
assert(marketplace.plugins[0].source.version === pkg.version, "Claude marketplace npm version must match package version");
assert(skillNames.length === 36, `expected 36 skills, found ${skillNames.length}`);

for (const skillName of skillNames) {
  const skillPath = path.join(root, "skills", skillName, "SKILL.md");
  const commandPath = path.join(root, "gemini-extension", "commands", `${skillName}.toml`);
  const skill = fs.readFileSync(skillPath, "utf8");
  assert(skill.includes(`name: ${skillName}`), `${skillPath} must declare name: ${skillName}`);
  assert(fs.existsSync(commandPath), `${commandPath} is missing`);
}

console.log(`Package check passed for ${skillNames.length} skills`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
