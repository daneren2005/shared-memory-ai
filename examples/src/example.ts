import type { BaseEntity } from '@daneren2005/shared-memory-ecs';

import type { Control } from './controls';
import type { MovementSystem, PatrolChaseSystem } from './patrol-systems';
import type { AttackSystem, TraderSystem } from './domain-systems';
import type { Components, Config, ExampleWorld } from './world';

export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 480;

export interface ExampleRuntime {
	world: ExampleWorld
	kind: 'patrol' | 'trader' | 'attack'
	agent?: BaseEntity<Components, Config>
	player?: BaseEntity<Components, Config>
	stations?: Array<BaseEntity<Components, Config>>
	target?: BaseEntity<Components, Config>
	aiSystem?: PatrolChaseSystem
	movementSystem?: MovementSystem
	traderSystem?: TraderSystem
	attackSystem?: AttackSystem
}

export interface ExampleBuildConfig {
	forceMainThread: boolean
}

export interface ExampleHost {
	readonly runtime: ExampleRuntime | undefined
	restart(): void
}

export interface Example {
	id: string
	title: string
	description: string
	controls(host: ExampleHost): Array<Control>
	create(config: ExampleBuildConfig): ExampleRuntime
	pointerDown?(runtime: ExampleRuntime, x: number, y: number): void
}
