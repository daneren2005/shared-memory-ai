import type { ComponentMap, EntityUpdateComponents } from '@daneren2005/shared-memory-ecs';

import type { AIContext } from './context';
import type { AIAction, AICriterion, AIStatus } from './status';

export interface FSMTransition<C extends ComponentMap, M, T extends EntityUpdateComponents<C>> {
	readonly from: number
	readonly to: number
	readonly when: AICriterion<C, T>
	onTransition?(context: AIContext<C, T>, memory: M): void
}

export interface FSMConfig<C extends ComponentMap, M, T extends EntityUpdateComponents<C>> {
	readonly getState: (context: AIContext<C, T>) => number
	readonly setState: (context: AIContext<C, T>, state: number) => void
	readonly states: ReadonlyMap<number, AIAction<C, M, T>>
	readonly transitions: ReadonlyArray<FSMTransition<C, M, T>>
	readonly maxTransitionsPerTick?: number
}

export function createFSM<C extends ComponentMap, M, T extends EntityUpdateComponents<C>>(
	config: FSMConfig<C, M, T>,
): AIAction<C, M, T> {
	return (context, memory): AIStatus => {
		let state = config.getState(context);
		const maxTransitions = config.maxTransitionsPerTick ?? 8;

		for(let transitionCount = 0; transitionCount < maxTransitions; transitionCount++) {
			const transition = config.transitions.find(candidate => candidate.from === state && candidate.when(context));
			if(!transition) break;
			transition.onTransition?.(context, memory);
			state = transition.to;
			config.setState(context, state);
		}

		return config.states.get(state)?.(context, memory) ?? 2;
	};
}
