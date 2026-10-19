/**
 * Jest runs on the Electron runtime (`ELECTRON_RUN_AS_NODE=1`) so native
 * modules such as better-sqlite3 load with the ABI they were built for.
 * See the `test` script in package.json.
 *
 * The main process runs on `node`; the renderer runs on `jsdom` with Testing
 * Library. Each project carries its own tsconfig for ts-jest.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  projects: [
    {
      displayName: 'main',
      testEnvironment: 'node',
      roots: ['<rootDir>/src/main'],
      testMatch: ['**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }]
      },
      moduleFileExtensions: ['ts', 'js', 'json', 'node'],
      clearMocks: true
    },
    {
      displayName: 'renderer',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src/renderer'],
      testMatch: ['**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/renderer/src/test/setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.renderer-test.json' }]
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
      clearMocks: true
    }
  ]
}
