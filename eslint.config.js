import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    indent: 'tab',
  },
  unicorn: {
    allRecommended: true,
  },
  globals: ['browser'],
  rules: {
    'no-irregular-whitespace': 'off', // We do want to use non-breaking spaces
    'jsdoc/check-alignment': 'off', // Not enough to be useful

    // Antfu style disagreements
    'regexp/no-useless-character-class': 'off', // [/] is more readable than \/
    'style/object-curly-spacing': ['error', 'never'], // Unnecessary change for now
    'style/block-spacing': ['error', 'never'], // Same
    'jsonc/array-bracket-spacing': 'off', // Same
    'style/brace-style': ['error', '1tbs'], // Naw, man
    'style/semi': ['error', 'never'],
    'style/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'semi',
        },
      },
    ],
    'style/arrow-parens': ['error', 'as-needed'],
    'prefer-template': 'off', // When there's a single `+` templates are less readable
    'style/jsx-one-expression-per-line': 'off', // Terrible for inline elements, e.g. text

    //  Disable some unicorn rules
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
    'unicorn/filename-case': 'off', // We want to keep GitHub's conventional file names
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
});
