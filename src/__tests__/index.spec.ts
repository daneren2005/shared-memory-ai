import { aiRegistry } from '../index';

describe('aiRegistry', () => {
	it('starts empty', () => {
		expect(Object.keys(aiRegistry)).toHaveLength(0);
	});
});
