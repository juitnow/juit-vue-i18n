import config from '@plugjs/oxc/configs/oxlint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [config],
  env: { ...config.env }, // https://github.com/oxc-project/oxc/issues/20087
  overrides: [
    {
      files: ['test/**'],
      env: { ...config.env, browser: true },
    },
  ],
})
