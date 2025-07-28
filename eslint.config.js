import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        crypto: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        AbortController: 'readonly',
        performance: 'readonly',
        localStorage: 'readonly',
        confirm: 'readonly',
        NodeFilter: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        navigator: 'readonly',
        Blob: 'readonly',
        CustomEvent: 'readonly',
        atob: 'readonly',
        TextEncoder: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^[A-Z]' // Ignore Pascal-case variables (React components)
      }],
      'no-console': 'warn',
      'no-undef': 'error',
      'no-control-regex': 'off', // Allow control characters in regex for ANSI parsing
      'no-case-declarations': 'error'
    }
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'proxy/**']
  }
];