# Antigravity Workspace Directives

## Persistent Memory & Context Harness
This workspace uses an Obsidian vault via MCP for session memory and architectural tracking.

1. Always auto-detect the project name from the root directory (`<PROJECT_NAME>`).
2. Read `START.md` (vault root) and `Projects/<PROJECT_NAME>/Index.md` using the Obsidian MCP tools before major steps.
3. Track work using standardized checkpoint identifiers (`CP-P<PHASE>.<STEP>-<SLUG>`).
4. At the end of each implementation phase or task, log summary changes and schema updates to `Projects/<PROJECT_NAME>/Logs/Phase-<X>-Log.md` and check off completed items in `Projects/<PROJECT_NAME>/Index.md`.