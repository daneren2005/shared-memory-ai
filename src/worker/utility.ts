import type { ComponentMap, EntityUpdateComponents } from '@daneren2005/shared-memory-ecs';

import type { AIAction, AIStatus as AIStatusValue, AIUtility } from './status';
import { AIStatus } from './status';

export interface UtilityMemory {
	selectedOption: number
	committedUntil: number
}

export interface UtilityOption<C extends ComponentMap, M extends UtilityMemory, T extends EntityUpdateComponents<C>> {
	readonly score: AIUtility<C, M, T>
	readonly action: AIAction<C, M, T>
	readonly minimum?: number
	readonly maximum?: number
}

export interface UtilitySelectorConfig {
	readonly minimumScore?: number
	readonly commitmentDuration?: number
	readonly hysteresis?: number
}

export function normalizeUtility(score: number, minimum = 0, maximum = 1): number {
	if(!Number.isFinite(score)) return 0;
	if(maximum <= minimum) return score >= maximum ? 1 : 0;
	return Math.max(0, Math.min(1, (score - minimum) / (maximum - minimum)));
}

export function createUtilitySelector<
	C extends ComponentMap,
	M extends UtilityMemory,
	T extends EntityUpdateComponents<C>,
>(options: ReadonlyArray<UtilityOption<C, M, T>>, config: UtilitySelectorConfig = {}): AIAction<C, M, T> {
	return (context, memory): AIStatusValue => {
		if(memory.selectedOption >= 0 && context.gameTime < memory.committedUntil) {
			return runSelected(options, context, memory);
		}

		const minimumScore = config.minimumScore ?? 0;
		let selectedOption = -1;
		let selectedScore = minimumScore;
		for(let index = 0; index < options.length; index++) {
			const option = options[index];
			let score = normalizeUtility(option.score(context, memory), option.minimum, option.maximum);
			if(index === memory.selectedOption) score += config.hysteresis ?? 0;
			if(score >= selectedScore) {
				selectedScore = score;
				selectedOption = index;
			}
		}

		if(selectedOption < 0) {
			memory.selectedOption = -1;
			return AIStatus.failed;
		}
		if(selectedOption !== memory.selectedOption) {
			memory.selectedOption = selectedOption;
			memory.committedUntil = context.gameTime + (config.commitmentDuration ?? 0);
		}
		return runSelected(options, context, memory);
	};
}

function runSelected<
	C extends ComponentMap,
	M extends UtilityMemory,
	T extends EntityUpdateComponents<C>,
>(options: ReadonlyArray<UtilityOption<C, M, T>>, context: Parameters<AIAction<C, M, T>>[0], memory: M): AIStatusValue {
	const option = options[memory.selectedOption];
	if(!option) return AIStatus.failed;
	const status = option.action(context, memory);
	if(status !== AIStatus.running) {
		memory.selectedOption = -1;
		memory.committedUntil = 0;
	}
	return status;
}
