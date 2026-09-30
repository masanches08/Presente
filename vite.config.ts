/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // host: true deixa abrir o site no celular pela mesma rede Wi-Fi
  server: { host: true },
  test: { environment: 'node' },
})
