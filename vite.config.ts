import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    sourcemap: false,
    outDir: '.',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'ObsidianMediaFlowz',
      formats: ['cjs'],
      fileName: 'main'
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.ts')
      },
      external: ['obsidian', '@codemirror/state', '@codemirror/view', '@codemirror/language', 'events', 'moment'],
      output: {
        globals: {
          obsidian: 'obsidian',
          '@codemirror/state': 'State',
          '@codemirror/view': 'View',
          '@codemirror/language': 'Language',
          'events': 'events',
          'moment': 'moment'
        }
      }
    }
  },
  server: {
    port: 3000,
    open: false,
    watch: {
      ignored: ['!**/node_modules/@codemirror/**']
    }
  },
  optimizeDeps: {
    include: ['vue'],
    exclude: ['obsidian']
  }
}) 