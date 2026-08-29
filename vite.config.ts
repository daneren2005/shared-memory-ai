import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: {
				index: 'src/index.ts',
				worker: 'src/worker.ts',
			},
			formats: ['es'],
			fileName: (_format, entryName) => `${entryName}.js`,
		},
		sourcemap: true,
		rollupOptions: {
			external: [
				/^@daneren2005\/shared-memory-ecs(\/.*)?$/,
			],
		},
	},
});
