import type {
	ComponentMap,
	ComponentSystemWorld,
	EntityUpdateComponents,
	EntityUpdateFunction,
} from '@daneren2005/shared-memory-ecs';

import { createMutableAIContext } from './context';
import type { AIContext } from './context';
import { createEntityMemoryStore } from './memory';
import type { EntityMemoryStore } from './memory';
import { EntityBlockIndex, EntityQueryIndex } from './query-index';
import type { AIStatus } from './status';

export interface AIUpdateOptions<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C>,
	W extends ComponentSystemWorld,
	M,
	D,
> {
	createMemory(entityId: number): M
	run(context: AIContext<C, T, W>, memory: M): AIStatus
	onStatus?(context: AIContext<C, T, W>, memory: M, status: AIStatus): void
	init?(data: D | undefined): Partial<W> | void
	onEntityRemoved?(entityId: number, memory: M | undefined): void
}

export interface AIUpdate<C extends ComponentMap, T extends EntityUpdateComponents<C>, W extends ComponentSystemWorld, D, M> {
	readonly update: EntityUpdateFunction<C, T, W, D>
	readonly memory: EntityMemoryStore<M>
	readonly queries: EntityQueryIndex<C>
}

export function createAIUpdate<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C>,
	W extends ComponentSystemWorld = ComponentSystemWorld,
	M = Record<string, never>,
	D = unknown,
>(options: AIUpdateOptions<C, T, W, M, D>): AIUpdate<C, T, W, D, M> {
	const memory = createEntityMemoryStore(options.createMemory);
	const queries = new EntityQueryIndex<C>();
	const agents = new EntityBlockIndex<T>();
	let context: ReturnType<typeof createMutableAIContext<C, T, W>> | undefined;

	const update: EntityUpdateFunction<C, T, W, D> = (world, entityId, components, _queries, callbacks) => {
		if(!context) {
			context = createMutableAIContext(queries, agents.collection, callbacks);
		}
		context.world = world;
		context.entityId = entityId;
		context.components = components;
		const entityMemory = memory.get(entityId);
		const status = options.run(context, entityMemory);
		options.onStatus?.(context, entityMemory, status);
	};

	update.preRun = (_world, entities, queryComponents) => {
		agents.prepare(entities);
		queries.prepare(queryComponents);
		context = undefined;
	};

	update.entityRemoved = (_world, entityId) => {
		const entityMemory = memory.getIfPresent(entityId);
		options.onEntityRemoved?.(entityId, entityMemory);
		memory.remove(entityId);
	};

	update.init = data => {
		memory.reset();
		agents.clear();
		queries.clear();
		context = undefined;
		return options.init?.(data);
	};

	return { update, memory, queries };
}
