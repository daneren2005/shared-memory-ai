import MemoryHeap from '@daneren2005/shared-memory-objects/memory-heap';
import SharedMap from '@daneren2005/shared-memory-objects/shared-map';

import {
	createScalarTradeTransactions,
	StationTradeIndex,
	TradeResult,
	TraderIndex,
} from './trader';
import { CargoAccountIndex, SharedCargoTransactions } from './shared-cargo';

function scalarTrader(overrides: Partial<Record<keyof typeof TraderIndex, number>> = {}): Float64Array {
	const trader = new Float64Array([100, 2, 10, 1, 9]);
	for(const [name, value] of Object.entries(overrides)) trader[TraderIndex[name as keyof typeof TraderIndex]] = value;
	return trader;
}

function scalarStation(overrides: Partial<Record<keyof typeof StationTradeIndex, number>> = {}): Float64Array {
	const station = new Float64Array([100, 10, 1, 1]);
	for(const [name, value] of Object.entries(overrides)) station[StationTradeIndex[name as keyof typeof StationTradeIndex]] = value;
	return station;
}

describe('scalar trader transactions', () => {
	const transactions = createScalarTradeTransactions();

	it('applies a validated buy as one transaction', () => {
		const trader = scalarTrader();
		const station = scalarStation();
		expect(transactions.buy(trader, station, 3, 10)).toBe(TradeResult.succeeded);
		expect(trader).toEqual(new Float64Array([70, 5, 10, 1, 9]));
		expect(station).toEqual(new Float64Array([130, 7, 1, 1]));
	});

	it.each([
		['missing target', scalarTrader(), undefined, TradeResult.missingTarget],
		['target death', scalarTrader(), scalarStation({ alive: 0 }), TradeResult.missingTarget],
		['insufficient stock', scalarTrader(), scalarStation({ stockQuantity: 1 }), TradeResult.insufficientStock],
		['insufficient credits', scalarTrader({ credits: 5 }), scalarStation(), TradeResult.insufficientCredits],
		['insufficient capacity', scalarTrader({ cargoQuantity: 9 }), scalarStation(), TradeResult.insufficientCapacity],
	] as const)('rejects %s without partial writes', (_name, trader, station, result) => {
		const traderBefore = trader.slice();
		const stationBefore = station?.slice();
		expect(transactions.buy(trader, station, 2, 10)).toBe(result);
		expect(trader).toEqual(traderBefore);
		expect(station).toEqual(stationBefore);
	});

	it('rejects insufficient cargo and station credits on sells', () => {
		const trader = scalarTrader({ cargoQuantity: 1 });
		const station = scalarStation();
		expect(transactions.sell(trader, station, 2, 10)).toBe(TradeResult.insufficientCargo);
		trader[TraderIndex.cargoQuantity] = 5;
		station[StationTradeIndex.credits] = 5;
		expect(transactions.sell(trader, station, 2, 10)).toBe(TradeResult.insufficientStationCredits);
	});
});

describe('heap-backed cargo transactions', () => {
	it('reconstructs and caches maps by pointer while transferring cargo and credits', () => {
		const heap = new MemoryHeap({ bufferSize: 16_384 });
		const traderCargo = new SharedMap<number, Float64Array>(heap, { type: Float64Array });
		const stationCargo = new SharedMap<number, Float64Array>(heap, { type: Float64Array });
		traderCargo.set(1, 2);
		stationCargo.set(1, 10);
		const traderReference = traderCargo.getSharedMemory().firstBlock;
		const stationReference = stationCargo.getSharedMemory().firstBlock;
		const trader = new Float64Array([100, 10, 1]);
		const station = new Float64Array([100, 100, 1]);
		const transactions = new SharedCargoTransactions(heap);

		expect(transactions.buy(trader, traderReference, station, stationReference, 1, 3, 10)).toBe(TradeResult.succeeded);
		expect(transactions.cache.get(traderReference)).toBe(transactions.cache.get(traderReference));
		expect(transactions.cache.size).toBe(2);
		expect(traderCargo.get(1)).toBe(5);
		expect(stationCargo.get(1)).toBe(7);
		expect(trader[CargoAccountIndex.credits]).toBe(70);
		expect(station[CargoAccountIndex.credits]).toBe(130);

		expect(transactions.sell(trader, traderReference, station, stationReference, 1, 2, 20)).toBe(TradeResult.succeeded);
		expect(traderCargo.get(1)).toBe(3);
		expect(stationCargo.get(1)).toBe(9);
	});

	it('validates capacity and dead targets before mutating heap collections', () => {
		const heap = new MemoryHeap({ bufferSize: 16_384 });
		const traderCargo = new SharedMap<number, Float64Array>(heap, { type: Float64Array });
		const stationCargo = new SharedMap<number, Float64Array>(heap, { type: Float64Array });
		traderCargo.set(1, 4);
		stationCargo.set(1, 10);
		const trader = new Float64Array([100, 5, 1]);
		const station = new Float64Array([100, 100, 1]);
		const transactions = new SharedCargoTransactions(heap);

		expect(transactions.buy(
			trader,
			traderCargo.getSharedMemory().firstBlock,
			station,
			stationCargo.getSharedMemory().firstBlock,
			1,
			2,
			10,
		)).toBe(TradeResult.insufficientCapacity);
		expect(traderCargo.get(1)).toBe(4);
		expect(stationCargo.get(1)).toBe(10);

		station[CargoAccountIndex.alive] = 0;
		expect(transactions.sell(
			trader,
			traderCargo.getSharedMemory().firstBlock,
			station,
			stationCargo.getSharedMemory().firstBlock,
			1,
			1,
			10,
		)).toBe(TradeResult.missingTarget);
		expect(traderCargo.get(1)).toBe(4);
	});
});
