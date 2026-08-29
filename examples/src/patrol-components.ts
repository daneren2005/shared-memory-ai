import { Component } from '@daneren2005/shared-memory-ecs';
import type { ComponentDefinition, ComponentsOf } from '@daneren2005/shared-memory-ecs';

class ExampleComponent<T extends Float64Array | Uint32Array> extends Component<T> {}

const transformDefinition: ComponentDefinition<ExampleComponent<Float64Array>, Float64Array, { position: [number, number] }> = {
	type: Float64Array,
	size: 2,
	loadProperties: ['position'],
	toBlock: config => config.position,
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const patrolDefinition: ComponentDefinition<ExampleComponent<Float64Array>, Float64Array, {
	patrolPoints: [number, number, number, number]
	aggroDistance: number
}> = {
	type: Float64Array,
	size: 6,
	loadProperties: ['patrolPoints', 'aggroDistance'],
	toBlock: config => [...config.patrolPoints, 0, config.aggroDistance * config.aggroDistance],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

function markerDefinition(property: 'isPlayer' | 'isAttackTarget'): ComponentDefinition<ExampleComponent<Uint32Array>, Uint32Array, Record<typeof property, boolean>> {
	return {
		type: Uint32Array,
		size: 1,
		loadProperties: [property],
		toBlock: () => [1],
		attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
	};
}

const aiControllerDefinition: ComponentDefinition<ExampleComponent<Uint32Array>, Uint32Array, { aiState: number }> = {
	type: Uint32Array,
	size: 2,
	loadProperties: ['aiState'],
	toBlock: config => [config.aiState, 0],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const desiredMovementDefinition: ComponentDefinition<ExampleComponent<Float64Array>, Float64Array, { usesDesiredMovement: boolean }> = {
	type: Float64Array,
	size: 2,
	loadProperties: ['usesDesiredMovement'],
	toBlock: () => [0, 0],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const movementProtocolDefinition: ComponentDefinition<ExampleComponent<Uint32Array>, Uint32Array, { usesDesiredMovement: boolean }> = {
	type: Uint32Array,
	size: 3,
	loadProperties: ['usesDesiredMovement'],
	toBlock: () => [0, 0, 0],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const traderDefinition: ComponentDefinition<ExampleComponent<Float64Array>, Float64Array, {
	traderCredits: number
	cargoCapacity: number
	resourceId: number
}> = {
	type: Float64Array,
	size: 5,
	loadProperties: ['traderCredits', 'cargoCapacity', 'resourceId'],
	toBlock: config => [config.traderCredits, 0, config.cargoCapacity, config.resourceId, 0],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const stationTradeDefinition: ComponentDefinition<ExampleComponent<Float64Array>, Float64Array, {
	stationCredits: number
	stationStock: number
	stationResourceId: number
}> = {
	type: Float64Array,
	size: 4,
	loadProperties: ['stationCredits', 'stationStock', 'stationResourceId'],
	toBlock: config => [config.stationCredits, config.stationStock, config.stationResourceId, 1],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const attackStateDefinition: ComponentDefinition<ExampleComponent<Uint32Array>, Uint32Array, { attackTargetId: number }> = {
	type: Uint32Array,
	size: 2,
	loadProperties: ['attackTargetId'],
	toBlock: config => [0, config.attackTargetId],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const attackTimingDefinition: ComponentDefinition<ExampleComponent<Float64Array>, Float64Array, { attackTargetId: number }> = {
	type: Float64Array,
	size: 1,
	loadProperties: ['attackTargetId'],
	toBlock: () => [0],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

const healthDefinition: ComponentDefinition<ExampleComponent<Float64Array>, Float64Array, { health: number }> = {
	type: Float64Array,
	size: 1,
	loadProperties: ['health'],
	toBlock: config => [config.health],
	attach: (_entity, memory, index) => new ExampleComponent(memory.getBlock(index), index),
};

export const exampleRegistry = {
	aiController: aiControllerDefinition,
	desiredMovement: desiredMovementDefinition,
	movementProtocol: movementProtocolDefinition,
	patrol: patrolDefinition,
	player: markerDefinition('isPlayer'),
	trader: traderDefinition,
	stationTrade: stationTradeDefinition,
	attackState: attackStateDefinition,
	attackTiming: attackTimingDefinition,
	health: healthDefinition,
	attackTarget: markerDefinition('isAttackTarget'),
	transform: transformDefinition,
};

export type ExampleComponents = ComponentsOf<typeof exampleRegistry>;
export type ExampleRegistry = typeof exampleRegistry;
