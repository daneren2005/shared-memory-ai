import { BaseWorld, ComponentSystem } from '@daneren2005/shared-memory-ecs';
import type { ComponentSystemConfig } from '@daneren2005/shared-memory-ecs';

import { AIControllerIndex, createPatrolChaseUpdate } from './patrol-chase';
import type { PatrolChaseBlocks } from './patrol-chase';
import { DesiredMovementIndex } from './movement';
import { exampleRegistry } from '../../../examples/src/patrol-components';
import type { ExampleComponents, ExampleRegistry } from '../../../examples/src/patrol-components';

class TestPatrolSystem extends ComponentSystem<ExampleComponents, PatrolChaseBlocks> {
	constructor(world: BaseWorld<ExampleRegistry>, forceMainThread: boolean) {
		const behavior = createPatrolChaseUpdate();
		const options: ComponentSystemConfig<ExampleComponents, PatrolChaseBlocks> = {
			name: forceMainThread ? 'MainPatrol' : 'WorkerPatrol',
			required: ['aiController', 'desiredMovement', 'movementProtocol', 'patrol', 'transform'],
			queries: { players: { required: ['player', 'transform'] } },
			updateFunction: behavior.update,
			getWorker: () => new Worker(new URL('./workers/patrol.worker.ts', import.meta.url), { type: 'module' }),
			forceMainThread,
		};
		super(world, options);
	}
}

describe('worker and fallback parity', () => {
	it('produces identical deterministic patrol/chase state and destination sequences', async () => {
		const [mainSequence, workerSequence] = await Promise.all([
			runSequence(true),
			runSequence(false),
		]);
		expect(workerSequence).toEqual(mainSequence);
	});
});

async function runSequence(forceMainThread: boolean): Promise<Array<Array<number>>> {
	const world = new BaseWorld(exampleRegistry);
	const system = world.addSystem(new TestPatrolSystem(world, forceMainThread));
	const agent = world.loadEntity({
		type: 'agent',
		position: [0, 0],
		patrolPoints: [-10, 0, 10, 0],
		aggroDistance: 5,
		aiState: 0,
		usesDesiredMovement: true,
	});
	world.loadEntity({ type: 'player', position: [3, 0], isPlayer: true });
	await world.init();
	const sequence: Array<Array<number>> = [];
	for(let tick = 0; tick < 3; tick++) {
		world.update(1);
		await system.waitForRunToComplete();
		const controller = agent.components.aiController?.block;
		const desired = agent.components.desiredMovement?.block;
		if(!controller || !desired) throw new Error('Patrol test agent is missing required blocks');
		sequence.push([
			controller[AIControllerIndex.state],
			controller[AIControllerIndex.targetEntityId],
			desired[DesiredMovementIndex.x],
			desired[DesiredMovementIndex.y],
		]);
	}
	world.destroy();
	return sequence;
}
