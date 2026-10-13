import path from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // Worktrees de outras changes (.claude/worktrees) têm a própria suíte.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
