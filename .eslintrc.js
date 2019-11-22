module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  extends: [
    // Base ESLint recommended rules
    'eslint:recommended',
    // ESLint typescript rules
    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#usage
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    // Prettier, provided by 'eslint-config-prettier'.
    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#usage-with-prettier
    'prettier',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  plugins: [
    // Required to apply rules which need type information
    '@typescript-eslint'
  ],
  rules: {
  //   'require-atomic-updates': 'off',
  //   '@typescript-eslint/explicit-function-return-type': 'off',
    // '@typescript-eslint/camelcase': 'off',
  },
}
