import type { Example, ExampleRuntime } from '../example';
import { VIEW_HEIGHT } from '../example';
import { TraderSystem } from '../domain-systems';
import { createExampleWorld } from '../world';

export const traderExample: Example = {
	id: 'trader',
	title: 'Worker-native trader',
	description: 'A code-defined worker behavior resolves a station through the query index and performs validated stock, cargo, and credit mutations as one exclusively owned transaction.',
	controls: () => [],
	create(config): ExampleRuntime {
		const world = createExampleWorld();
		const traderSystem = world.addSystem(new TraderSystem(world, config.forceMainThread));
		const trader = world.loadEntity({
			type: 'trader',
			position: [180, VIEW_HEIGHT / 2],
			traderCredits: 100,
			cargoCapacity: 12,
			resourceId: 1,
		});
		const station = world.loadEntity({
			type: 'station',
			position: [620, VIEW_HEIGHT / 2],
			stationCredits: 100,
			stationStock: 20,
			stationResourceId: 1,
		});
		return { world, kind: 'trader', agent: trader, stations: [station], traderSystem };
	},
};
