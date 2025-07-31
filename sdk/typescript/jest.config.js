module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/index.ts',
    '!src/__tests__/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/instruction-processor.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './src/security-validator.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './src/template-engine.ts': {
      branches: 80,
      functions: 85,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: '50%',
  
  // Test categorization
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/*.test.ts',
        '<rootDir>/src/__tests__/instruction-processor.test.ts',
        '<rootDir>/src/__tests__/template-engine.test.ts',
        '<rootDir>/src/__tests__/security-validator.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/src/__tests__/integration.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    },
    {
      displayName: 'performance',
      testMatch: [
        '<rootDir>/src/__tests__/performance.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testTimeout: 60000
    },
    {
      displayName: 'security',
      testMatch: [
        '<rootDir>/src/__tests__/security-focused.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    }
  ],

  // Performance monitoring
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      suiteName: 'Dandolo Agent SDK Tests'
    }],
    ['jest-html-reporters', {
      publicPath: 'coverage',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Dandolo Agent SDK Test Report'
    }]
  ],

  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }
  },

  // Memory and performance settings
  workerIdleMemoryLimit: '1GB',
  detectOpenHandles: true,
  detectLeaks: false,
  forceExit: false,

  // Test result processing
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/',
    '/coverage/'
  ]
};