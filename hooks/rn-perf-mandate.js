#!/usr/bin/env node
// Claude Code plugin hook: when the current project is a React Native app,
// inject the RN Perf mandatory-skill policy into context. Injects on session
// start (including resume/compact) and once per session before the first
// file edit. Exits silently everywhere else; never blocks the tool call.

const fs = require("fs");
const os = require("os");
const path = require("path");

const POLICY = [
  "RN Perf plugin policy (this project is a React Native app and the rn-perf plugin is installed):",
  "- RN Perf skills are MANDATORY for performance-sensitive code changes. Before writing or changing startup, rendering, navigation, lists, images, animations, gestures, forms, state, data fetching, storage, native modules, assets, bundling, memory, or app-size code, invoke the matching rn-perf-* skill.",
  "- Start broad audits, regressions, or unclear performance symptoms with rn-perf-full-app-test.",
  "- Measure first, optimize second, then re-measure with the same device, build mode, interaction, and metric whenever runtime performance is affected.",
  "- Do not apply speculative useMemo/useCallback, dependency-array changes, stale-closure fixes, or library swaps without profiler evidence or a reproducible bug.",
  "- Treat new packages, native SDKs, Re.Pack configuration, remote chunks, and release build settings as supply-chain or release-risk changes."
].join("\n");

function main() {
  const event = process.argv[2] === "pre-tool-use" ? "PreToolUse" : "SessionStart";
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    input = {};
  }

  const filePath = input.tool_input && input.tool_input.file_path;
  const startDir = filePath ? path.dirname(path.resolve(filePath)) : input.cwd || process.cwd();
  if (!isReactNativeProject(startDir)) return;

  if (event === "PreToolUse") {
    const sessionId = String(input.session_id || "global").replace(/[^A-Za-z0-9_-]/g, "");
    const marker = path.join(os.tmpdir(), `rn-perf-mandate-${sessionId}`);
    if (fs.existsSync(marker)) return;
    try {
      fs.writeFileSync(marker, "");
    } catch {
      // If the marker cannot be written, still inject once rather than fail.
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: POLICY
      }
    })}\n`
  );
}

function isReactNativeProject(startDir) {
  let dir = startDir;
  for (let i = 0; i < 20; i += 1) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
        if (deps["react-native"] || deps.expo) return true;
      } catch {
        // Unparseable package.json: keep walking up.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

try {
  main();
} catch {
  // A hook failure must never break the session.
}
process.exit(0);
