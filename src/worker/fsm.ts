import type { ComponentMap, EntityUpdateComponents, EntityWorkerSystemWorld } from '@daneren2005/shared-memory-ecs';

import type { AIContext } from './context';
import type { AIAction, AICriterion, AIStatus } from './status';

export interface FSMTransition<
	C extends ComponentMap,
	M,
	T extends EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld,
> {
	readonly from: number
	readonly to: number
	readonly when: AICriterion<C, M, T, W>
	onTransition?(context: AIContext<C, T, W>, memory: M): void
}

export interface FSMConfig<
	C extends ComponentMap,
	M,
	T extends EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld,
> {
	readonly getState: (context: AIContext<C, T, W>, memory: M) => number
	readonly setState: (context: AIContext<C, T, W>, memory: M, state: number) => void
	readonly states: ReadonlyMap<number, AIAction<C, M, T, W>>
	readonly transitions: ReadonlyArray<FSMTransition<C, M, T, W>>
	readonly maxTransitionsPerTick?: number
}

export function createFSM<
	C extends ComponentMap,
	M,
	T extends EntityUpdateComponents<C>,
	W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld,
>(
	config: FSMConfig<C, M, T, W>,
): AIAction<C, M, T, W> {
	return (context, memory): AIStatus => {
		let state = config.getState(context, memory);
		const maxTransitions = config.maxTransitionsPerTick ?? 8;

		for(let transitionCount = 0; transitionCount < maxTransitions; transitionCount++) {
			const transition = config.transitions.find(candidate => candidate.from === state && candidate.when(context, memory));
			if(!transition) break;
			transition.onTransition?.(context, memory);
			state = transition.to;
			config.setState(context, memory, state);
		}

		return config.states.get(state)?.(context, memory) ?? 2;
	};
}
