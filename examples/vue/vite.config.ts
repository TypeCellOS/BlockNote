import { fileURLToPath, URL } from 'node:url'
import * as path from "path";

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig((conf) => {
  const config = {
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }}

  // Comment out the lines below to load a built version of blocknote
  // or, keep as is to load live from sources with live reload working
 if (conf.command === "build")
  Object.assign(config.resolve.alias, { 
    "@blocknote/core": path.resolve( __dirname, "../../packages/core/src/")
  })

  return config
})
