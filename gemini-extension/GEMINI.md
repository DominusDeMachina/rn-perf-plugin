# RN Perf Gemini CLI Extension

RN Perf provides React Native performance commands generated from the shared Agent Skills in this package.

When this extension is installed in a React Native project, RN Perf skills are mandatory for performance-sensitive code changes: use the matching `/rn-perf-*` command before writing or changing startup, rendering, navigation, lists, images, animations, gestures, forms, state, data fetching, storage, native module, asset, bundling, memory, or app-size code.

Use measurement before fixes. Capture baseline evidence, make the smallest justified change, then re-measure with the same device, build mode, interaction, and metric.

For broad audits, start with `/rn-perf-full-app-test`. For specific symptoms, use the matching `/rn-perf-*` command.

The source skills are also shipped in the npm package for Codex and Claude Code. Gemini commands embed those instructions so they work without additional setup.
