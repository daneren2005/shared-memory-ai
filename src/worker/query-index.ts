import type {
	ComponentMap,
	EntityQueryComponents,
	EntityUpdateComponents,
	QueryDelta,
	UpdateEntityConfigObject,
} from '@daneren2005/shared-memory-ecs';

export interface IndexedEntityCollection<T extends EntityUpdateComponents> {
	readonly entities: ReadonlyArray<UpdateEntityConfigObject<T>>
	readonly byId: ReadonlyMap<number, UpdateEntityConfigObject<T>>
}

interface MutableIndexedEntityCollection<T extends EntityUpdateComponents> {
	entities: ReadonlyArray<UpdateEntityConfigObject<T>>
	byId: Map<number, UpdateEntityConfigObject<T>>
}

export class EntityQueryIndex<C extends ComponentMap> {
	private readonly indexes = new Map<string, MutableIndexedEntityCollection<EntityUpdateComponents<C>>>();
	private readonly emptyIndex: IndexedEntityCollection<EntityUpdateComponents<C>> = {
		entities: [],
		byId: new Map(),
	};

	get(name: string): IndexedEntityCollection<EntityUpdateComponents<C>> {
		return this.indexes.get(name) ?? this.emptyIndex;
	}

	// Ids are kept from `apply`, so a run only rebuilds an index whose query array was swapped for another.
	prepare(queries: EntityQueryComponents<C>): void {
		for(const [name, index] of this.indexes) {
			if(!(name in queries)) {
				index.entities = this.emptyIndex.entities;
				index.byId.clear();
			}
		}

		for(const [name, entities] of Object.entries(queries)) {
			const index = this.indexes.get(name);
			if(!index) {
				this.indexes.set(name, { entities, byId: new Map(entities.map(entity => [entity.entityId, entity])) });
			} else if(index.entities !== entities) {
				index.entities = entities;
				index.byId.clear();
				for(const entity of entities) {
					index.byId.set(entity.entityId, entity);
				}
			}
		}
	}

	// Mirrors the worker's own query store: removals first, then upserts.
	apply(name: string, delta: QueryDelta<EntityUpdateComponents<C>>): void {
		const index = this.indexes.get(name);
		if(!index) {
			return;
		}
		for(const entityId of delta.removed) {
			index.byId.delete(entityId);
		}
		for(const entity of delta.added) {
			index.byId.set(entity.entityId, entity);
		}
	}

	clear(): void {
		this.indexes.clear();
	}
}

export class EntityBlockIndex<T extends EntityUpdateComponents> {
	private entityList: ReadonlyArray<UpdateEntityConfigObject<T>> = [];
	readonly byId = new Map<number, UpdateEntityConfigObject<T>>();

	get entities(): ReadonlyArray<UpdateEntityConfigObject<T>> {
		return this.entityList;
	}

	get collection(): IndexedEntityCollection<T> {
		return this;
	}

	prepare(entities: ReadonlyArray<UpdateEntityConfigObject<T>>): void {
		this.entityList = entities;
		this.byId.clear();
		for(const entity of entities) {
			this.byId.set(entity.entityId, entity);
		}
	}

	clear(): void {
		this.entityList = [];
		this.byId.clear();
	}
}
