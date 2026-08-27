import { examples } from './examples';

const example = examples[0];
const title = requiredElement('example-title');
const description = requiredElement('example-description');
const status = requiredElement('status');
const entityCount = requiredElement('entity-count');
const gameTime = requiredElement('game-time');
const nav = requiredElement('examples');

title.textContent = example.title;
description.textContent = example.description;

const link = document.createElement('a');
link.href = `#${example.id}`;
link.className = 'active';
link.textContent = example.title;
nav.append(link);

const world = example.create();
await world.init();
status.textContent = 'Running';

let previousTime = performance.now();

function frame(time: number): void {
	world.update(time - previousTime);
	previousTime = time;
	entityCount.textContent = world.entities.size.toString();
	gameTime.textContent = `${Math.round(world.gameTime)} ms`;
	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

function requiredElement(id: string): HTMLElement {
	const element = document.getElementById(id);
	if(!element) {
		throw new Error(`The examples page is missing #${id}`);
	}

	return element;
}
