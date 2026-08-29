import { BaseWorld } from '@daneren2005/shared-memory-ecs';
import type { ComponentsOf, EntityConfigOf } from '@daneren2005/shared-memory-ecs';
import { aiRegistry } from '@daneren2005/shared-memory-ai';

import { exampleRegistry } from './patrol-components';

export const registry = {
	...aiRegistry,
	...exampleRegistry,
};

export type Components = ComponentsOf<typeof registry>;
export type Config = EntityConfigOf<typeof registry>;
export type ExampleWorld = BaseWorld<typeof registry>;

export function createExampleWorld(): ExampleWorld {
	return new BaseWorld(registry);
}
