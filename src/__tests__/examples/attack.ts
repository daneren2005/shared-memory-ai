import type { BaseComponent, ComponentMap, ComponentSystemWorld, EntityUpdateComponents } from '@daneren2005/shared-memory-ecs';
import { AIStatus, createAIUpdate } from '@daneren2005/shared-memory-ai/worker';

import { clearDestination, publishDestination, TransformIndex } from './movement';

export const AttackPhase = { moving: 0, retreating: 1, striking: 2 } as const;
export const AttackPhaseNames = ['moving', 'retreating', 'striking'] as const;
export const AttackStateIndex = { phase: 0, targetEntityId: 1 } as const;
export const AttackTimingIndex = { nextStrikeTime: 0 } as const;
export const HealthIndex = { current: 0 } as const;

interface FloatBlockComponent extends BaseComponent {
	block?: Float64Array
}

interface UintBlockComponent extends BaseComponent {
	block?: Uint32Array
}

export interface AttackComponents extends ComponentMap {
	attackState: UintBlockComponent
	attackTiming: FloatBlockComponent
	desiredMovement: FloatBlockComponent
	health: FloatBlockComponent
	movementProtocol: UintBlockComponent
	transform: FloatBlockComponent
}

export interface AttackBlocks extends EntityUpdateComponents<AttackComponents> {
	attackState: Uint32Array
	attackTiming: Float64Array
	desiredMovement: Float64Array
	movementProtocol: Uint32Array
	transform: Float64Array
}

export interface AttackConfig {
	damage: number
	strikeCooldown: number
	strikeRange: number
	retreatRange: number
}

export function createAttackUpdate<W extends ComponentSystemWorld = ComponentSystemWorld>(config: AttackConfig) {
	const strikeRangeSquared = config.strikeRange * config.strikeRange;
	const retreatRangeSquared = config.retreatRange * config.retreatRange;
	return createAIUpdate<AttackComponents, AttackBlocks, W>({
		createMemory: () => ({}),
		run(context) {
			const state = context.components.attackState;
			const targetId = state[AttackStateIndex.targetEntityId];
			const target = context.queries.get('attackTargets').byId.get(targetId);
			const targetTransform = target?.components.transform;
			const targetHealth = target?.components.health;
			if(!(targetTransform instanceof Float64Array) || !(targetHealth instanceof Float64Array)) {
				state[AttackStateIndex.targetEntityId] = 0;
				clearDestination(context.components.movementProtocol);
				return AIStatus.failed;
			}
			if(targetHealth[HealthIndex.current] <= 0) {
				clearDestination(context.components.movementProtocol);
				return AIStatus.succeeded;
			}
			const dx = targetTransform[TransformIndex.x] - context.components.transform[TransformIndex.x];
			const dy = targetTransform[TransformIndex.y] - context.components.transform[TransformIndex.y];
			const distanceSquared = dx * dx + dy * dy;
			if(distanceSquared < retreatRangeSquared) {
				state[AttackStateIndex.phase] = AttackPhase.retreating;
				const distance = Math.sqrt(distanceSquared) || 1;
				publishDestination(
					context.components.desiredMovement,
					context.components.movementProtocol,
					context.components.transform[0] - dx / distance * config.retreatRange,
					context.components.transform[1] - dy / distance * config.retreatRange,
				);
				return AIStatus.running;
			}
			if(distanceSquared > strikeRangeSquared) {
				state[AttackStateIndex.phase] = AttackPhase.moving;
				publishDestination(context.components.desiredMovement, context.components.movementProtocol, targetTransform[0], targetTransform[1]);
				return AIStatus.running;
			}
			state[AttackStateIndex.phase] = AttackPhase.striking;
			clearDestination(context.components.movementProtocol);
			if(context.gameTime < context.components.attackTiming[AttackTimingIndex.nextStrikeTime]) return AIStatus.running;
			targetHealth[HealthIndex.current] = Math.max(0, targetHealth[HealthIndex.current] - config.damage);
			context.components.attackTiming[0] = context.gameTime + config.strikeCooldown;
			context.events.emitEntity('attack-strike', targetId);
			return targetHealth[0] === 0 ? AIStatus.succeeded : AIStatus.running;
		},
	});
}
