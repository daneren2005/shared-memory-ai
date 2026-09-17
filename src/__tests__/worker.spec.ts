import type {
	BaseComponent,
	ComponentMap,
	EntityWorkerSystemCallbacks,
	EntityWorkerSystemWorld,
	EntityQueryComponents,
	EntityUpdateComponents,
	UpdateEntityConfigObject,
} from '@daneren2005/shared-memory-ecs';

import { AIStatus, createAIUpdate, createEntityMemoryStore, EntityQueryIndex } from '../index';

interface AgentComponent extends BaseComponent {
	block?: Uint32Array
}

interface TargetComponent extends BaseComponent {
	block?: Float32Array
}

interface TestComponents extends ComponentMap {
	agent: AgentComponent
	target: TargetComponent
}

interface TestBlocks extends EntityUpdateComponents<TestComponents> {
	agent: Uint32Array
}

const world: EntityWorkerSystemWorld = {
	gameTime: 100,
	elapsedTime: 16,
	getString: () => '',
};

function createCallbacks(entityEvents: Array<[number, string]> = []): EntityWorkerSystemCallbacks<TestComponents> {
	return {
		addComponent() {},
		removeComponent() {},
		entityComponentChanged() {},
		emitEntityEvent(entityId, event) {
			entityEvents.push([entityId, event]);
		},
		emitSystemEvent() {},
		entityDied() {},
		createEntity() {},
	};
}

describe('worker-native behavior primitives', () => {
	it('uses stable lifecycle status values', () => {
		expect(AIStatus).toEqual({ running: 0, succeeded: 1, failed: 2 });
	});

	it('indexes query entities by ID and invalidates removed targets', () => {
		const index = new EntityQueryIndex<TestComponents>();
		const target = {
			entityId: 7,
			components: { target: new Float32Array([4, 8]) },
		};

		index.prepare({ targets: [target] });
		expect(index.get('targets').entities).toEqual([target]);
		expect(index.get('targets').byId.get(7)).toBe(target);

		index.prepare({ targets: [] });
		expect(index.get('targets').entities).toEqual([]);
		expect(index.get('targets').byId.has(7)).toBe(false);
	});

	it('creates, removes, and resets per-entity memory', () => {
		const store = createEntityMemoryStore(entityId => ({ entityId, ticks: 0 }));

		const memory = store.get(3);
		memory.ticks++;
		expect(store.get(3)).toBe(memory);
		expect(store.size).toBe(1);

		expect(store.remove(3)).toBe(true);
		expect(store.getIfPresent(3)).toBeUndefined();
		store.get(4);
		store.reset();
		expect(store.size).toBe(0);
	});

	it('prepares one reusable context and reports each action status', () => {
		const statuses: Array<[number, number]> = [];
		const entityEvents: Array<[number, string]> = [];
		const callbacks = createCallbacks(entityEvents);
		const behavior = createAIUpdate<TestComponents, TestBlocks, EntityWorkerSystemWorld, { ticks: number }>({
			createMemory: () => ({ ticks: 0 }),
			run(context, memory) {
				expect(context.agents.byId.has(context.entityId)).toBe(true);
				expect(context.queries.get('targets').byId.has(9)).toBe(true);
				expect(context.gameTime).toBe(100);
				expect(context.elapsedTime).toBe(16);
				memory.ticks++;
				context.events.emitEntity('tick');
				return memory.ticks === 1 ? AIStatus.running : AIStatus.succeeded;
			},
			onStatus(context, _memory, status) {
				context.components.agent[0] = status;
				statuses.push([context.entityId, status]);
			},
		});
		const agents: Array<UpdateEntityConfigObject<TestBlocks>> = [
			{ entityId: 1, components: { agent: new Uint32Array(1) } },
			{ entityId: 2, components: { agent: new Uint32Array(1) } },
		];
		const queries: EntityQueryComponents<TestComponents> = {
			targets: [{ entityId: 9, components: { target: new Float32Array(2) } }],
		};

		behavior.update.preRun?.(world, agents, queries, callbacks);
		for(const agent of agents) {
			behavior.update(world, agent.entityId, agent.components, queries, callbacks);
		}
		behavior.update(world, agents[0].entityId, agents[0].components, queries, callbacks);

		expect(statuses).toEqual([
			[1, AIStatus.running],
			[2, AIStatus.running],
			[1, AIStatus.succeeded],
		]);
		expect(entityEvents).toEqual([[1, 'tick'], [2, 'tick'], [1, 'tick']]);
		expect(agents[0].components.agent[0]).toBe(AIStatus.succeeded);
	});

	it('cleans memory on entity removal and world reload without creating phantom entries', () => {
		const removed: Array<[number, number | undefined]> = [];
		const callbacks = createCallbacks();
		const behavior = createAIUpdate<TestComponents, TestBlocks, EntityWorkerSystemWorld, { ticks: number }>({
			createMemory: () => ({ ticks: 0 }),
			run(_context, memory) {
				memory.ticks++;
				return AIStatus.running;
			},
			onEntityRemoved: (entityId, memory) => removed.push([entityId, memory?.ticks]),
		});
		const components = { agent: new Uint32Array(1) };
		const queries: EntityQueryComponents<TestComponents> = {};

		behavior.update.preRun?.(world, [{ entityId: 1, components }], queries, callbacks);
		behavior.update(world, 1, components, queries, callbacks);
		behavior.update.entityRemoved?.(world, 1, callbacks);
		behavior.update.entityRemoved?.(world, 99, callbacks);

		expect(removed).toEqual([[1, 1], [99, undefined]]);
		expect(behavior.memory.size).toBe(0);

		behavior.update.preRun?.(world, [{ entityId: 2, components }], queries, callbacks);
		behavior.update(world, 2, components, queries, callbacks);
		expect(behavior.memory.size).toBe(1);
		behavior.update.init?.(undefined);
		expect(behavior.memory.size).toBe(0);
	});

	it('reuses one context while updating thousands of agents without events or per-agent messages', () => {
		const contexts = new Set<unknown>();
		let emittedEvents = 0;
		const callbacks = createCallbacks();
		callbacks.emitEntityEvent = () => {
			emittedEvents++;
		};
		const behavior = createAIUpdate<TestComponents, TestBlocks, EntityWorkerSystemWorld, { ticks: number }>({
			createMemory: () => ({ ticks: 0 }),
			run(context, memory) {
				contexts.add(context);
				memory.ticks++;
				return AIStatus.running;
			},
		});
		const agents = Array.from({ length: 5_000 }, (_, index) => ({
			entityId: index + 1,
			components: { agent: new Uint32Array(1) },
		}));

		behavior.update.preRun?.(world, agents, {}, callbacks);
		for(const agent of agents) behavior.update(world, agent.entityId, agent.components, {}, callbacks);

		expect(contexts.size).toBe(1);
		expect(behavior.memory.size).toBe(5_000);
		expect(emittedEvents).toBe(0);
	});
});
