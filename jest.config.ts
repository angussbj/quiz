import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
    '\\.svg(\\?react)?$': '<rootDir>/src/test-support/svgMock.ts',
    '^@/utilities/assetPath$': '<rootDir>/src/test-support/assetPathMock.ts',
    '(.*)/utilities/assetPath$': '<rootDir>/src/test-support/assetPathMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-support/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};

export default config;
