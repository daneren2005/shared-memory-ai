# shared-memory-ai

AI components and systems built on [`@daneren2005/shared-memory-ecs`](https://github.com/daneren2005/shared-memory-ecs).

The package is bootstrapped with an empty `aiRegistry`; AI implementations will be added as the public API takes shape.

## Development

```sh
npm install
npm run type-check
npm run lint
npm test
npm run build
```

Run the examples playground at `http://127.0.0.1:8080`:

```sh
npm start
```

The initial example initializes and advances an empty ECS world. New AI examples can be added under `examples/src/examples`.

To copy a local build into a sibling game repository:

```sh
npm run build:game -- <game-repo-name>
```
