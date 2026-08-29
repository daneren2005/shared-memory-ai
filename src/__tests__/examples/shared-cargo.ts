import type MemoryHeap from '@daneren2005/shared-memory-objects/memory-heap';
import type { SharedAllocatedMemory } from '@daneren2005/shared-memory-objects/allocated-memory';
import SharedMap from '@daneren2005/shared-memory-objects/shared-map';

import { TradeResult } from './trader';
import type { TradeResult as TradeResultValue } from './trader';

export type SharedCargoReference = SharedAllocatedMemory;

export const CargoAccountIndex = {
	credits: 0,
	capacity: 1,
	alive: 2,
} as const;

export class SharedCargoCache {
	private readonly cargoByPointer = new Map<string, SharedMap<number, Float64Array>>();

	constructor(private readonly heap: MemoryHeap) {}

	get(reference: SharedCargoReference): SharedMap<number, Float64Array> {
		const key = `${reference.bufferPosition}:${reference.bufferByteOffset}`;
		let cargo = this.cargoByPointer.get(key);
		if(!cargo) {
			cargo = new SharedMap<number, Float64Array>(this.heap, { firstBlock: reference });
			this.cargoByPointer.set(key, cargo);
		}
		return cargo;
	}

	clear(): void {
		this.cargoByPointer.clear();
	}

	get size(): number {
		return this.cargoByPointer.size;
	}
}

export class SharedCargoTransactions {
	readonly cache: SharedCargoCache;

	constructor(heap: MemoryHeap) {
		this.cache = new SharedCargoCache(heap);
	}

	buy(
		trader: Float64Array,
		traderCargoReference: SharedCargoReference,
		station: Float64Array | undefined,
		stationCargoReference: SharedCargoReference | undefined,
		resourceId: number,
		quantity: number,
		unitPrice: number,
	): TradeResultValue {
		const validation = validateAccounts(trader, station, stationCargoReference, quantity, unitPrice);
		if(validation !== TradeResult.succeeded || !station || !stationCargoReference) return validation;
		const traderCargo = this.cache.get(traderCargoReference);
		const stationCargo = this.cache.get(stationCargoReference);
		const stationQuantity = stationCargo.get(resourceId) ?? 0;
		const traderQuantity = traderCargo.get(resourceId) ?? 0;
		const cost = quantity * unitPrice;
		if(stationQuantity < quantity) return TradeResult.insufficientStock;
		if(trader[CargoAccountIndex.credits] < cost) return TradeResult.insufficientCredits;
		if(totalCargo(traderCargo) + quantity > trader[CargoAccountIndex.capacity]) return TradeResult.insufficientCapacity;

		stationCargo.set(resourceId, stationQuantity - quantity);
		traderCargo.set(resourceId, traderQuantity + quantity);
		station[CargoAccountIndex.credits] += cost;
		trader[CargoAccountIndex.credits] -= cost;
		return TradeResult.succeeded;
	}

	sell(
		trader: Float64Array,
		traderCargoReference: SharedCargoReference,
		station: Float64Array | undefined,
		stationCargoReference: SharedCargoReference | undefined,
		resourceId: number,
		quantity: number,
		unitPrice: number,
	): TradeResultValue {
		const validation = validateAccounts(trader, station, stationCargoReference, quantity, unitPrice);
		if(validation !== TradeResult.succeeded || !station || !stationCargoReference) return validation;
		const traderCargo = this.cache.get(traderCargoReference);
		const stationCargo = this.cache.get(stationCargoReference);
		const traderQuantity = traderCargo.get(resourceId) ?? 0;
		const cost = quantity * unitPrice;
		if(traderQuantity < quantity) return TradeResult.insufficientCargo;
		if(station[CargoAccountIndex.credits] < cost) return TradeResult.insufficientStationCredits;

		traderCargo.set(resourceId, traderQuantity - quantity);
		stationCargo.set(resourceId, (stationCargo.get(resourceId) ?? 0) + quantity);
		trader[CargoAccountIndex.credits] += cost;
		station[CargoAccountIndex.credits] -= cost;
		return TradeResult.succeeded;
	}
}

function validateAccounts(
	trader: Float64Array,
	station: Float64Array | undefined,
	stationCargoReference: SharedCargoReference | undefined,
	quantity: number,
	unitPrice: number,
): TradeResultValue {
	if(!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0 || unitPrice < 0) return TradeResult.invalidQuantity;
	if(!station || !stationCargoReference || station[CargoAccountIndex.alive] === 0) return TradeResult.missingTarget;
	if(trader[CargoAccountIndex.alive] === 0) return TradeResult.missingTarget;
	return TradeResult.succeeded;
}

function totalCargo(cargo: SharedMap<number, Float64Array>): number {
	let total = 0;
	for(const [, quantity] of cargo) total += quantity;
	return total;
}
