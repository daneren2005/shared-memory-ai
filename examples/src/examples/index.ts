import { attackExample } from './attack';
import { patrolChaseExample } from './patrol-chase';
import { traderExample } from './trader';
import type { Example } from '../example';

export const examples: Array<Example> = [patrolChaseExample, traderExample, attackExample];

export function findExample(id: string): Example | undefined {
	return examples.find(example => example.id === id);
}
