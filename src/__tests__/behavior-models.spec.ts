import type {
	BaseComponent,
	ComponentMap,
	EntityWorkerSystemCallbacks,
	EntityWorkerSystemWorld,
	EntityUpdateComponents,
} from '@daneren2005/shared-memory-ecs';

import {
	AIStatus,
	cooldown,
	createAIUpdate,
	createBehaviorTreeMemory,
	createUtilitySelector,
	normalizeUtility,
	selector,
	sequence,
} from '../index';
import type { BehaviorTreeMemory, UtilityMemory } from '../index';

interface ValueComponent extends BaseComponent {
	block?: Float64Array
}

interface ModelComponents extends ComponentMap {
	value: ValueComponent
}

interface ModelBlocks extends EntityUpdateComponents<ModelComponents> {
	value: Float64Array
}

const callbacks: EntityWorkerSystemCallbacks<ModelComponents> = {
	entityComponentChanged() {},
	emitEntityEvent() {},
	emitSystemEvent() {},
	entityDied() {},
	createEntity() {},
};

describe('behavior tree composites', () => {
	it('resumes sequences and selectors from their running child', () => {
		interface TreeMemory extends BehaviorTreeMemory {
			calls: Uint32Array
		}
		const first = sequence<ModelComponents, TreeMemory, ModelBlocks>(0, [
			(_context, memory) => {
				memory.calls[0]++;
				return memory.calls[0] < 2 ? AIStatus.running : AIStatus.succeeded;
			},
			(_context, memory) => {
				memory.calls[1]++;
				return AIStatus.succeeded;
			},
		]);
		const root = selector<ModelComponents, TreeMemory, ModelBlocks>(1, [
			() => AIStatus.failed,
			first,
		]);
		const behavior = createAIUpdate<ModelComponents, ModelBlocks, EntityWorkerSystemWorld, TreeMemory>({
			createMemory: () => ({ ...createBehaviorTreeMemory(2), calls: new Uint32Array(2) }),
			run: root,
		});
		const world: EntityWorkerSystemWorld = { gameTime: 0, elapsedTime: 1, getString: () => '' };
		const components = { value: new Float64Array(1) };

		behavior.update.preRun?.(world, [{ entityId: 1, components }], {}, callbacks);
		expect(runUpdate(behavior.update, world, components)).toBeUndefined();
		expect(behavior.memory.get(1).calls).toEqual(new Uint32Array([1, 0]));
		runUpdate(behavior.update, world, components);
		expect(behavior.memory.get(1).calls).toEqual(new Uint32Array([2, 1]));
		expect(behavior.memory.get(1).cursors).toEqual(new Uint32Array([0, 0]));
	});

	it('resumes a running cooldown child while rejecting fresh entries until ready', () => {
		interface TreeMemory extends BehaviorTreeMemory {
			calls: number
		}
		const action = cooldown<ModelComponents, TreeMemory, ModelBlocks>(0, 10, (_context, memory) => {
			memory.calls++;
			return memory.calls < 2 ? AIStatus.running : AIStatus.succeeded;
		});
		const behavior = createAIUpdate<ModelComponents, ModelBlocks, EntityWorkerSystemWorld, TreeMemory>({
			createMemory: () => ({ ...createBehaviorTreeMemory(1), calls: 0 }),
			run: action,
		});
		const world: EntityWorkerSystemWorld = { gameTime: 0, elapsedTime: 1, getString: () => '' };
		const components = { value: new Float64Array(1) };

		behavior.update.preRun?.(world, [{ entityId: 1, components }], {}, callbacks);
		runUpdate(behavior.update, world, components);
		runUpdate(behavior.update, world, components);
		expect(behavior.memory.get(1).calls).toBe(2);
		runUpdate(behavior.update, world, components);
		expect(behavior.memory.get(1).calls).toBe(2);
		world.gameTime = 10;
		runUpdate(behavior.update, world, components);
		expect(behavior.memory.get(1).calls).toBe(3);
	});
});

describe('utility selector', () => {
	it('normalizes scores, applies thresholds, and honors commitment duration', () => {
		interface SelectionMemory extends UtilityMemory {
			choices: Array<number>
		}
		const selectorAction = createUtilitySelector<ModelComponents, SelectionMemory, ModelBlocks>([
			{
				score: context => context.components.value[0],
				action: (_context, memory) => {
					memory.choices.push(0);
					return AIStatus.running;
				},
			},
			{
				score: context => context.components.value[1],
				action: (_context, memory) => {
					memory.choices.push(1);
					return AIStatus.running;
				},
			},
		], { minimumScore: 0.2, commitmentDuration: 10 });
		const behavior = createAIUpdate<ModelComponents, ModelBlocks, EntityWorkerSystemWorld, SelectionMemory>({
			createMemory: () => ({ selectedOption: -1, committedUntil: 0, choices: [] }),
			run: selectorAction,
		});
		const mutableWorld: EntityWorkerSystemWorld = { gameTime: 0, elapsedTime: 1, getString: () => '' };
		const components = { value: new Float64Array([0.8, 0.4]) };

		behavior.update.preRun?.(mutableWorld, [{ entityId: 1, components }], {}, callbacks);
		runUpdate(behavior.update, mutableWorld, components);
		components.value.set([0.1, 1]);
		mutableWorld.gameTime = 5;
		runUpdate(behavior.update, mutableWorld, components);
		mutableWorld.gameTime = 11;
		runUpdate(behavior.update, mutableWorld, components);

		expect(behavior.memory.get(1).choices).toEqual([0, 0, 1]);
		expect(normalizeUtility(15, 10, 20)).toBe(0.5);
		expect(normalizeUtility(30, 10, 20)).toBe(1);
	});
});

function runUpdate(
	update: ReturnType<typeof createAIUpdate<ModelComponents, ModelBlocks>>['update'],
	world: EntityWorkerSystemWorld,
	components: ModelBlocks,
): void {
	update(world, 1, components, {}, callbacks);
}
