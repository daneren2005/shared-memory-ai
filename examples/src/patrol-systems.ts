import { EntityWorkerSystem } from '@daneren2005/shared-memory-ecs';
import type { BaseWorld } from '@daneren2005/shared-memory-ecs';

import { createPatrolChaseUpdate } from '../../src/__tests__/examples/patrol-chase';
import type { PatrolChaseBlocks } from '../../src/__tests__/examples/patrol-chase';
import { movementUpdate } from './movement-update';
import type { MovementBlocks, MovementWorld } from './movement-update';
import type { ExampleComponents, ExampleRegistry } from './patrol-components';

const patrolBehavior = createPatrolChaseUpdate();

export class PatrolChaseSystem extends EntityWorkerSystem<ExampleComponents, PatrolChaseBlocks> {
	constructor(world: BaseWorld<ExampleRegistry>, forceMainThread: boolean) {
		super(world, {
			name: 'PatrolChaseSystem',
			required: ['aiController', 'desiredMovement', 'movementProtocol', 'patrol', 'transform'],
			queries: {
				players: { required: ['player', 'transform'] },
			},
			updateFunction: patrolBehavior.update,
			getWorker: () => new Worker(new URL('./workers/patrol.worker.ts', import.meta.url), { type: 'module' }),
			forceMainThread,
		});
	}
}

export class MovementSystem extends EntityWorkerSystem<ExampleComponents, MovementBlocks, MovementWorld> {
	constructor(world: BaseWorld<ExampleRegistry>, public speed: number, forceMainThread: boolean) {
		super(world, {
			name: 'MovementSystem',
			required: ['desiredMovement', 'movementProtocol', 'transform'],
			updateFunction: movementUpdate,
			getWorker: () => new Worker(new URL('./workers/movement.worker.ts', import.meta.url), { type: 'module' }),
			forceMainThread,
		});
	}

	addDataToWorld(world: MovementWorld): void {
		world.speed = this.speed;
	}
}
