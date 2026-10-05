import process from 'node:process';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  reporter: 'list',
  use: {
    viewport: { width: 1280, height: 800 },
  },
});
