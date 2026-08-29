import { AIStatus } from '@daneren2005/shared-memory-ai/worker';
import type { AIStatus as AIStatusValue } from '@daneren2005/shared-memory-ai/worker';

export const TransformIndex = { x: 0, y: 1 } as const;
export const DesiredMovementIndex = { x: 0, y: 1 } as const;
export const MovementProtocolIndex = {
	destinationSequence: 0,
	arrivedSequence: 1,
	enabled: 2,
} as const;

export function publishDestination(
	desiredMovement: Float32Array | Float64Array,
	protocol: Uint32Array,
	x: number,
	y: number,
): number {
	desiredMovement[DesiredMovementIndex.x] = x;
	desiredMovement[DesiredMovementIndex.y] = y;
	Atomics.store(protocol, MovementProtocolIndex.enabled, 1);
	return Atomics.add(protocol, MovementProtocolIndex.destinationSequence, 1) + 1;
}

export function clearDestination(protocol: Uint32Array): void {
	Atomics.store(protocol, MovementProtocolIndex.enabled, 0);
}

export function hasArrived(protocol: Uint32Array): boolean {
	const destinationSequence = Atomics.load(protocol, MovementProtocolIndex.destinationSequence);
	return destinationSequence !== 0
		&& Atomics.load(protocol, MovementProtocolIndex.arrivedSequence) === destinationSequence;
}

export function moveTowardDestination(
	transform: Float32Array | Float64Array,
	desiredMovement: Float32Array | Float64Array,
	protocol: Uint32Array,
	speed: number,
	elapsedTime: number,
): AIStatusValue {
	if(Atomics.load(protocol, MovementProtocolIndex.enabled) === 0) return AIStatus.failed;
	const destinationSequence = Atomics.load(protocol, MovementProtocolIndex.destinationSequence);
	const dx = desiredMovement[DesiredMovementIndex.x] - transform[TransformIndex.x];
	const dy = desiredMovement[DesiredMovementIndex.y] - transform[TransformIndex.y];
	const distance = Math.hypot(dx, dy);
	const maxStep = speed * elapsedTime;
	if(distance <= maxStep || distance === 0) {
		transform[TransformIndex.x] = desiredMovement[DesiredMovementIndex.x];
		transform[TransformIndex.y] = desiredMovement[DesiredMovementIndex.y];
		Atomics.store(protocol, MovementProtocolIndex.arrivedSequence, destinationSequence);
		return AIStatus.succeeded;
	}
	transform[TransformIndex.x] += dx / distance * maxStep;
	transform[TransformIndex.y] += dy / distance * maxStep;
	return AIStatus.running;
}
