import type { BaseComponent, ComponentMap, ComponentSystemWorld, EntityUpdateComponents } from '@daneren2005/shared-memory-ecs';
import { AIStatus, createAIUpdate } from '@daneren2005/shared-memory-ai/worker';

import { createScalarTradeTransactions, StationTradeIndex, TraderIndex, TradeResult } from './trader';

interface TradeComponent extends BaseComponent {
	block?: Float64Array
}

export interface ScalarTraderComponents extends ComponentMap {
	stationTrade: TradeComponent
	trader: TradeComponent
}

export interface ScalarTraderBlocks extends EntityUpdateComponents<ScalarTraderComponents> {
	trader: Float64Array
}

export function createScalarTraderUpdate<W extends ComponentSystemWorld = ComponentSystemWorld>(quantity: number, unitPrice: number) {
	const transactions = createScalarTradeTransactions();
	return createAIUpdate<ScalarTraderComponents, ScalarTraderBlocks, W>({
		createMemory: () => ({}),
		run(context) {
			const trader = context.components.trader;
			let targetId = trader[TraderIndex.targetStationId];
			let station = context.queries.get('stations').byId.get(targetId)?.components.stationTrade;
			if(!(station instanceof Float64Array) || station[StationTradeIndex.alive] === 0) {
				targetId = 0;
				station = undefined;
				for(const candidate of context.queries.get('stations').entities) {
					const candidateStation = candidate.components.stationTrade;
					if(candidateStation instanceof Float64Array
						&& candidateStation[StationTradeIndex.alive] !== 0
						&& candidateStation[StationTradeIndex.resourceId] === trader[TraderIndex.resourceId]) {
						targetId = candidate.entityId;
						station = candidateStation;
						break;
					}
				}
				trader[TraderIndex.targetStationId] = targetId;
			}
			if(!station) return AIStatus.failed;
			const result = transactions.buy(trader, station, quantity, unitPrice);
			if(result === TradeResult.missingTarget) trader[TraderIndex.targetStationId] = 0;
			return result === TradeResult.succeeded ? AIStatus.succeeded : AIStatus.failed;
		},
	});
}
