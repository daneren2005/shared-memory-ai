export interface SliderControl {
	kind: 'slider'
	label: string
	min: number
	max: number
	step?: number
	value: number
	format?(value: number): string
	change(value: number): void
}

export interface ToggleControl {
	kind: 'toggle'
	label: string
	value: boolean
	disabled?: boolean
	note?: string
	change(value: boolean): void
}

export interface ButtonControl {
	kind: 'button'
	label: string
	press(): void
}

export type Control = SliderControl | ToggleControl | ButtonControl;

export function renderControls(container: HTMLElement, controls: Array<Control>): void {
	container.replaceChildren(...controls.map(renderControl));
}

function renderControl(control: Control): HTMLElement {
	if(control.kind === 'slider') return renderSlider(control);
	if(control.kind === 'toggle') return renderToggle(control);
	const row = document.createElement('div');
	row.className = 'control';
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = control.label;
	button.addEventListener('click', control.press);
	row.append(button);
	return row;
}

function renderSlider(control: SliderControl): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control';
	const label = document.createElement('label');
	const name = document.createElement('span');
	name.textContent = control.label;
	const value = document.createElement('output');
	value.textContent = formatValue(control, control.value);
	label.append(name, value);
	const input = document.createElement('input');
	input.type = 'range';
	input.min = String(control.min);
	input.max = String(control.max);
	input.step = String(control.step ?? 1);
	input.value = String(control.value);
	input.addEventListener('input', () => {
		const next = Number(input.value);
		value.textContent = formatValue(control, next);
		control.change(next);
	});
	row.append(label, input);
	return row;
}

function renderToggle(control: ToggleControl): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control';
	const label = document.createElement('label');
	label.className = 'toggle';
	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = control.value;
	input.disabled = control.disabled ?? false;
	input.addEventListener('change', () => control.change(input.checked));
	const name = document.createElement('span');
	name.textContent = control.label;
	label.append(input, name);
	row.append(label);
	if(control.note) {
		const note = document.createElement('p');
		note.className = 'note';
		note.textContent = control.note;
		row.append(note);
	}
	return row;
}

function formatValue(control: SliderControl, value: number): string {
	return control.format ? control.format(value) : String(value);
}
