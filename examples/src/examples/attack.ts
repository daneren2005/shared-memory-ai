import { TransformIndex } from '../../../src/__tests__/examples/movement';
import type { Example, ExampleRuntime } from '../example';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../example';
import { AttackSystem } from '../domain-systems';
import { MovementSystem } from '../patrol-systems';
import { createExampleWorld } from '../world';

export const attackExample: Example = {
	id: 'attack',
	title: 'Data-oriented attack',
	description: 'The attacker stores its target, phase, and cooldown in shared blocks. It moves into range, retreats '
		+ 'if the target is too close, and applies strikes without command objects or callbacks.',
	controls: () => [],
	create(config): ExampleRuntime {
		const world = createExampleWorld();
		const attackSystem = world.addSystem(new AttackSystem(world, config.forceMainThread));
		const movementSystem = world.addSystem(new MovementSystem(world, 115, config.forceMainThread));
		const target = world.loadEntity({
			type: 'attack-target',
			position: [600, VIEW_HEIGHT / 2],
			health: 100,
			isAttackTarget: true,
		});
		const attacker = world.loadEntity({
			type: 'attacker',
			position: [150, VIEW_HEIGHT / 2],
			attackTargetId: target.eid,
			usesDesiredMovement: true,
		});
		return { world, kind: 'attack', agent: attacker, target, attackSystem, movementSystem };
	},
	pointerDown(runtime, x, y): void {
		const transform = runtime.target?.components.transform?.block;
		if(!transform) return;
		transform[TransformIndex.x] = Math.max(40, Math.min(VIEW_WIDTH - 40, x));
		transform[TransformIndex.y] = Math.max(40, Math.min(VIEW_HEIGHT - 40, y));
	},
};
