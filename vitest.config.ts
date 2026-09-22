import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['lib/**/*.test.ts', 'config/**/*.test.ts', 'src/**/*.test.ts'] },
});
