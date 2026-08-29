import { PatrolChaseState, PatrolIndex } from '../../../src/__tests__/examples/patrol-chase';
import { TransformIndex } from '../../../src/__tests__/examples/movement';
import type { Control } from '../controls';
import type { Example, ExampleHost, ExampleRuntime } from '../example';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../example';
import { MovementSystem, PatrolChaseSystem } from '../patrol-systems';
import { createExampleWorld } from '../world';

const settings = {
	speed: 100,
	aggroDistance: 145,
};

export const patrolChaseExample: Example = {
	id: 'patrol-chase',
	title: 'Worker patrol and chase',
	description: 'The blue agent patrols between two endpoints. Move the purple player inside its detection ring '
		+ 'and the AI switches to chase immediately; move the player away and patrol resumes. AI publishes destinations '
		+ 'from one worker while movement owns transforms in another.',
	controls(host: ExampleHost): Array<Control> {
		return [
			{
				kind: 'slider',
				label: 'Movement speed',
				min: 30,
				max: 260,
				step: 5,
				value: settings.speed,
				format: value => `${value} u/s`,
				change(value) {
					settings.speed = value;
					if(host.runtime?.movementSystem) host.runtime.movementSystem.speed = value;
				},
			},
			{
				kind: 'slider',
				label: 'Detection radius',
				min: 50,
				max: 260,
				step: 5,
				value: settings.aggroDistance,
				format: value => `${value} u`,
				change(value) {
					settings.aggroDistance = value;
					const patrol = host.runtime?.agent?.components.patrol?.block;
					if(patrol) patrol[PatrolIndex.aggroDistanceSquared] = value * value;
				},
			},
		];
	},
	create(config): ExampleRuntime {
		const world = createExampleWorld();
		const aiSystem = world.addSystem(new PatrolChaseSystem(world, config.forceMainThread));
		const movementSystem = world.addSystem(new MovementSystem(world, settings.speed, config.forceMainThread));
		const agent = world.loadEntity({
			type: 'agent',
			position: [150, VIEW_HEIGHT / 2],
			patrolPoints: [150, VIEW_HEIGHT / 2, 650, VIEW_HEIGHT / 2],
			aggroDistance: settings.aggroDistance,
			aiState: PatrolChaseState.patrol,
			usesDesiredMovement: true,
		});
		const player = world.loadEntity({ type: 'player', position: [VIEW_WIDTH / 2, 100], isPlayer: true });
		return { world, kind: 'patrol', agent, player, aiSystem, movementSystem };
	},
	pointerDown(runtime, x, y): void {
		const transform = runtime.player?.components.transform?.block;
		if(!transform) return;
		transform[TransformIndex.x] = Math.max(20, Math.min(VIEW_WIDTH - 20, x));
		transform[TransformIndex.y] = Math.max(20, Math.min(VIEW_HEIGHT - 20, y));
	},
};
