import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), nodeResolve({ preferBuiltins: true }), commonjs()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.js')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          hudPreload:         resolve(__dirname, 'src/preload/hud-preload.js'),
          testPanelPreload:   resolve(__dirname, 'src/preload/test-panel-preload.js'),
          configPreload:      resolve(__dirname, 'src/preload/config-preload.js'),
          visualizerPreload:  resolve(__dirname, 'src/preload/visualizer-preload.js')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    css: {
      postcss: {
        plugins: []
      }
    },
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: {
          hud:        resolve(__dirname, 'src/renderer/hud/index.html'),
          testPanel:  resolve(__dirname, 'src/renderer/test-panel/index.html'),
          config:     resolve(__dirname, 'src/renderer/config/index.html'),
          visualizer: resolve(__dirname, 'src/renderer/visualizer/index.html')
        }
      }
    }
  }
})
