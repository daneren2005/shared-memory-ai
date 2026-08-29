# shared-memory-ai

AI components and systems built on [`@daneren2005/shared-memory-ecs`](https://github.com/daneren2005/shared-memory-ecs).

The published package contains only abstract worker-native FSM, behavior-tree, utility, context, indexing, and lifecycle primitives. Game-specific movement, trading, patrol/chase, cargo, and attack code lives in test/example fixtures and is not shipped in `dist`. `aiRegistry` remains empty until genuinely reusable AI component definitions emerge.

## Worker-native behaviors

`createAIUpdate` turns a code-defined behavior into an ECS `EntityUpdateFunction`. It prepares entity-ID indexes once per run, gives each entity explicit persistent memory, forwards the behavior's lifecycle status, and automatically clears worker-local state when an entity leaves or the world reloads.

```ts
import { AIStatus, createAIUpdate } from '@daneren2005/shared-memory-ai';

const behavior = createAIUpdate({
	createMemory: () => ({ ticks: 0 }),
	run(context, memory) {
		memory.ticks++;
		context.events.emitEntity('ai-tick');
		return AIStatus.running;
	},
});

// Pass behavior.update to the ECS ComponentSystem and its worker entry.
```

Actions can inspect `context.agents` and `context.queries.get(name)` as both iterable arrays and entity-ID maps. The context is reused during a run, so actions must keep resumable state in shared components or their per-entity memory rather than retaining the context.

Worker entries should import from the worker-only subpath:

```ts
import { createComponentWorker } from '@daneren2005/shared-memory-ecs/worker';
import { createAIUpdate, AIStatus } from '@daneren2005/shared-memory-ai/worker';

const behavior = createAIUpdate({
	createMemory: () => ({}),
	run: context => {
		// Game-owned behavior over game-owned component blocks.
		return context.entityId > 0 ? AIStatus.running : AIStatus.failed;
	},
});
createComponentWorker(self, behavior.update);
```

The worker API includes:

- AI lifecycle statuses and action, criterion, and utility function types.
- Indexed per-run contexts and automatically cleaned per-entity memory.
- Numeric FSM transitions.
- Resumable behavior-tree sequences, selectors, and random selectors.
- Behavior-tree invert, always-succeed, always-fail, cooldown, and loop decorators.
- Normalized utility selectors with thresholds, hysteresis, and commitment.

Behavior-tree tasks are regular `AIAction` functions. Stateful nodes receive a slot in the typed-array memory returned by `createBehaviorTreeMemory`; a slot may be reused only by nodes that cannot be active at the same time. Durations use the same units as `world.gameTime`.

```ts
import {
	AIStatus,
	alwaysFail,
	alwaysSucceed,
	cooldown,
	createBehaviorTreeMemory,
	invert,
	loop,
	randomSelector,
	selector,
	sequence,
} from '@daneren2005/shared-memory-ai/worker';

const succeed = () => AIStatus.succeeded;
const fail = () => AIStatus.failed;
const tree = sequence(0, [
	selector(1, [alwaysFail(succeed), invert(fail)]),
	alwaysSucceed(fail),
	randomSelector(2, [succeed, fail]),
	cooldown(3, 1_000, loop(4, succeed, 3)),
]);
const createMemory = () => createBehaviorTreeMemory(5);
```

See `src/__tests__/examples/behavior-tree-nodes.ts` for an executable tree that exercises every supported node type, including resuming the same randomly selected task and rejecting a branch during cooldown.

Concrete cases are kept under `src/__tests__/examples/`. Their colocated tests verify real patrol/chase, movement ownership, trader transactions, heap-backed cargo, and phased attacks without adding those game decisions to the package API.

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

The playground contains selectable patrol/chase, trader, and attack examples. Each imports its concrete behavior from `src/__tests__/examples/` and the generic runtime from the public worker entry, demonstrating how a game owns its component layouts, actions, and transaction rules. Additional executable fixtures in that directory cover the complete behavior-tree node set.

To copy a local build into a sibling game repository:

```sh
npm run build:game -- <game-repo-name>
```
