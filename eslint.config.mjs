import configurations from '@plugjs/eslint-plugin'
import vuePlugin from 'eslint-plugin-vue'
import * as espree from 'espree'
import vueParser from 'vue-eslint-parser'

export default [
  // ===== GENERAL JS/TS CONFIGURATIONS FROM PLUGJS AND VUE ====================

  // Any config for TS also applies to VUE files
  ...configurations.map((config) => {
    if (config.files?.includes('**/*.ts')) config.files.push('**/*.vue')
    return config
  }),

  // All VUE configurations are restricted to ".vue" files
  ...vuePlugin.configs['flat/recommended'].map((config) => {
    config.files = [ '**/*.vue' ]
    return config
  }),

  // ===== PARSERS CONFIGURATION FOR VUE ========================================

  // Set the *default* parser, for all files, to be specifically the VUE parser
  // backed by TypeScript ESLint's own parser (all our .vue are in TypeScript)
  {
    name: 'local/parser/vue',
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        extraFileExtensions: [ '.vue' ],
        parser: '@typescript-eslint/parser',
      },
    },

    rules: {
      // This requires "projects", and "projects" doubles the linting time
      '@typescript-eslint/no-floating-promises': [ 'off' ],
    },
  },

  // Specifically for JavaScript files, use the default "espree" parser, as
  // JavaScript sources (like this file) are not present in "tsconfig.json".
  {
    name: 'local/parser/js',
    files: [ '**/*.mjs', '**/*.cjs', '**/*.js' ],
    languageOptions: {
      parser: espree,
    },
  },

  // ===== PROJECT LOCAL CONFIGURATIONS ========================================

  {
    name: 'local/rules',
    rules: {
      // Unhandled rejections are handled by Sentry / DOM
      '@typescript-eslint/no-floating-promises': [ 'off' ],
    },
  },

  {
    name: 'local/rules/vue',
    files: [ '**/*.vue' ],
    rules: {
      // We don't care about "multiple words" in components
      'vue/multi-word-component-names': [ 'off' ],
      // Either 3 attributes on a single line, or all attributes on newlines!
      'vue/max-attributes-per-line': [ 'warn', {
        'singleline': 3,
      } ],
      // No unused variables, ever
      'vue/no-unused-vars': 'error',
    },
  },

  // ===== IGNORED FILES =======================================================
  // REMEMBER! Ignores *must* be in its own configuration, they can not coexist
  // with "rules", "languageOptions", "files", ... or anything else, otherwise
  // ESLint will blaantly ignore the ignore files!
  {
    name: 'local/ignores',
    ignores: [
      'dist/',
      'demo/',
      'public/',
    ],
  },
]
