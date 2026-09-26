import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20_000,
    // production allows 600/min per client; tests use a small limit so the 429 path runs quickly
    env: { RATE_LIMIT_PER_MIN: '60' },
  },
});
