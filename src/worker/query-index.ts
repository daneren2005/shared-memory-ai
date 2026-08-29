import type {
	ComponentMap,
	EntityQueryComponents,
	EntityUpdateComponents,
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

	prepare(queries: EntityQueryComponents<C>): void {
		for(const index of this.indexes.values()) {
			index.entities = this.emptyIndex.entities;
			index.byId.clear();
		}

		for(const [name, entities] of Object.entries(queries)) {
			let index = this.indexes.get(name);
			if(!index) {
				index = { entities, byId: new Map() };
				this.indexes.set(name, index);
			} else {
				index.entities = entities;
			}

			for(const entity of entities) {
				index.byId.set(entity.entityId, entity);
			}
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
