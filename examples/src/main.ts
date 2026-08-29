import { AIControllerIndex, PatrolChaseStateNames } from '../../src/__tests__/examples/patrol-chase';
import { AttackPhaseNames, AttackStateIndex, HealthIndex } from '../../src/__tests__/examples/attack';
import { StationTradeIndex, TraderIndex } from '../../src/__tests__/examples/trader';
import { renderControls } from './controls';
import type { Control } from './controls';
import type { Example, ExampleHost, ExampleRuntime } from './example';
import { examples, findExample } from './examples';
import { startRenderer } from './renderer';

const STATS_INTERVAL_MS = 250;

class ExamplesPage implements ExampleHost {
	runtime: ExampleRuntime | undefined;
	private example: Example = examples[0];
	private useWorker = crossOriginIsolated;
	private build = 0;
	private frames = 0;
	private sinceStats = 0;

	constructor(private readonly elements: PageElements) {
		for(const example of examples) {
			const link = document.createElement('a');
			link.href = `#${example.id}`;
			link.textContent = example.title;
			link.dataset.example = example.id;
			elements.nav.append(link);
		}
	}

	select(example: Example): void {
		this.example = example;
		this.elements.title.textContent = example.title;
		this.elements.description.textContent = example.description;
		for(const link of this.elements.nav.children) {
			link.classList.toggle('active', link instanceof HTMLElement && link.dataset.example === example.id);
		}
		renderControls(this.elements.exampleControls, example.controls(this));
		renderControls(this.elements.simulationControls, this.simulationControls());
		this.restart();
	}

	restart(): void {
		this.buildWorld().catch(error => console.error('Failed to build example world', error));
	}

	pointerDown(x: number, y: number): void {
		if(this.runtime) this.example.pointerDown?.(this.runtime, x, y);
	}

	step(elapsedTime: number): void {
		if(!this.runtime) return;
		this.runtime.world.update(elapsedTime);
		this.frames++;
		this.sinceStats += elapsedTime;
		if(this.sinceStats >= STATS_INTERVAL_MS) {
			this.renderStats();
			this.frames = 0;
			this.sinceStats = 0;
		}
	}

	private async buildWorld(): Promise<void> {
		const build = ++this.build;
		this.runtime?.world.destroy();
		this.runtime = undefined;
		const runtime = this.example.create({ forceMainThread: !this.useWorker });
		await runtime.world.init();
		if(build !== this.build) {
			runtime.world.destroy();
			return;
		}
		this.runtime = runtime;
		this.renderStats();
	}

	private simulationControls(): Array<Control> {
		return [
			{
				kind: 'toggle',
				label: 'Run systems in workers',
				value: this.useWorker,
				disabled: !crossOriginIsolated,
				note: crossOriginIsolated ? undefined : 'SharedArrayBuffer is unavailable, so the same updates run on the main thread.',
				change: value => {
					this.useWorker = value;
					this.restart();
				},
			},
			{ kind: 'button', label: 'Restart', press: () => this.restart() },
		];
	}

	private renderStats(): void {
		const runtime = this.runtime;
		if(!runtime) return;
		const controller = runtime.agent?.components.aiController?.block;
		const rows: Record<string, string> = {
			fps: this.sinceStats > 0 ? Math.round(this.frames * 1_000 / this.sinceStats).toString() : '—',
			entities: runtime.world.entities.size.toString(),
			memory: crossOriginIsolated ? 'shared' : 'not shared',
			'AI system': systemThread(runtime),
			'movement system': runtime.movementSystem ? (runtime.movementSystem.isWorkerThread ? 'worker' : 'main thread') : 'not running',
		};
		if(runtime.kind === 'patrol') {
			rows['AI state'] = controller ? (PatrolChaseStateNames[controller[AIControllerIndex.state]] ?? 'unknown') : '—';
			rows.target = controller?.[AIControllerIndex.targetEntityId]?.toString() ?? '—';
		} else if(runtime.kind === 'trader') {
			const trader = runtime.agent?.components.trader?.block;
			const station = runtime.stations?.[0]?.components.stationTrade?.block;
			rows.cargo = trader ? `${trader[TraderIndex.cargoQuantity]} / ${trader[TraderIndex.capacity]}` : '—';
			rows.stock = station?.[StationTradeIndex.stockQuantity]?.toString() ?? '—';
		} else {
			const state = runtime.agent?.components.attackState?.block;
			const health = runtime.target?.components.health?.block;
			rows.phase = state ? (AttackPhaseNames[state[AttackStateIndex.phase]] ?? 'unknown') : '—';
			rows.health = health?.[HealthIndex.current]?.toString() ?? '—';
		}
		this.elements.stats.replaceChildren(...Object.entries(rows).flatMap(([label, value]) => {
			const term = document.createElement('dt');
			term.textContent = label;
			const description = document.createElement('dd');
			description.textContent = value;
			return [term, description];
		}));
	}
}

function systemThread(runtime: ExampleRuntime): string {
	const system = runtime.aiSystem ?? runtime.traderSystem ?? runtime.attackSystem;
	return system ? (system.isWorkerThread ? 'worker' : 'main thread') : 'not running';
}

interface PageElements {
	nav: HTMLElement
	title: HTMLElement
	description: HTMLElement
	exampleControls: HTMLElement
	simulationControls: HTMLElement
	stats: HTMLElement
	canvas: HTMLCanvasElement
}

function requiredElement<T extends HTMLElement>(id: string, type: { new(): T }): T {
	const element = document.getElementById(id);
	if(!(element instanceof type)) throw new Error(`The examples page is missing #${id}`);
	return element;
}

const elements: PageElements = {
	nav: requiredElement('examples', HTMLElement),
	title: requiredElement('example-title', HTMLElement),
	description: requiredElement('example-description', HTMLElement),
	exampleControls: requiredElement('example-controls', HTMLElement),
	simulationControls: requiredElement('simulation-controls', HTMLElement),
	stats: requiredElement('stats', HTMLElement),
	canvas: requiredElement('game', HTMLCanvasElement),
};
const page = new ExamplesPage(elements);

function selectFromHash(): void {
	page.select(findExample(location.hash.slice(1)) ?? examples[0]);
}

window.addEventListener('hashchange', selectFromHash);
selectFromHash();
startRenderer(elements.canvas, page);
