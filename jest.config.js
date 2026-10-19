/**
 * Jest runs on the Electron runtime (`ELECTRON_RUN_AS_NODE=1`) so native
 * modules such as better-sqlite3 load with the ABI they were built for.
 * See the `test` script in package.json.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  clearMocks: true
}
