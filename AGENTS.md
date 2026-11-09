# AGENTS.md


## Optimization Utilities

The following utilities are available in this environment. Agents should consider them core tools and utilize them when possible to optimize context, memory, and token usage.

- **RTK**  
  Token-compression CLI proxy (60-90% savings). Configured locally in this project workspace (no global flag).

- **ICM**  
  Local cross-session memory (SQLite). **Cursor:** MCP (`~/.cursor/mcp.json`) + rule (`~/.cursor/rules/icm.mdc`) — use `icm_memory_recall` / `icm_memory_store` or `icm recall` / `icm store`.
- **Graphify**  
  Local knowledge graph over code/docs/media ([Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)). Build once with `graphify .` → `graphify-out/graph.json`. **Cursor:** MCP (`~/.cursor/mcp.json` → `python -m graphify.serve …`) + rule (`~/.cursor/rules/graphify.mdc`) — prefer `query_graph` / `get_neighbors` / `shortest_path`; CLI fallback: `graphify query` / `graphify path`.

---

## Antigravity CLI & Workspace Guidelines

- **Workspace Rules (`AGENTS.md`)**: The agent automatically consults rules defined in the workspace root on startup.
- **Context Control**: Proactively use `@` to import specific file paths in prompts to minimize token overhead.
- **Execution Flow**: Follow the autonomous loop: **Exploration** (codebase research) → **Planning** (draft plan) → **Execution** (make changes).
- **Terminal Sandbox**: Shell commands run in a secure terminal sandbox. Safety boundaries can be tuned in `~/.gemini/antigravity-cli/settings.json`.
