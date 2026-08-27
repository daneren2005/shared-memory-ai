# Architecture Map

## What this is

An AI package built on `@daneren2005/shared-memory-ecs`. The package currently exposes an empty registry and an examples shell; AI components and systems will be added without coupling them to a renderer or game.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Public package entry and `aiRegistry`. |
| `examples/src/world.ts` | Example ECS registry, types, and world factory. |
| `examples/src/examples/` | Individual example definitions; currently the empty world. |
| `examples/src/main.ts` | Initializes the selected example and advances its world each animation frame. |

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
- Examples import the package by its public name through a Vite alias to `src/index.ts`.
