import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [ vue(), dts({
    tsconfigPath: './tsconfig.app.json',
    rollupTypes: true,
  }) ],

  build: {
    minify: true,
    sourcemap: true,
    outDir: 'dist',
    copyPublicDir: false,
    lib: {
      formats: [ 'es' ],
      entry: 'lib/index.ts',
      name: 'JuitI18n',
      fileName: 'index',
    },
    rollupOptions: {
      external: [ 'vue' ],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    include: [ 'test/**/*.test.ts' ],
    coverage: {
      provider: 'v8',
      reporter: [ 'text', 'html' ],
      reportsDirectory: 'coverage',
      cleanOnRerun: true,
      include: [ 'lib' ],
      exclude: [
        'lib/**/*.test.ts',
        'lib/editor.vue', // we always get 100% coverage???
      ],
      reportOnFailure: true,
    },
  },
})
