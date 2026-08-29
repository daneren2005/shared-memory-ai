import {
	AIControllerIndex,
	PatrolChaseState,
	PatrolChaseStateNames,
	PatrolIndex,
} from '../../src/__tests__/examples/patrol-chase';
import { DesiredMovementIndex, TransformIndex } from '../../src/__tests__/examples/movement';
import { StationTradeIndex, TraderIndex } from '../../src/__tests__/examples/trader';
import { AttackPhaseNames, AttackStateIndex, HealthIndex } from '../../src/__tests__/examples/attack';

import { VIEW_HEIGHT, VIEW_WIDTH } from './example';
import type { ExampleRuntime } from './example';

export interface RenderHost {
	readonly runtime: ExampleRuntime | undefined
	step(elapsedTime: number): void
	pointerDown(x: number, y: number): void
}

export function startRenderer(canvas: HTMLCanvasElement, host: RenderHost): void {
	canvas.width = VIEW_WIDTH;
	canvas.height = VIEW_HEIGHT;
	const context = canvas.getContext('2d');
	if(!context) throw new Error('Canvas 2D is unavailable');
	const drawingContext: CanvasRenderingContext2D = context;

	canvas.addEventListener('pointerdown', event => {
		const bounds = canvas.getBoundingClientRect();
		host.pointerDown(
			(event.clientX - bounds.left) * VIEW_WIDTH / bounds.width,
			(event.clientY - bounds.top) * VIEW_HEIGHT / bounds.height,
		);
	});

	let previousTime = performance.now();
	function frame(time: number): void {
		const elapsedTime = Math.min(time - previousTime, 100);
		previousTime = time;
		host.step(elapsedTime);
		render(drawingContext, host.runtime);
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}

function render(context: CanvasRenderingContext2D, runtime: ExampleRuntime | undefined): void {
	context.fillStyle = '#0B1120';
	context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
	drawGrid(context);
	if(runtime?.kind === 'trader') {
		renderTrader(context, runtime);
		return;
	}
	if(runtime?.kind === 'attack') {
		renderAttack(context, runtime);
		return;
	}
	if(!runtime?.agent || !runtime.player) {
		context.fillStyle = '#64748B';
		context.font = '16px ui-sans-serif, system-ui';
		context.textAlign = 'center';
		context.fillText(runtime ? 'This example has no entities.' : 'Starting workers…', VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
		return;
	}

	const agentTransform = runtime.agent.components.transform?.block;
	const playerTransform = runtime.player.components.transform?.block;
	const patrol = runtime.agent.components.patrol?.block;
	const controller = runtime.agent.components.aiController?.block;
	const desired = runtime.agent.components.desiredMovement?.block;
	if(!agentTransform || !playerTransform || !patrol || !controller || !desired) return;

	const agentX = agentTransform[TransformIndex.x];
	const agentY = agentTransform[TransformIndex.y];
	const playerX = playerTransform[TransformIndex.x];
	const playerY = playerTransform[TransformIndex.y];
	const state = controller[AIControllerIndex.state];

	context.save();
	context.setLineDash([8, 8]);
	context.strokeStyle = '#334155';
	context.lineWidth = 2;
	context.beginPath();
	context.moveTo(patrol[PatrolIndex.firstX], patrol[PatrolIndex.firstY]);
	context.lineTo(patrol[PatrolIndex.secondX], patrol[PatrolIndex.secondY]);
	context.stroke();
	context.restore();

	drawEndpoint(context, patrol[PatrolIndex.firstX], patrol[PatrolIndex.firstY]);
	drawEndpoint(context, patrol[PatrolIndex.secondX], patrol[PatrolIndex.secondY]);

	context.strokeStyle = state === PatrolChaseState.chase ? '#FB7185' : '#38BDF8';
	context.globalAlpha = 0.28;
	context.beginPath();
	context.arc(agentX, agentY, Math.sqrt(patrol[PatrolIndex.aggroDistanceSquared]), 0, Math.PI * 2);
	context.stroke();
	context.globalAlpha = 1;

	context.strokeStyle = '#FBBF24';
	context.lineWidth = 1.5;
	context.beginPath();
	context.moveTo(agentX, agentY);
	context.lineTo(desired[DesiredMovementIndex.x], desired[DesiredMovementIndex.y]);
	context.stroke();
	drawCross(context, desired[DesiredMovementIndex.x], desired[DesiredMovementIndex.y]);

	drawPlayer(context, playerX, playerY);
	drawAgent(context, agentX, agentY, state);

	context.fillStyle = '#CBD5E1';
	context.font = '13px ui-sans-serif, system-ui';
	context.textAlign = 'left';
	context.fillText(`AI: ${PatrolChaseStateNames[state] ?? 'unknown'}`, 18, 26);
	context.fillStyle = '#94A3B8';
	context.fillText('Click anywhere to reposition the player', 18, VIEW_HEIGHT - 18);
}

function renderTrader(context: CanvasRenderingContext2D, runtime: ExampleRuntime): void {
	const trader = runtime.agent?.components.trader?.block;
	const traderTransform = runtime.agent?.components.transform?.block;
	const station = runtime.stations?.[0]?.components.stationTrade?.block;
	const stationTransform = runtime.stations?.[0]?.components.transform?.block;
	if(!trader || !traderTransform || !station || !stationTransform) return;

	context.strokeStyle = '#334155';
	context.lineWidth = 3;
	context.beginPath();
	context.moveTo(traderTransform[0], traderTransform[1]);
	context.lineTo(stationTransform[0], stationTransform[1]);
	context.stroke();
	drawLabeledCircle(context, traderTransform[0], traderTransform[1], 34, '#38BDF8', 'TRADER');
	drawLabeledCircle(context, stationTransform[0], stationTransform[1], 48, '#A78BFA', 'STATION');

	context.fillStyle = '#E2E8F0';
	context.font = '15px ui-sans-serif, system-ui';
	context.textAlign = 'center';
	context.fillText(`credits ${trader[TraderIndex.credits]}`, traderTransform[0], traderTransform[1] + 64);
	context.fillText(
		`cargo ${trader[TraderIndex.cargoQuantity]} / ${trader[TraderIndex.capacity]}`,
		traderTransform[0],
		traderTransform[1] + 86,
	);
	context.fillText(`credits ${station[StationTradeIndex.credits]}`, stationTransform[0], stationTransform[1] + 76);
	context.fillText(`stock ${station[StationTradeIndex.stockQuantity]}`, stationTransform[0], stationTransform[1] + 98);
	context.fillStyle = '#94A3B8';
	context.fillText('One unit transfers every AI tick after all transaction preconditions pass.', VIEW_WIDTH / 2, 34);
}

function renderAttack(context: CanvasRenderingContext2D, runtime: ExampleRuntime): void {
	const attackerTransform = runtime.agent?.components.transform?.block;
	const attackState = runtime.agent?.components.attackState?.block;
	const desired = runtime.agent?.components.desiredMovement?.block;
	const targetTransform = runtime.target?.components.transform?.block;
	const health = runtime.target?.components.health?.block;
	if(!attackerTransform || !attackState || !desired || !targetTransform || !health) return;

	context.strokeStyle = '#FBBF24';
	context.beginPath();
	context.moveTo(attackerTransform[0], attackerTransform[1]);
	context.lineTo(desired[0], desired[1]);
	context.stroke();
	drawAgent(context, attackerTransform[0], attackerTransform[1], 1);
	drawLabeledCircle(context, targetTransform[0], targetTransform[1], 28, '#FB7185', 'TARGET');
	const healthRatio = Math.max(0, health[HealthIndex.current]) / 100;
	context.fillStyle = '#1E293B';
	context.fillRect(targetTransform[0] - 50, targetTransform[1] - 58, 100, 9);
	context.fillStyle = '#4ADE80';
	context.fillRect(targetTransform[0] - 50, targetTransform[1] - 58, 100 * healthRatio, 9);
	context.fillStyle = '#CBD5E1';
	context.font = '14px ui-sans-serif, system-ui';
	context.textAlign = 'left';
	context.fillText(`Attack phase: ${AttackPhaseNames[attackState[AttackStateIndex.phase]] ?? 'unknown'}`, 18, 26);
	context.fillStyle = '#94A3B8';
	context.fillText('Click to reposition the target and exercise move, retreat, and strike phases.', 18, VIEW_HEIGHT - 18);
}

function drawLabeledCircle(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	color: string,
	label: string,
): void {
	context.fillStyle = color;
	context.beginPath();
	context.arc(x, y, radius, 0, Math.PI * 2);
	context.fill();
	context.fillStyle = '#F8FAFC';
	context.font = '12px ui-sans-serif, system-ui';
	context.textAlign = 'center';
	context.fillText(label, x, y + 4);
}

function drawGrid(context: CanvasRenderingContext2D): void {
	context.strokeStyle = '#172033';
	context.lineWidth = 1;
	for(let x = 0; x <= VIEW_WIDTH; x += 40) {
		context.beginPath();
		context.moveTo(x, 0);
		context.lineTo(x, VIEW_HEIGHT);
		context.stroke();
	}
	for(let y = 0; y <= VIEW_HEIGHT; y += 40) {
		context.beginPath();
		context.moveTo(0, y);
		context.lineTo(VIEW_WIDTH, y);
		context.stroke();
	}
}

function drawEndpoint(context: CanvasRenderingContext2D, x: number, y: number): void {
	context.fillStyle = '#475569';
	context.beginPath();
	context.arc(x, y, 7, 0, Math.PI * 2);
	context.fill();
}

function drawCross(context: CanvasRenderingContext2D, x: number, y: number): void {
	context.strokeStyle = '#FBBF24';
	context.beginPath();
	context.moveTo(x - 6, y - 6);
	context.lineTo(x + 6, y + 6);
	context.moveTo(x + 6, y - 6);
	context.lineTo(x - 6, y + 6);
	context.stroke();
}

function drawPlayer(context: CanvasRenderingContext2D, x: number, y: number): void {
	context.fillStyle = '#A78BFA';
	context.beginPath();
	context.arc(x, y, 14, 0, Math.PI * 2);
	context.fill();
	context.fillStyle = '#F8FAFC';
	context.font = '11px ui-sans-serif, system-ui';
	context.textAlign = 'center';
	context.fillText('PLAYER', x, y - 22);
}

function drawAgent(context: CanvasRenderingContext2D, x: number, y: number, state: number): void {
	context.fillStyle = state === PatrolChaseState.chase ? '#FB7185' : '#38BDF8';
	context.beginPath();
	context.moveTo(x + 18, y);
	context.lineTo(x - 13, y - 12);
	context.lineTo(x - 13, y + 12);
	context.closePath();
	context.fill();
}
