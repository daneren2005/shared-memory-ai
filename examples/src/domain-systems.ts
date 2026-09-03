import { EntityWorkerSystem } from '@daneren2005/shared-memory-ecs';
import type { BaseWorld } from '@daneren2005/shared-memory-ecs';

import { createAttackUpdate } from '../../src/__tests__/examples/attack';
import type { AttackBlocks } from '../../src/__tests__/examples/attack';
import { createScalarTraderUpdate } from '../../src/__tests__/examples/scalar-trader';
import type { ScalarTraderBlocks } from '../../src/__tests__/examples/scalar-trader';
import type { ExampleComponents, ExampleRegistry } from './patrol-components';

const traderBehavior = createScalarTraderUpdate(1, 5);
const attackBehavior = createAttackUpdate({ damage: 10, strikeCooldown: 500, strikeRange: 90, retreatRange: 45 });

export class TraderSystem extends EntityWorkerSystem<ExampleComponents, ScalarTraderBlocks> {
	constructor(world: BaseWorld<ExampleRegistry>, forceMainThread: boolean) {
		super(world, {
			name: 'TraderSystem',
			deltaBetweenRuns: 350,
			required: ['trader'],
			queries: { stations: { required: ['stationTrade', 'transform'] } },
			updateFunction: traderBehavior.update,
			getWorker: () => new Worker(new URL('./workers/trader.worker.ts', import.meta.url), { type: 'module' }),
			forceMainThread,
		});
	}
}

export class AttackSystem extends EntityWorkerSystem<ExampleComponents, AttackBlocks> {
	constructor(world: BaseWorld<ExampleRegistry>, forceMainThread: boolean) {
		super(world, {
			name: 'AttackSystem',
			required: ['attackState', 'attackTiming', 'desiredMovement', 'movementProtocol', 'transform'],
			queries: { attackTargets: { required: ['attackTarget', 'health', 'transform'] } },
			updateFunction: attackBehavior.update,
			getWorker: () => new Worker(new URL('./workers/attack.worker.ts', import.meta.url), { type: 'module' }),
			forceMainThread,
		});
	}
}
