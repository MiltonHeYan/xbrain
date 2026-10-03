import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/client/**/*.test.tsx'],
    setupFiles: ['tests/client/setup.ts'],
    restoreMocks: true,
  },
});
