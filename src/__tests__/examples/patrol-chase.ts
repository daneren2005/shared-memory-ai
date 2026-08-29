import type {
	BaseComponent,
	ComponentMap,
	ComponentSystemWorld,
	EntityUpdateComponents,
} from '@daneren2005/shared-memory-ecs';
import { AIStatus, createAIUpdate, createFSM } from '@daneren2005/shared-memory-ai/worker';
import type { AIContext, AIStatus as AIStatusValue } from '@daneren2005/shared-memory-ai/worker';

import { hasArrived, publishDestination, TransformIndex } from './movement';

export const PatrolChaseState = { patrol: 0, chase: 1 } as const;
export const PatrolChaseStateNames = ['patrol', 'chase'] as const;
export const AIControllerIndex = { state: 0, targetEntityId: 1 } as const;
export const PatrolIndex = {
	firstX: 0,
	firstY: 1,
	secondX: 2,
	secondY: 3,
	activeEndpoint: 4,
	aggroDistanceSquared: 5,
} as const;

interface FloatBlockComponent extends BaseComponent {
	block?: Float64Array
}

interface UintBlockComponent extends BaseComponent {
	block?: Uint32Array
}

export interface PatrolChaseComponents extends ComponentMap {
	aiController: UintBlockComponent
	desiredMovement: FloatBlockComponent
	movementProtocol: UintBlockComponent
	patrol: FloatBlockComponent
	player: UintBlockComponent
	transform: FloatBlockComponent
}

export interface PatrolChaseBlocks extends EntityUpdateComponents<PatrolChaseComponents> {
	aiController: Uint32Array
	desiredMovement: Float64Array
	movementProtocol: Uint32Array
	patrol: Float64Array
	transform: Float64Array
}

type PatrolContext = AIContext<PatrolChaseComponents, PatrolChaseBlocks>;

function isPositionBlock(block: unknown): block is Float32Array | Float64Array {
	return block instanceof Float32Array || block instanceof Float64Array;
}

function squaredDistance(source: Float64Array, target: Float32Array | Float64Array): number {
	const dx = source[TransformIndex.x] - target[TransformIndex.x];
	const dy = source[TransformIndex.y] - target[TransformIndex.y];
	return dx * dx + dy * dy;
}

function resolveTarget(context: PatrolContext) {
	return context.queries.get('players').byId.get(context.components.aiController[AIControllerIndex.targetEntityId]);
}

function targetIsValid(context: PatrolContext): boolean {
	const transform = resolveTarget(context)?.components.transform;
	return isPositionBlock(transform)
		&& squaredDistance(context.components.transform, transform) <= context.components.patrol[PatrolIndex.aggroDistanceSquared];
}

function acquireTarget(context: PatrolContext): void {
	let closestId = 0;
	let closestDistance = context.components.patrol[PatrolIndex.aggroDistanceSquared];
	for(const candidate of context.queries.get('players').entities) {
		const transform = candidate.components.transform;
		if(!isPositionBlock(transform)) continue;
		const distance = squaredDistance(context.components.transform, transform);
		if(distance <= closestDistance) {
			closestDistance = distance;
			closestId = candidate.entityId;
		}
	}
	context.components.aiController[AIControllerIndex.targetEntityId] = closestId;
}

function runPatrol(context: PatrolContext): AIStatusValue {
	const patrol = context.components.patrol;
	if(hasArrived(context.components.movementProtocol)) patrol[PatrolIndex.activeEndpoint] = patrol[PatrolIndex.activeEndpoint] === 0 ? 1 : 0;
	const second = patrol[PatrolIndex.activeEndpoint] === 1;
	publishDestination(
		context.components.desiredMovement,
		context.components.movementProtocol,
		patrol[second ? PatrolIndex.secondX : PatrolIndex.firstX],
		patrol[second ? PatrolIndex.secondY : PatrolIndex.firstY],
	);
	acquireTarget(context);
	return AIStatus.running;
}

function runChase(context: PatrolContext): AIStatusValue {
	const transform = resolveTarget(context)?.components.transform;
	if(!isPositionBlock(transform)) return AIStatus.failed;
	publishDestination(context.components.desiredMovement, context.components.movementProtocol, transform[0], transform[1]);
	return AIStatus.running;
}

export function createPatrolChaseUpdate<W extends ComponentSystemWorld = ComponentSystemWorld>() {
	const fsm = createFSM<PatrolChaseComponents, Record<string, never>, PatrolChaseBlocks>({
		getState: context => context.components.aiController[AIControllerIndex.state],
		setState: (context, state) => {
			context.components.aiController[AIControllerIndex.state] = state;
		},
		states: new Map([[PatrolChaseState.patrol, runPatrol], [PatrolChaseState.chase, runChase]]),
		transitions: [
			{
				from: PatrolChaseState.patrol,
				to: PatrolChaseState.chase,
				when: context => context.components.aiController[AIControllerIndex.targetEntityId] !== 0,
			},
			{
				from: PatrolChaseState.chase,
				to: PatrolChaseState.patrol,
				when: context => !targetIsValid(context),
				onTransition: context => {
					context.components.aiController[AIControllerIndex.targetEntityId] = 0;
				},
			},
		],
	});
	return createAIUpdate<PatrolChaseComponents, PatrolChaseBlocks, W>({ createMemory: () => ({}), run: fsm });
}
