import type {
	EntityWorkerSystemCallbacks,
	EntityWorkerSystemWorld,
	EntityQueryComponents,
} from '@daneren2005/shared-memory-ecs';

import {
	AttackPhase,
	AttackStateIndex,
	AttackTimingIndex,
	createAttackUpdate,
	HealthIndex,
} from './attack';
import type {
	AttackBlocks,
	AttackComponents,
} from './attack';
import { DesiredMovementIndex } from './movement';
import { createScalarTraderUpdate } from './scalar-trader';
import type { ScalarTraderBlocks, ScalarTraderComponents } from './scalar-trader';
import { StationTradeIndex, TraderIndex } from './trader';

function createProtocol(): Uint32Array {
	return new Uint32Array(new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * 3));
}

const world: EntityWorkerSystemWorld = { gameTime: 0, elapsedTime: 1, getString: () => '' };

describe('scalar trader behavior fixture', () => {
	const callbacks: EntityWorkerSystemCallbacks<ScalarTraderComponents> = {
		addComponent() {},
		removeComponent() {},
		entityComponentChanged() {},
		emitEntityEvent() {},
		emitSystemEvent() {},
		entityDied() {},
		createEntity() {},
	};

	it('acquires a station and invalidates its ID before a removed block can be reused', () => {
		const behavior = createScalarTraderUpdate(2, 10);
		const trader: ScalarTraderBlocks = { trader: new Float64Array([100, 0, 10, 1, 0]) };
		const station = new Float64Array([100, 10, 1, 1]);
		const stations: EntityQueryComponents<ScalarTraderComponents> = {
			stations: [{ entityId: 9, components: { stationTrade: station } }],
		};

		behavior.update.preRun?.(world, [{ entityId: 1, components: trader }], stations, callbacks);
		behavior.update(world, 1, trader, stations, callbacks);
		expect(trader.trader[TraderIndex.targetStationId]).toBe(9);
		expect(trader.trader[TraderIndex.cargoQuantity]).toBe(2);
		expect(station[StationTradeIndex.stockQuantity]).toBe(8);

		const removed: EntityQueryComponents<ScalarTraderComponents> = { stations: [] };
		behavior.update.preRun?.(world, [{ entityId: 1, components: trader }], removed, callbacks);
		behavior.update(world, 1, trader, removed, callbacks);
		expect(trader.trader[TraderIndex.targetStationId]).toBe(0);
		expect(trader.trader[TraderIndex.cargoQuantity]).toBe(2);

		const reused: EntityQueryComponents<ScalarTraderComponents> = {
			stations: [{ entityId: 9, components: { stationTrade: new Float64Array([100, 10, 1, 0]) } }],
		};
		behavior.update.preRun?.(world, [{ entityId: 1, components: trader }], reused, callbacks);
		behavior.update(world, 1, trader, reused, callbacks);
		expect(trader.trader[TraderIndex.targetStationId]).toBe(0);
	});
});

describe('data-oriented attack action', () => {
	const events: Array<[number, string, Array<unknown>]> = [];
	const callbacks: EntityWorkerSystemCallbacks<AttackComponents> = {
		addComponent() {},
		removeComponent() {},
		entityComponentChanged() {},
		emitEntityEvent(entityId, event, ...args) {
			events.push([entityId, event, args]);
		},
		emitSystemEvent() {},
		entityDied() {},
		createEntity() {},
	};

	function agent(): AttackBlocks {
		return {
			attackState: new Uint32Array([AttackPhase.moving, 9]),
			attackTiming: new Float64Array(1),
			desiredMovement: new Float64Array(2),
			movementProtocol: createProtocol(),
			transform: new Float64Array([0, 0]),
		};
	}

	it('alternates between moving, retreating, and striking phases without command objects', () => {
		events.length = 0;
		const behavior = createAttackUpdate({ damage: 5, strikeCooldown: 10, strikeRange: 5, retreatRange: 2 });
		const attacker = agent();
		const targetTransform = new Float64Array([10, 0]);
		const health = new Float64Array([10]);
		const targets: EntityQueryComponents<AttackComponents> = {
			attackTargets: [{ entityId: 9, components: { transform: targetTransform, health } }],
		};

		behavior.update.preRun?.(world, [{ entityId: 1, components: attacker }], targets, callbacks);
		behavior.update(world, 1, attacker, targets, callbacks);
		expect(attacker.attackState[AttackStateIndex.phase]).toBe(AttackPhase.moving);
		expect(attacker.desiredMovement[DesiredMovementIndex.x]).toBe(10);

		targetTransform[0] = 1;
		behavior.update(world, 1, attacker, targets, callbacks);
		expect(attacker.attackState[AttackStateIndex.phase]).toBe(AttackPhase.retreating);
		expect(attacker.desiredMovement[DesiredMovementIndex.x]).toBe(-2);

		targetTransform[0] = 3;
		behavior.update(world, 1, attacker, targets, callbacks);
		expect(attacker.attackState[AttackStateIndex.phase]).toBe(AttackPhase.striking);
		expect(health[HealthIndex.current]).toBe(5);
		expect(attacker.attackTiming[AttackTimingIndex.nextStrikeTime]).toBe(10);
		expect(events).toEqual([[1, 'attack-strike', [9]]]);

		world.gameTime = 5;
		behavior.update(world, 1, attacker, targets, callbacks);
		expect(health[HealthIndex.current]).toBe(5);
		world.gameTime = 10;
		behavior.update(world, 1, attacker, targets, callbacks);
		expect(health[HealthIndex.current]).toBe(0);
	});

	it('fails safely and clears a target removed from its query', () => {
		const behavior = createAttackUpdate({ damage: 5, strikeCooldown: 10, strikeRange: 5, retreatRange: 2 });
		const attacker = agent();
		const targets: EntityQueryComponents<AttackComponents> = { attackTargets: [] };
		behavior.update.preRun?.(world, [{ entityId: 1, components: attacker }], targets, callbacks);
		behavior.update(world, 1, attacker, targets, callbacks);
		expect(attacker.attackState[AttackStateIndex.targetEntityId]).toBe(0);
	});
});
