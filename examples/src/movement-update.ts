import type { ComponentSystemWorld, EntityUpdateComponents, EntityUpdateFunction } from '@daneren2005/shared-memory-ecs';

import { moveTowardDestination } from '../../src/__tests__/examples/movement';
import type { ExampleComponents } from './patrol-components';

export interface MovementBlocks extends EntityUpdateComponents<ExampleComponents> {
	desiredMovement: Float64Array
	movementProtocol: Uint32Array
	transform: Float64Array
}

export interface MovementWorld extends ComponentSystemWorld {
	speed: number
}

export const movementUpdate: EntityUpdateFunction<ExampleComponents, MovementBlocks, MovementWorld> = (world, _entityId, components) => {
	moveTowardDestination(components.transform, components.desiredMovement, components.movementProtocol, world.speed / 1_000, world.elapsedTime);
};
