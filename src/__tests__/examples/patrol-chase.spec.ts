import type {
	EntityWorkerSystemCallbacks,
	EntityWorkerSystemWorld,
	EntityQueryComponents,
} from '@daneren2005/shared-memory-ecs';

import {
	DesiredMovementIndex,
	MovementProtocolIndex,
	moveTowardDestination,
	publishDestination,
} from './movement';
import { AIControllerIndex, createPatrolChaseUpdate, PatrolChaseState } from './patrol-chase';
import type { PatrolChaseBlocks, PatrolChaseComponents } from './patrol-chase';
import { AIStatus } from '../../index';

const world: EntityWorkerSystemWorld = {
	gameTime: 0,
	elapsedTime: 1,
	getString: () => '',
};

const callbacks: EntityWorkerSystemCallbacks<PatrolChaseComponents> = {
	entityComponentChanged() {},
	emitEntityEvent() {},
	emitSystemEvent() {},
	entityDied() {},
	createEntity() {},
};

function createProtocol(): Uint32Array {
	return new Uint32Array(new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * 3));
}

function createAgent(): PatrolChaseBlocks {
	return {
		aiController: new Uint32Array(2),
		desiredMovement: new Float64Array(2),
		movementProtocol: createProtocol(),
		patrol: new Float64Array([10, 0, -10, 0, 0, 25]),
		transform: new Float64Array([0, 0]),
	};
}

describe('patrol/chase FSM', () => {
	it('acquires, chases, and invalidates a removed target without writing transform', () => {
		const behavior = createPatrolChaseUpdate();
		const agent = createAgent();
		const transformBeforeAI = agent.transform.slice();
		const players: EntityQueryComponents<PatrolChaseComponents> = {
			players: [{ entityId: 9, components: { transform: new Float64Array([3, 0]), player: new Uint32Array(1) } }],
		};

		behavior.update.preRun?.(world, [{ entityId: 1, components: agent }], players, callbacks);
		behavior.update(world, 1, agent, players, callbacks);
		expect(agent.aiController[AIControllerIndex.targetEntityId]).toBe(9);
		expect(agent.aiController[AIControllerIndex.state]).toBe(PatrolChaseState.patrol);

		behavior.update.preRun?.(world, [{ entityId: 1, components: agent }], players, callbacks);
		behavior.update(world, 1, agent, players, callbacks);
		expect(agent.aiController[AIControllerIndex.state]).toBe(PatrolChaseState.chase);
		expect(agent.desiredMovement[DesiredMovementIndex.x]).toBe(3);
		expect(agent.transform).toEqual(transformBeforeAI);

		const noPlayers: EntityQueryComponents<PatrolChaseComponents> = { players: [] };
		behavior.update.preRun?.(world, [{ entityId: 1, components: agent }], noPlayers, callbacks);
		behavior.update(world, 1, agent, noPlayers, callbacks);
		expect(agent.aiController[AIControllerIndex.state]).toBe(PatrolChaseState.patrol);
		expect(agent.aiController[AIControllerIndex.targetEntityId]).toBe(0);
	});

	it('keeps AI destination fields and movement transform fields disjoint', () => {
		const transform = new Float64Array([0, 0]);
		const desired = new Float64Array(2);
		const protocol = createProtocol();
		const sequence = publishDestination(desired, protocol, 4, 0);
		const desiredBeforeMovement = desired.slice();

		expect(moveTowardDestination(transform, desired, protocol, 2, 1)).toBe(AIStatus.running);
		expect(transform).toEqual(new Float64Array([2, 0]));
		expect(desired).toEqual(desiredBeforeMovement);
		expect(Atomics.load(protocol, MovementProtocolIndex.destinationSequence)).toBe(sequence);

		expect(moveTowardDestination(transform, desired, protocol, 2, 1)).toBe(AIStatus.succeeded);
		expect(Atomics.load(protocol, MovementProtocolIndex.arrivedSequence)).toBe(sequence);
	});
});
