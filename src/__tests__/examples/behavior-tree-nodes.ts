import type {
	BaseComponent,
	ComponentMap,
	EntityWorkerSystemWorld,
	EntityUpdateComponents,
} from '@daneren2005/shared-memory-ecs';
import {
	AIStatus,
	alwaysFail,
	alwaysSucceed,
	cooldown,
	createAIUpdate,
	createBehaviorTreeMemory,
	invert,
	loop,
	randomSelector,
	selector,
	sequence,
} from '@daneren2005/shared-memory-ai/worker';
import type {
	AIAction,
	AIStatus as AIStatusValue,
	BehaviorTreeMemory,
} from '@daneren2005/shared-memory-ai/worker';

interface StatusComponent extends BaseComponent {
	block?: Uint32Array
}

export interface BehaviorTreeExampleComponents extends ComponentMap {
	status: StatusComponent
}

export interface BehaviorTreeExampleBlocks extends EntityUpdateComponents<BehaviorTreeExampleComponents> {
	status: Uint32Array
}

export interface BehaviorTreeExampleMemory extends BehaviorTreeMemory {
	trace: Array<string>
	randomTicks: number
}

type ExampleAction = AIAction<BehaviorTreeExampleComponents, BehaviorTreeExampleMemory, BehaviorTreeExampleBlocks>;

function task(name: string, status: AIStatusValue): ExampleAction {
	return (_context, memory) => {
		memory.trace.push(name);
		return status;
	};
}

const randomTask: ExampleAction = (_context, memory) => {
	memory.trace.push('random');
	memory.randomTicks++;
	return memory.randomTicks % 2 === 1 ? AIStatus.running : AIStatus.succeeded;
};

export function createStandardBehaviorTreeExample<W extends EntityWorkerSystemWorld = EntityWorkerSystemWorld>() {
	const root = sequence<BehaviorTreeExampleComponents, BehaviorTreeExampleMemory, BehaviorTreeExampleBlocks>(0, [
		selector(1, [
			alwaysFail(task('forced-failure', AIStatus.succeeded)),
			invert(task('inverted-failure', AIStatus.failed)),
		]),
		alwaysSucceed(task('forced-success', AIStatus.failed)),
		randomSelector(2, [randomTask, task('unchosen-random', AIStatus.succeeded)], () => 0),
		cooldown(3, 10, loop(4, task('loop', AIStatus.succeeded), 2)),
	]);

	return createAIUpdate<BehaviorTreeExampleComponents, BehaviorTreeExampleBlocks, W, BehaviorTreeExampleMemory>({
		createMemory: () => ({ ...createBehaviorTreeMemory(5), trace: [], randomTicks: 0 }),
		run: root,
		onStatus: (context, _memory, status) => {
			context.components.status[0] = status;
		},
	});
}
