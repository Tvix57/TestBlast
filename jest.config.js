/** Автотесты логики (assets/scripts/core) — движок Cocos не нужен. */
/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    /** Минимальный `cc` для тестов чистой логики компонентов (без движка). */
    setupFiles: ['<rootDir>/tests/cc-stub.js'],
    clearMocks: true,
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: ['assets/scripts/core/**/*.ts'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text-summary', 'html']
};
