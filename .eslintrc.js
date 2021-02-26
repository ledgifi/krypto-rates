module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: [
      './tsconfig.eslint.json',
      './packages/*/tsconfig.json',
      './clients/*/tsconfig.json',
    ],
  },
  extends: [
    // Base ESLint recommended rules
    'eslint:recommended',
    // ESLint typescript rules
    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#usage
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    // Prettier
    'plugin:prettier/recommended',
  ],
  plugins: [
    // Required to apply rules which need type information
    '@typescript-eslint',
  ],
  rules: {
    // @typescript-eslint
    '@typescript-eslint/no-unsafe-assignment': 'off',
  },
}
