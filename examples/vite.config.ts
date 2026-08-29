import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const library = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const workerLibrary = fileURLToPath(new URL('../src/worker.ts', import.meta.url));
const base = process.env.EXAMPLES_BASE ?? '/';

const server = {
	host: '127.0.0.1',
	port: 8080,
	headers: {
		'Cross-Origin-Opener-Policy': 'same-origin',
		'Cross-Origin-Embedder-Policy': 'require-corp',
	},
};

export default defineConfig({
	root,
	base,
	resolve: {
		alias: [
			{ find: '@daneren2005/shared-memory-ai/worker', replacement: workerLibrary },
			{ find: '@daneren2005/shared-memory-ai', replacement: library },
		],
	},
	server,
	preview: server,
});
