export const TradeResult = {
	succeeded: 0,
	invalidQuantity: 1,
	missingTarget: 2,
	resourceMismatch: 3,
	insufficientStock: 4,
	insufficientCredits: 5,
	insufficientCapacity: 6,
	insufficientCargo: 7,
	insufficientStationCredits: 8,
} as const;
export type TradeResult = typeof TradeResult[keyof typeof TradeResult];
export const TraderIndex = { credits: 0, cargoQuantity: 1, capacity: 2, resourceId: 3, targetStationId: 4 } as const;
export const StationTradeIndex = { credits: 0, stockQuantity: 1, resourceId: 2, alive: 3 } as const;

export function createScalarTradeTransactions() {
	return {
		buy(trader: Float64Array, station: Float64Array | undefined, quantity: number, unitPrice: number): TradeResult {
			const validation = validateCommon(trader, station, quantity, unitPrice);
			if(validation !== TradeResult.succeeded || !station) return validation;
			const cost = quantity * unitPrice;
			if(station[StationTradeIndex.stockQuantity] < quantity) return TradeResult.insufficientStock;
			if(trader[TraderIndex.credits] < cost) return TradeResult.insufficientCredits;
			if(trader[TraderIndex.cargoQuantity] + quantity > trader[TraderIndex.capacity]) return TradeResult.insufficientCapacity;
			station[StationTradeIndex.stockQuantity] -= quantity;
			station[StationTradeIndex.credits] += cost;
			trader[TraderIndex.cargoQuantity] += quantity;
			trader[TraderIndex.credits] -= cost;
			return TradeResult.succeeded;
		},
		sell(trader: Float64Array, station: Float64Array | undefined, quantity: number, unitPrice: number): TradeResult {
			const validation = validateCommon(trader, station, quantity, unitPrice);
			if(validation !== TradeResult.succeeded || !station) return validation;
			const cost = quantity * unitPrice;
			if(trader[TraderIndex.cargoQuantity] < quantity) return TradeResult.insufficientCargo;
			if(station[StationTradeIndex.credits] < cost) return TradeResult.insufficientStationCredits;
			trader[TraderIndex.cargoQuantity] -= quantity;
			trader[TraderIndex.credits] += cost;
			station[StationTradeIndex.stockQuantity] += quantity;
			station[StationTradeIndex.credits] -= cost;
			return TradeResult.succeeded;
		},
	};
}

function validateCommon(trader: Float64Array, station: Float64Array | undefined, quantity: number, unitPrice: number): TradeResult {
	if(!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0 || unitPrice < 0) return TradeResult.invalidQuantity;
	if(!station || station[StationTradeIndex.alive] === 0) return TradeResult.missingTarget;
	if(trader[TraderIndex.resourceId] !== station[StationTradeIndex.resourceId]) return TradeResult.resourceMismatch;
	return TradeResult.succeeded;
}
