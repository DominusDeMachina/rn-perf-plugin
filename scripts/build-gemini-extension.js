#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = readJson(path.join(root, "package.json"));
const skillsDir = path.join(root, "skills");
const extensionDir = path.join(root, "gemini-extension");
const commandsDir = path.join(extensionDir, "commands");

fs.rmSync(commandsDir, { recursive: true, force: true });
fs.mkdirSync(commandsDir, { recursive: true });

const skills = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
    const skill = parseSkill(fs.readFileSync(skillPath, "utf8"), skillPath);
    if (skill.name !== entry.name) {
      throw new Error(`${skillPath}: frontmatter name must match directory name`);
    }
    return skill;
  })
  .sort((a, b) => a.name.localeCompare(b.name));

writeJson(path.join(extensionDir, "gemini-extension.json"), {
  name: "rn-perf",
  version: pkg.version,
  contextFileName: "GEMINI.md"
});

fs.writeFileSync(
  path.join(extensionDir, "GEMINI.md"),
  [
    "# RN Perf Gemini CLI Extension",
    "",
    "RN Perf provides React Native performance commands generated from the shared Agent Skills in this package.",
    "",
    "When this extension is installed in a React Native project, RN Perf skills are mandatory for performance-sensitive code changes: use the matching `/rn-perf-*` command before writing or changing startup, rendering, navigation, lists, images, animations, gestures, forms, state, data fetching, storage, native module, asset, bundling, memory, or app-size code.",
    "",
    "Use measurement before fixes. Capture baseline evidence, make the smallest justified change, then re-measure with the same device, build mode, interaction, and metric.",
    "",
    "For broad audits, start with `/rn-perf-full-app-test`. For specific symptoms, use the matching `/rn-perf-*` command.",
    "",
    "The source skills are also shipped in the npm package for Codex and Claude Code. Gemini commands embed those instructions so they work without additional setup."
  ].join("\n") + "\n"
);

for (const skill of skills) {
  const prompt = [
    `# RN Perf Skill: ${skill.name}`,
    "",
    `Use when: ${skill.description}`,
    "",
    "Follow the skill instructions below. If another RN Perf skill is referenced as `[[skill-name]]`, use that skill's command when it is available, or apply the referenced skill from the package source if you have it loaded.",
    "",
    "Gemini CLI appends the user's raw command after this prompt when arguments are provided.",
    "",
    skill.body.trim(),
    ""
  ].join("\n");

  const toml = [
    `description = ${JSON.stringify(shortDescription(skill.description))}`,
    `prompt = ${tomlMultilineLiteral(prompt)}`
  ].join("\n") + "\n";

  fs.writeFileSync(path.join(commandsDir, `${skill.name}.toml`), toml);
}

console.log(`Generated ${skills.length} Gemini commands in ${path.relative(root, commandsDir)}`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseSkill(content, filePath) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "---") {
    throw new Error(`${filePath}: missing YAML frontmatter`);
  }

  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  if (end === -1) {
    throw new Error(`${filePath}: unterminated YAML frontmatter`);
  }

  const frontmatter = lines.slice(1, end).join("\n");
  const body = lines.slice(end + 1).join("\n");
  const name = readFrontmatterValue(frontmatter, "name");
  const description = readFrontmatterValue(frontmatter, "description");

  if (!name) {
    throw new Error(`${filePath}: missing frontmatter name`);
  }
  if (!description) {
    throw new Error(`${filePath}: missing frontmatter description`);
  }

  return { name, description, body };
}

function readFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function shortDescription(description) {
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || description;
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}...` : firstSentence;
}

function tomlMultilineLiteral(value) {
  if (!value.includes("'''")) {
    return `'''\n${value}'''`;
  }
  return JSON.stringify(value);
}
