export interface EntityMemoryStore<M> {
	get(entityId: number): M
	getIfPresent(entityId: number): M | undefined
	remove(entityId: number): boolean
	reset(): void
	readonly size: number
}

export function createEntityMemoryStore<M>(createMemory: (entityId: number) => M): EntityMemoryStore<M> {
	const memoryByEntity = new Map<number, M>();

	return {
		get(entityId) {
			let memory = memoryByEntity.get(entityId);
			if(!memoryByEntity.has(entityId)) {
				memory = createMemory(entityId);
				memoryByEntity.set(entityId, memory);
			}
			return memory as M;
		},
		getIfPresent: entityId => memoryByEntity.get(entityId),
		remove: entityId => memoryByEntity.delete(entityId),
		reset: () => memoryByEntity.clear(),
		get size() {
			return memoryByEntity.size;
		},
	};
}
