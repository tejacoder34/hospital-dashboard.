import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true,  // Expose on network so it can be accessed via IP from other devices
    allowedHosts: true
  }
})
