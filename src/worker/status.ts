import type { ComponentMap, EntityUpdateComponents } from '@daneren2005/shared-memory-ecs';

import type { AIContext } from './context';

export const AIStatus = {
	running: 0,
	succeeded: 1,
	failed: 2,
} as const;

export const AIStatusNames = ['running', 'succeeded', 'failed'] as const;

export type AIStatus = typeof AIStatus[keyof typeof AIStatus];

export type AIAction<
	C extends ComponentMap,
	M,
	T extends EntityUpdateComponents<C> = EntityUpdateComponents<C>,
> = (context: AIContext<C, T>, memory: M) => AIStatus;

export type AICriterion<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C> = EntityUpdateComponents<C>,
> = (context: AIContext<C, T>) => boolean;

export type AIUtility<
	C extends ComponentMap,
	T extends EntityUpdateComponents<C> = EntityUpdateComponents<C>,
> = (context: AIContext<C, T>) => number;
