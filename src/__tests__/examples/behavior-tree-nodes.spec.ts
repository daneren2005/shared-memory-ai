import type { EntityWorkerSystemCallbacks, EntityWorkerSystemWorld } from '@daneren2005/shared-memory-ecs';

import { AIStatus } from '../../index';
import {
	createStandardBehaviorTreeExample,
} from './behavior-tree-nodes';
import type {
	BehaviorTreeExampleBlocks,
	BehaviorTreeExampleComponents,
} from './behavior-tree-nodes';

const callbacks: EntityWorkerSystemCallbacks<BehaviorTreeExampleComponents> = {
	entityComponentChanged() {},
	emitEntityEvent() {},
	emitSystemEvent() {},
	entityDied() {},
	createEntity() {},
};

describe('standard behavior-tree node example', () => {
	it('exercises tasks, composites, random selection, and every decorator', () => {
		const behavior = createStandardBehaviorTreeExample();
		const world: EntityWorkerSystemWorld = { gameTime: 0, elapsedTime: 1, getString: () => '' };
		const components: BehaviorTreeExampleBlocks = { status: new Uint32Array(1) };
		behavior.update.preRun?.(world, [{ entityId: 1, components }], {}, callbacks);

		run(behavior.update, world, components);
		expect(components.status[0]).toBe(AIStatus.running);
		expect(behavior.memory.get(1).trace).toEqual([
			'forced-failure',
			'inverted-failure',
			'forced-success',
			'random',
		]);

		run(behavior.update, world, components);
		expect(components.status[0]).toBe(AIStatus.succeeded);
		expect(behavior.memory.get(1).trace.slice(-3)).toEqual(['random', 'loop', 'loop']);
		expect(behavior.memory.get(1).trace).not.toContain('unchosen-random');

		world.gameTime = 1;
		run(behavior.update, world, components);
		run(behavior.update, world, components);
		expect(components.status[0]).toBe(AIStatus.failed);
		expect(behavior.memory.get(1).trace.filter(entry => entry === 'loop')).toHaveLength(2);

		world.gameTime = 10;
		run(behavior.update, world, components);
		run(behavior.update, world, components);
		expect(components.status[0]).toBe(AIStatus.succeeded);
		expect(behavior.memory.get(1).trace.filter(entry => entry === 'loop')).toHaveLength(4);
	});
});

function run(
	update: ReturnType<typeof createStandardBehaviorTreeExample>['update'],
	world: EntityWorkerSystemWorld,
	components: BehaviorTreeExampleBlocks,
): void {
	update(world, 1, components, {}, callbacks);
}
