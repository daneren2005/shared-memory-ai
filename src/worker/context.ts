import type {
	ComponentMap,
	EntityWorkerSystemCallbacks,
	EntityWorkerSystemWorld,
	EntityUpdateComponents,
} from '@daneren2005/shared-memory-ecs';

import type { EntityQueryIndex, IndexedEntityCollection } from './query-index';

export interface WorkerEventPort {
	emitEntity(event: string, ...args: Array<unknown>): void
	emitSystem(event: string): void
}

export interface AIContext<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C> = EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld,
> {
	readonly entityId: number
	readonly components: T
	readonly queries: EntityQueryIndex<C>
	readonly agents: IndexedEntityCollection<T>
	readonly world: W
	readonly gameTime: number
	readonly elapsedTime: number
	readonly events: WorkerEventPort
}

export interface MutableAIContext<C extends ComponentMap, T extends EntityUpdateComponents<C>, W extends EntityWorkerSystemWorld> extends AIContext<C, T, W> {
	entityId: number
	components: T
	world: W
}

export function createMutableAIContext<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld,
>(queries: EntityQueryIndex<C>, agents: IndexedEntityCollection<T>, callbacks: EntityWorkerSystemCallbacks<C>): MutableAIContext<C, T, W> {
	let context: MutableAIContext<C, T, W>;
	const events: WorkerEventPort = {
		emitEntity: (event, ...args) => callbacks.emitEntityEvent(context.entityId, event, ...args),
		emitSystem: event => callbacks.emitSystemEvent(event, context.entityId),
	};

	context = {
		entityId: 0,
		components: {} as T,
		queries,
		agents,
		world: {} as W,
		get gameTime() {
			return context.world.gameTime;
		},
		get elapsedTime() {
			return context.world.elapsedTime;
		},
		events,
	};

	return context;
}
