# Architecture Map

## What this is

An abstract AI runtime built on `@daneren2005/shared-memory-ecs`. The published package contains only lifecycle, context, memory/indexing, FSM, behavior-tree, and utility primitives. Concrete patrol, movement, trading, cargo, and attack implementations are test fixtures consumed by the examples app and are excluded from the library build.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Main package entry, `aiRegistry`, and worker API re-exports. |
| `src/worker.ts` | Worker-only package entry exposed as `@daneren2005/shared-memory-ai/worker`. |
| `src/worker/status.ts` | Shared action status protocol and action, criterion, and utility function types. |
| `src/worker/context.ts` | Restricted worker-safe behavior context and presentation event port. |
| `src/worker/query-index.ts` | Per-run entity and named-query arrays plus entity-ID lookup maps. |
| `src/worker/memory.ts` | Explicit worker-local memory keyed by entity ID. |
| `src/worker/create-ai-update.ts` | Adapts a code-defined behavior to ECS `init`, `preRun`, update, and removal hooks. |
| `src/worker/create-behavior-dispatch.ts` | Routes entities to one of several `AIBehavior`s by a numeric key, each with isolated per-entity memory. |
| `src/worker/fsm.ts` | Numeric finite-state-machine transitions over shared `AIAction` functions. |
| `src/worker/behavior-tree.ts` | Resumable sequence, selector, and random composites plus loop, cooldown, and result decorators with typed-array state slots. |
| `src/worker/utility.ts` | Normalized utility selection with thresholds, hysteresis, and commitment. |
| `src/__tests__/examples/` | Concrete patrol, movement, trader, shared-cargo, attack, and standard behavior-tree node fixtures with colocated specifications. Excluded from `dist`. |
| `examples/src/world.ts` | Example ECS registry, types, and world factory. |
| `examples/src/patrol-components.ts` | Game-owned shared component definitions used by the examples. |
| `examples/src/patrol-systems.ts` | Patrol and movement `EntityWorkerSystem` wiring over test fixtures. |
| `examples/src/domain-systems.ts` | Trader and attack `EntityWorkerSystem` wiring over test fixtures. |
| `examples/src/example.ts` | Example, runtime, and host contracts plus viewport dimensions. |
| `examples/src/controls.ts` | Declarative slider, toggle, and button controls. |
| `examples/src/renderer.ts` | Canvas renderer for patrol/chase, trader, and attack state. |
| `examples/src/workers/` | Static worker entries that import concrete fixtures and the abstract worker runtime. |
| `examples/src/examples/` | Runnable patrol/chase, trader, and attack definitions. |
| `examples/src/main.ts` | Owns hash navigation, world replacement, worker selection, live stats, and the render loop. |
| `examples/public/coi-serviceworker.min.js` | Adds COOP/COEP response headers on GitHub Pages so deployed examples can use `SharedArrayBuffer`. |
| `.github/workflows/pages.yml` | Builds the examples with the repository base path and deploys `examples/dist` to GitHub Pages. |

## Worker data flow

| Producer | Published state | Consumer | Rule |
| --- | --- | --- | --- |
| AI worker | desired X/Y, enabled flag, destination sequence | movement worker | Coordinates are written before the atomic destination sequence. |
| Movement worker | transform X/Y, arrived sequence | AI worker | Movement never clears or rewrites the desired destination. |
| AI worker | controller state, target IDs, timers, action phases | renderer/main thread | Main thread reads only while the AI system is active. |
| AI worker transaction owner | trader/station credits, stock, cargo maps | UI/presentation | No other thread may mutate participating fields; map-level locks do not make a multi-map transaction atomic. |
| AI worker | entity/system event opcodes | main-thread listeners | Events are presentation consequences and do not define AI correctness. |

## Commands

- `npm run type-check` — type-check the library, tests, configs, and examples.
- `npm run lint` — lint with the production oxlint configuration.
- `npm test` — run Vitest.
- `npm run build` — bundle the library and emit declarations.
- `npm start` — serve the examples app.
- `npm run build:examples` — create the production examples bundle.
- `npm run build:game -- <game-repo-name>` — build and copy `dist` into a sibling game's installed package.

## Conventions

- The package depends on the ECS as a peer so games use one shared ECS instance.
- Game-specific components should be composed by spreading `aiRegistry` into the game's registry.
- Worker entries import behavior primitives from `@daneren2005/shared-memory-ai/worker`; main-thread systems may use the package root.
- The public exports are intentionally allowlisted by `src/__tests__/index.spec.ts`; game-domain helpers must remain in consumer code or test/example fixtures.
- Worker behavior functions are statically imported code. Runtime component data may select behavior IDs, but functions are never sent across the worker boundary.
- `createAIUpdate` rebuilds query ID maps in `preRun`, clears local memory in `init`, and removes an entity's memory in `entityRemoved`.
- `createBehaviorDispatch` selects a behavior by a runtime numeric key (an AI-type id for a planner, a command type for an executor) and holds each behavior's memory in isolation, re-allocating only when an entity's key changes. It is an `AIBehavior`, so it composes into `createAIUpdate` like any other. Behavior functions remain statically imported code; only the selecting key crosses as data.
- `AIAction`, `AICriterion`, and `AIUtility` receive the behavior's typed per-entity memory. `createFSM` also passes it to state accessors and transition predicates, so FSM state can remain worker-local when no other system needs it.
- Stateful behavior-tree nodes use explicit numeric slots in per-entity typed-array memory. Random choices persist while their task is running, and cooldown durations use `world.gameTime` units.
- An `AIContext` is reused across the agents in one run and must not be retained by actions. Persistent action state belongs in an AI-owned component or the provided entity memory store.
- The AI worker may directly write only AI-owned component fields and exclusively owned heap structures. `WorkerEventPort` is limited to entity and system events intended for presentation consequences.
- Example transactions validate every precondition before applying their complete mutation set. They demonstrate an ownership pattern; they are not package API.
- Vitest and the examples app alias both the main and worker package entries to source files, so consumer-style imports do not depend on a prebuilt `dist` directory.
- Example worlds are replaceable runtimes. Selection or restart destroys the previous world and workers before initializing the replacement.
- Rendering is read-only over shared blocks. Pointer input moves only the main-thread-owned player transform; it never writes the AI-owned agent transform or destination fields.
