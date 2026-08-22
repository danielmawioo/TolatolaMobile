module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // roleRedirect.test.ts is a plain node:assert script (run via `tsx`), not a Jest
  // test, and it currently imports functions that don't exist yet on an in-progress
  // auth feature — importing it under Jest would crash test discovery.
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.claude/worktrees/', 'src/lib/roleRedirect.test.ts'],
  // Raised each time real coverage grows — lower it only if you can point to
  // why (e.g. a large batch of new UI surface landed faster than its tests).
  coverageThreshold: {
    global: {
      statements: 68,
      branches: 58,
      functions: 63,
      lines: 70,
    },
  },
};
