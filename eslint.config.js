import antfu from '@antfu/eslint-config';

export default antfu(
  {
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: 'always',
    },
    unicorn: {
      allRecommended: true,
    },
    globals: [
      'browser',
    ],
    rules: {
      'no-irregular-whitespace': 'off', // We do want to use non-breaking spaces
      'jsdoc/check-alignment': 'off', // Not enough to be useful

      // Antfu style disagreements
      'regexp/no-useless-character-class': 'off', // [/] is more readable than \/
      'style/object-curly-spacing': ['error', 'always'],
      'style/block-spacing': ['error', 'always'],
      'style/brace-style': ['error', '1tbs'],
      'style/semi': ['error', 'always'],
      'style/operator-linebreak': ['error', 'after'],
      'style/indent-binary-ops': ['error', 2],
      'style/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'semi',
          requireLast: true,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
      }],
      'unicorn/filename-case': 'off',
      'no-console': 'off',

      // Unicorn rules
      'unicorn/expiring-todo-comments': 'off', // We just got too many, too much noise
      'unicorn/no-nested-ternary': 'off',
      'unicorn/better-regex': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prefer-dom-node-dataset': 'off',
      'unicorn/prefer-ternary': 'off', // Unreadable https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1633
      'unicorn/prevent-abbreviations': [
        'error',
        {
          replacements: {
            props: false,
            ref: false,
            nav: false,
          },
        },
      ],

      // Restore errors
      'no-await-in-loop': 'error',
      'new-cap': [
        'error',
        {
          newIsCap: true,
          capIsNew: true,
        },
      ],
    },
  },
);
