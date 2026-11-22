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
    collectCoverageFrom: [
        'assets/scripts/core/**/*.ts',
        'assets/scripts/game/layout/**/*.ts',
        'assets/scripts/game/TileUtil.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text-summary', 'html'],
    coverageThreshold: {
        global: { statements: 95, branches: 90, functions: 95, lines: 95 }
    }
};
