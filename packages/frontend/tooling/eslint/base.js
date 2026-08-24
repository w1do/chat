// Базовая ESLint-конфигурация. Правило no-restricted-imports запрещает
// deep imports во внутренности других пакетов (STRUCTURE.md §9).
export default [
  {
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@vendor/*/src/*'], message: 'Только публичные exports пакета.' }] },
      ],
    },
  },
];
