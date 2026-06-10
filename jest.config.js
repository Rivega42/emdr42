/**
 * Jest конфигурация для Next.js фронтенд-уровня (#150).
 *
 * Использует next/jest для автоматической подгрузки tsconfig paths, SWC и
 * .env. JSDOM-окружение для тестов React-компонентов и hooks.
 *
 * Backend-тесты живут в своих пакетах (services/api, services/orchestrator,
 * packages/*) и имеют собственные jest-конфиги — этот файл туда не лезет
 * (исключает услуги через testPathIgnorePatterns).
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/services/', '/packages/', '/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/hooks/**/*.{ts,tsx}',
    'lib/schemas/**/*.ts',
    'contexts/**/*.tsx',
    'components/**/*.tsx',
    '!**/node_modules/**',
    '!**/*.d.ts',
    '!**/*.stories.tsx',
  ],
};

module.exports = createJestConfig(customJestConfig);
