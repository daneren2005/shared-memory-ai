import type { ComponentMap, EntityUpdateComponents } from '@daneren2005/shared-memory-ecs';

import type { AIAction, AIStatus as AIStatusValue } from './status';
import { AIStatus } from './status';

export interface BehaviorTreeMemory {
	readonly cursors: Uint32Array
	readonly randomChoices: Int32Array
	readonly loopCounts: Uint32Array
	readonly cooldowns: Float64Array
	readonly activeCooldowns: Uint8Array
}

export function createBehaviorTreeMemory(stateSlotCount: number): BehaviorTreeMemory {
	const randomChoices = new Int32Array(stateSlotCount);
	const cooldowns = new Float64Array(stateSlotCount);
	randomChoices.fill(-1);
	cooldowns.fill(Number.NEGATIVE_INFINITY);
	return {
		cursors: new Uint32Array(stateSlotCount),
		randomChoices,
		loopCounts: new Uint32Array(stateSlotCount),
		cooldowns,
		activeCooldowns: new Uint8Array(stateSlotCount),
	};
}

export function sequence<
	C extends ComponentMap,
	M extends BehaviorTreeMemory,
	T extends EntityUpdateComponents<C>,
>(slot: number, children: ReadonlyArray<AIAction<C, M, T>>): AIAction<C, M, T> {
	return (context, memory): AIStatusValue => {
		for(let childIndex = memory.cursors[slot]; childIndex < children.length; childIndex++) {
			const status = children[childIndex](context, memory);
			if(status === AIStatus.running) {
				memory.cursors[slot] = childIndex;
				return status;
			}
			if(status === AIStatus.failed) {
				memory.cursors[slot] = 0;
				return status;
			}
		}
		memory.cursors[slot] = 0;
		return AIStatus.succeeded;
	};
}

export function selector<
	C extends ComponentMap,
	M extends BehaviorTreeMemory,
	T extends EntityUpdateComponents<C>,
>(slot: number, children: ReadonlyArray<AIAction<C, M, T>>): AIAction<C, M, T> {
	return (context, memory): AIStatusValue => {
		for(let childIndex = memory.cursors[slot]; childIndex < children.length; childIndex++) {
			const status = children[childIndex](context, memory);
			if(status === AIStatus.running) {
				memory.cursors[slot] = childIndex;
				return status;
			}
			if(status === AIStatus.succeeded) {
				memory.cursors[slot] = 0;
				return status;
			}
		}
		memory.cursors[slot] = 0;
		return AIStatus.failed;
	};
}

export function randomSelector<
	C extends ComponentMap,
	M extends BehaviorTreeMemory,
	T extends EntityUpdateComponents<C>,
>(slot: number, children: ReadonlyArray<AIAction<C, M, T>>, random: () => number = Math.random): AIAction<C, M, T> {
	return (context, memory): AIStatusValue => {
		if(children.length === 0) return AIStatus.failed;
		let childIndex = memory.randomChoices[slot];
		if(childIndex < 0 || childIndex >= children.length) {
			childIndex = Math.min(Math.floor(random() * children.length), children.length - 1);
			memory.randomChoices[slot] = childIndex;
		}
		const status = children[childIndex](context, memory);
		if(status !== AIStatus.running) memory.randomChoices[slot] = -1;
		return status;
	};
}

export function invert<
	C extends ComponentMap,
	M,
	T extends EntityUpdateComponents<C>,
>(child: AIAction<C, M, T>): AIAction<C, M, T> {
	return (context, memory): AIStatusValue => {
		const status = child(context, memory);
		if(status === AIStatus.running) return status;
		return status === AIStatus.succeeded ? AIStatus.failed : AIStatus.succeeded;
	};
}

export function alwaysSucceed<
	C extends ComponentMap,
	M,
	T extends EntityUpdateComponents<C>,
>(child: AIAction<C, M, T>): AIAction<C, M, T> {
	return (context, memory): AIStatusValue => {
		const status = child(context, memory);
		return status === AIStatus.running ? status : AIStatus.succeeded;
	};
}

export function alwaysFail<
	C extends ComponentMap,
	M,
	T extends EntityUpdateComponents<C>,
>(child: AIAction<C, M, T>): AIAction<C, M, T> {
	return (context, memory): AIStatusValue => {
		const status = child(context, memory);
		return status === AIStatus.running ? status : AIStatus.failed;
	};
}

export function cooldown<
	C extends ComponentMap,
	M extends BehaviorTreeMemory,
	T extends EntityUpdateComponents<C>,
>(slot: number, duration: number, child: AIAction<C, M, T>): AIAction<C, M, T> {
	if(duration < 0) throw new RangeError('Behavior-tree cooldown duration cannot be negative');
	return (context, memory): AIStatusValue => {
		if(memory.activeCooldowns[slot] === 0) {
			if(context.gameTime < memory.cooldowns[slot]) return AIStatus.failed;
			memory.activeCooldowns[slot] = 1;
			memory.cooldowns[slot] = context.gameTime + duration;
		}
		const status = child(context, memory);
		if(status !== AIStatus.running) memory.activeCooldowns[slot] = 0;
		return status;
	};
}

export function loop<
	C extends ComponentMap,
	M extends BehaviorTreeMemory,
	T extends EntityUpdateComponents<C>,
>(slot: number, child: AIAction<C, M, T>, count = Number.POSITIVE_INFINITY): AIAction<C, M, T> {
	if(count <= 0 || (!Number.isInteger(count) && Number.isFinite(count))) {
		throw new RangeError('Behavior-tree loop count must be a positive integer or Infinity');
	}
	return (context, memory): AIStatusValue => {
		while(memory.loopCounts[slot] < count) {
			const status = child(context, memory);
			if(status === AIStatus.running) return status;
			if(status === AIStatus.failed) {
				memory.loopCounts[slot] = 0;
				return status;
			}
			memory.loopCounts[slot]++;
			if(!Number.isFinite(count)) return AIStatus.running;
		}
		memory.loopCounts[slot] = 0;
		return AIStatus.succeeded;
	};
}
