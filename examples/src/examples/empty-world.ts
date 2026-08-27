import { createExampleWorld } from '../world';
import type { ExampleWorld } from '../world';

export const emptyWorldExample = {
	id: 'empty-world',
	title: 'Empty world',
	description: 'An initialized ECS world with no entities or systems. It advances once per animation frame.',
	create(): ExampleWorld {
		return createExampleWorld();
	},
};
