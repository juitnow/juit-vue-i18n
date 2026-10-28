import config from '@plugjs/oxc/configs/oxlint.node'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [config],
  ignorePatterns: ['test-d'],
  env: { ...config.env }, // https://github.com/oxc-project/oxc/issues/20087
  rules: {
    'no-redeclare': 'off', // When exported type and variable have the same name
  },
})
