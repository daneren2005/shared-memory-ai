import * as ai from '../index';
import { aiRegistry } from '../index';

describe('aiRegistry', () => {
	it('has no built-in components yet', () => {
		expect(Object.keys(aiRegistry)).toHaveLength(0);
	});

	it('exports only abstract AI runtime primitives', () => {
		expect(Object.keys(ai).sort()).toEqual([
			'AIStatus',
			'AIStatusNames',
			'EntityBlockIndex',
			'EntityQueryIndex',
			'alwaysFail',
			'alwaysSucceed',
			'aiRegistry',
			'cooldown',
			'createAIUpdate',
			'createBehaviorTreeMemory',
			'createEntityMemoryStore',
			'createFSM',
			'createUtilitySelector',
			'invert',
			'loop',
			'normalizeUtility',
			'randomSelector',
			'selector',
			'sequence',
		].sort());
	});
});
