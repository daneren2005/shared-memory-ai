import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const library = fileURLToPath(new URL('./src/index.ts', import.meta.url));
const workerLibrary = fileURLToPath(new URL('./src/worker.ts', import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			{ find: '@daneren2005/shared-memory-ai/worker', replacement: workerLibrary },
			{ find: '@daneren2005/shared-memory-ai', replacement: library },
		],
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.spec.ts'],
		setupFiles: ['@vitest/web-worker'],
	},
});
