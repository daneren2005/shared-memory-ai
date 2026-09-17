import type {
	BaseComponent,
	ComponentMap,
	EntityWorkerSystemCallbacks,
	EntityWorkerSystemWorld,
	EntityUpdateComponents,
} from '@daneren2005/shared-memory-ecs';

import { AIStatus, createAIUpdate, createBehaviorDispatch } from '../index';
import type { AIBehavior } from '../index';

interface AgentComponent extends BaseComponent {
	block?: Uint32Array
}

interface DispatchComponents extends ComponentMap {
	agent: AgentComponent
}

interface DispatchBlocks extends EntityUpdateComponents<DispatchComponents> {
	agent: Uint32Array
}

const KIND_INDEX = 0;

const callbacks: EntityWorkerSystemCallbacks<DispatchComponents> = {
	entityComponentChanged() {},
	emitEntityEvent() {},
	emitSystemEvent() {},
	entityDied() {},
	createEntity() {},
};

const world: EntityWorkerSystemWorld = { gameTime: 0, elapsedTime: 1, getString: () => '' };

// Two behaviors with distinct memory shapes, so a leaked memory object would surface as a type/shape mismatch.
function countingBehavior(log: Array<string>): AIBehavior<DispatchComponents, DispatchBlocks, EntityWorkerSystemWorld, { count: number }> {
	return {
		createMemory: () => ({ count: 0 }),
		run(context, memory) {
			memory.count++;
			log.push(`count:${context.entityId}:${memory.count}`);
			return AIStatus.running;
		},
	};
}
function labelBehavior(log: Array<string>): AIBehavior<DispatchComponents, DispatchBlocks, EntityWorkerSystemWorld, { label: string }> {
	return {
		createMemory: entityId => ({ label: `L${entityId}` }),
		run(_context, memory) {
			log.push(`label:${memory.label}`);
			return AIStatus.succeeded;
		},
		onEntityRemoved: (entityId, memory) => log.push(`removed:${entityId}:${memory?.label ?? 'none'}`),
	};
}

function run(update: ReturnType<typeof createAIUpdate<DispatchComponents, DispatchBlocks>>['update'], entityId: number, components: DispatchBlocks): void {
	update(world, entityId, components, {}, callbacks);
}

describe('createBehaviorDispatch', () => {
	it('routes each entity to the behavior selected by its key and isolates memory per behavior', () => {
		const log: Array<string> = [];
		const dispatch = createBehaviorDispatch<DispatchComponents, DispatchBlocks>(context => context.components.agent[KIND_INDEX])
			.register(0, countingBehavior(log))
			.register(1, labelBehavior(log));
		const behavior = createAIUpdate({ createMemory: dispatch.createMemory, run: dispatch.run });
		const counter = { agent: new Uint32Array([0]) };
		const labeled = { agent: new Uint32Array([1]) };

		behavior.update.preRun?.(world, [{ entityId: 1, components: counter }, { entityId: 2, components: labeled }], {}, callbacks);
		run(behavior.update, 1, counter);
		run(behavior.update, 1, counter);
		run(behavior.update, 2, labeled);

		expect(log).toEqual(['count:1:1', 'count:1:2', 'label:L2']);
	});

	it('re-allocates memory when an entity switches keys and falls back when a key is unregistered', () => {
		const log: Array<string> = [];
		const dispatch = createBehaviorDispatch<DispatchComponents, DispatchBlocks>(context => context.components.agent[KIND_INDEX])
			.register(0, countingBehavior(log))
			.fallback(labelBehavior(log));
		const behavior = createAIUpdate({ createMemory: dispatch.createMemory, run: dispatch.run, onEntityRemoved: dispatch.onEntityRemoved });
		const components = { agent: new Uint32Array([0]) };

		behavior.update.preRun?.(world, [{ entityId: 5, components }], {}, callbacks);
		run(behavior.update, 5, components); // key 0 -> counter, fresh memory
		run(behavior.update, 5, components); // key 0 -> counter resumes
		components.agent[KIND_INDEX] = 9; // unregistered key -> fallback
		run(behavior.update, 5, components);
		components.agent[KIND_INDEX] = 0; // back to counter -> memory reset to a new count
		run(behavior.update, 5, components);

		expect(log).toEqual(['count:5:1', 'count:5:2', 'label:L5', 'count:5:1']);
	});

	it('fails when a key has no behavior and no fallback', () => {
		const dispatch = createBehaviorDispatch<DispatchComponents, DispatchBlocks>(context => context.components.agent[KIND_INDEX])
			.register(0, countingBehavior([]));
		const statuses: Array<number> = [];
		const behavior = createAIUpdate({
			createMemory: dispatch.createMemory,
			run: dispatch.run,
			onStatus: (_context, _memory, status) => statuses.push(status),
		});
		const components = { agent: new Uint32Array([7]) };

		behavior.update.preRun?.(world, [{ entityId: 1, components }], {}, callbacks);
		run(behavior.update, 1, components);

		expect(statuses).toEqual([AIStatus.failed]);
	});

	it('forwards entity removal to the last selected behavior with its own memory', () => {
		const log: Array<string> = [];
		const dispatch = createBehaviorDispatch<DispatchComponents, DispatchBlocks>(context => context.components.agent[KIND_INDEX])
			.register(1, labelBehavior(log));
		const behavior = createAIUpdate({ createMemory: dispatch.createMemory, run: dispatch.run, onEntityRemoved: dispatch.onEntityRemoved });
		const components = { agent: new Uint32Array([1]) };

		behavior.update.preRun?.(world, [{ entityId: 3, components }], {}, callbacks);
		run(behavior.update, 3, components);
		behavior.update.entityRemoved?.(world, 3, callbacks);
		behavior.update.entityRemoved?.(world, 99, callbacks); // never ran -> no stored memory, forwarded as a no-op

		expect(log).toEqual(['label:L3', 'removed:3:L3']);
	});
});
