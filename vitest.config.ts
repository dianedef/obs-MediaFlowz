import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        typecheck: {
            tsconfig: './tsconfig.vitest.json'
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            'obsidian': resolve(__dirname, './tests/mocks/obsidian.ts'),
            '@codemirror/view': resolve(__dirname, './tests/mocks/codemirror.ts')
        }
    },
    optimizeDeps: {
        exclude: ['obsidian']
    }
}); 