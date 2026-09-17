import type { ComponentMap, EntityUpdateComponents, EntityWorkerSystemWorld } from '@daneren2005/shared-memory-ecs';

import type { AIContext } from './context';
import { AIStatus } from './status';
import type { AIStatus as AIStatusValue } from './status';

// A self-contained unit of behavior: a state machine plus the per-entity memory it owns. This is exactly the
// subset of `createAIUpdate` options a behavior needs, so an `AIBehavior` can be handed to `createAIUpdate`
// directly or registered in a dispatch.
export interface AIBehavior<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C> = EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld,
	M = unknown,
> {
	createMemory(entityId: number): M
	run(context: AIContext<C, T, W>, memory: M): AIStatusValue
	onEntityRemoved?(entityId: number, memory: M | undefined): void
}

// The dispatch's own per-entity memory: the last selected key and the chosen behavior's memory. `inner` is
// erased to `unknown` because behaviors registered under different keys have different memory shapes; the
// dispatch guarantees it only ever pairs a behavior with the memory that behavior created (see `seal`).
export interface DispatchMemory {
	key: number
	inner: unknown
}

export interface BehaviorDispatch<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C> = EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld,
> extends AIBehavior<C, T, W, DispatchMemory> {
	register<M>(key: number, behavior: AIBehavior<C, T, W, M>): BehaviorDispatch<C, T, W>
	fallback<M>(behavior: AIBehavior<C, T, W, M>): BehaviorDispatch<C, T, W>
}

interface SealedBehavior<C extends ComponentMap, T extends EntityUpdateComponents<C>, W extends EntityWorkerSystemWorld> {
	createMemory(entityId: number): unknown
	run(context: AIContext<C, T, W>, memory: unknown): AIStatusValue
	onEntityRemoved?(entityId: number, memory: unknown): void
}

// `memory as M` is sound by construction: `inner` is only ever the value produced by this same behavior's
// createMemory (paired by key), so the cast restores the exact type that was erased on storage.
function sealBehavior<C extends ComponentMap, T extends EntityUpdateComponents<C>, W extends EntityWorkerSystemWorld, M>(
	behavior: AIBehavior<C, T, W, M>,
): SealedBehavior<C, T, W> {
	const onEntityRemoved = behavior.onEntityRemoved;
	return {
		createMemory: behavior.createMemory,
		run: (context, memory) => behavior.run(context, memory as M),
		onEntityRemoved: onEntityRemoved ? (entityId, memory) => onEntityRemoved(entityId, memory as M) : undefined,
	};
}

// Route each entity to one of several behaviors by a numeric key read from the entity (an AI-type pointer for a
// planner, a command type for an executor). Each behavior keeps its own isolated memory; the dispatch allocates
// it lazily the first time an entity resolves to that behavior and re-allocates only when the key changes.
export function createBehaviorDispatch<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C> = EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld,
>(select: (context: AIContext<C, T, W>) => number): BehaviorDispatch<C, T, W> {
	const behaviors = new Map<number, SealedBehavior<C, T, W>>();
	let fallbackBehavior: SealedBehavior<C, T, W> | undefined;

	const dispatch: BehaviorDispatch<C, T, W> = {
		createMemory: () => ({ key: Number.NaN, inner: undefined }),
		run(context, memory) {
			const key = select(context);
			const chosen = behaviors.get(key) ?? fallbackBehavior;
			if(memory.key !== key) {
				memory.key = key;
				memory.inner = chosen ? chosen.createMemory(context.entityId) : undefined;
			}
			return chosen ? chosen.run(context, memory.inner) : AIStatus.failed;
		},
		onEntityRemoved(entityId, memory) {
			if(!memory) return;
			const chosen = behaviors.get(memory.key) ?? fallbackBehavior;
			chosen?.onEntityRemoved?.(entityId, memory.inner);
		},
		register(key, behavior) {
			behaviors.set(key, sealBehavior(behavior));
			return dispatch;
		},
		fallback(behavior) {
			fallbackBehavior = sealBehavior(behavior);
			return dispatch;
		},
	};

	return dispatch;
}
