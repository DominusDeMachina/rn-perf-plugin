#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
const pluginName = "rn-perf";

const args = process.argv.slice(2);
const command = args[0] || "help";

try {
  if (command === "help" || command === "--help" || command === "-h") {
    usage();
  } else if (command === "path") {
    printPath(args[1] || "root");
  } else if (command === "install") {
    install(args[1], new Set(args.slice(2)));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`rn-perf-plugin: ${error.message}`);
  process.exit(1);
}

function usage() {
  console.log(`Usage:
  rn-perf-plugin path [codex|claude|gemini|claude-marketplace]
  rn-perf-plugin install codex [--force]
  rn-perf-plugin install gemini [--force]
  rn-perf-plugin install all [--force]

Examples:
  claude --plugin-dir "$(rn-perf-plugin path claude)"
  gemini extensions install "$(rn-perf-plugin path gemini)"
  rn-perf-plugin install codex --force
`);
}

function printPath(target) {
  const paths = {
    root: packageRoot,
    codex: packageRoot,
    claude: packageRoot,
    gemini: path.join(packageRoot, "gemini-extension"),
    "claude-marketplace": path.join(packageRoot, "marketplaces", "claude-npm")
  };

  if (!paths[target]) {
    throw new Error(`Unknown path target: ${target}`);
  }
  console.log(paths[target]);
}

function install(target, flags) {
  if (!target) {
    throw new Error("Missing install target: codex, gemini, or all");
  }

  if (target === "all") {
    installCodex(flags);
    installGemini(flags);
    return;
  }

  if (target === "codex") {
    installCodex(flags);
    return;
  }

  if (target === "gemini") {
    installGemini(flags);
    return;
  }

  throw new Error(`Unknown install target: ${target}`);
}

function installGemini(flags) {
  const source = path.join(packageRoot, "gemini-extension");
  const destination = path.join(os.homedir(), ".gemini", "extensions", pluginName);
  copyDirectory(source, destination, flags.has("--force"));
  console.log(`Installed Gemini CLI extension to ${destination}`);
}

function installCodex(flags) {
  const marketplaceRoot = path.join(os.homedir(), ".agents", "plugins");
  const pluginDestination = path.join(marketplaceRoot, "plugins", pluginName);
  copyCodexPlugin(pluginDestination, flags.has("--force"));
  updateCodexMarketplace(path.join(marketplaceRoot, "marketplace.json"));
  console.log(`Installed Codex plugin to ${pluginDestination}`);
}

function copyCodexPlugin(destination, force) {
  ensureWritableDestination(destination, force);
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of [".codex-plugin", "skills", "docs", "LICENSE", "POWER.md", "README.md", "package.json"]) {
    const source = path.join(packageRoot, entry);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(destination, entry), {
        recursive: true,
        force: true,
        filter: shouldCopy
      });
    }
  }
}

function copyDirectory(source, destination, force) {
  ensureWritableDestination(destination, force);
  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    filter: shouldCopy
  });
}

function ensureWritableDestination(destination, force) {
  if (fs.existsSync(destination)) {
    if (!force) {
      throw new Error(`${destination} already exists; rerun with --force to replace it`);
    }
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
}

function shouldCopy(source) {
  const basename = path.basename(source);
  return ![
    ".DS_Store",
    ".git",
    ".in_use",
    "node_modules"
  ].includes(basename) && !basename.endsWith(".tgz");
}

function updateCodexMarketplace(marketplacePath) {
  fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });

  const marketplace = fs.existsSync(marketplacePath)
    ? JSON.parse(fs.readFileSync(marketplacePath, "utf8"))
    : {
        name: "personal",
        interface: {
          displayName: "Personal"
        },
        plugins: []
      };

  marketplace.name ||= "personal";
  marketplace.interface ||= { displayName: "Personal" };
  marketplace.plugins ||= [];

  const entry = {
    name: pluginName,
    source: {
      source: "local",
      path: `./plugins/${pluginName}`
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Developer Tools"
  };

  const existingIndex = marketplace.plugins.findIndex((plugin) => plugin.name === pluginName);
  if (existingIndex >= 0) {
    marketplace.plugins[existingIndex] = {
      ...marketplace.plugins[existingIndex],
      ...entry
    };
  } else {
    marketplace.plugins.push(entry);
  }

  fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
}
