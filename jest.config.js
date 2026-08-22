module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // roleRedirect.test.ts is a plain node:assert script (run via `tsx`), not a Jest
  // test, and it currently imports functions that don't exist yet on an in-progress
  // auth feature — importing it under Jest would crash test discovery.
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', 'src/lib/roleRedirect.test.ts'],
};
