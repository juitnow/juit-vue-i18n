import '@plugjs/cov8'
import '@plugjs/expect5'
import { oxc } from '@plugjs/oxc'
import { $p, banner, find, log, plugjs, rmrf } from '@plugjs/plug'
import { tsbuild } from '@plugjs/tsgo'

export default plugjs({
  /** Flag indicating whether linting/formatting errors should be fixed or not */
  fix: 'false',
  /** Flag indicating whether uncovered lines should be reported in coverage */
  reportUncovered: 'false',

  /** Transpile all sources and produce some JavaScript code in 'dist' */
  async transpile(): Promise<void> {
    banner('Transpiling TypeScript Sources')
    await rmrf('./dist')
    await tsbuild('./lib/tsconfig.json')
  },

  /** Check the test types for all test files */
  async types(): Promise<void> {
    banner('Checking Test Types')

    const configs = await find('./test/**/tsconfig.json')
    for (const path of configs.absolutePaths()) {
      log(`Checking Types for ${$p(path)}`)
      await tsbuild(path)
    }
  },

  /** Run all tests */
  async test(): Promise<void> {
    banner('Running Tests')
    await find('**/*.test.*', { directory: 'test' }) // find all our test files
      .test({ coverageDir: '.coverage-data' }) // run tests
  },

  /** Run tests capturing errors, but always producing coverage */
  async coverage(): Promise<void> {
    try {
      await rmrf('.coverage-data') // wipe existing coverage data
      await this.test()
    } finally {
      banner('Preparing coverage report')
      await find('**/*.ts', { directory: 'lib', ignore: 'configs/*.ts' }) //
        .coverage('.coverage-data', {
          reportUncoveredLines: this.reportUncovered === 'true',
          reportDir: 'coverage',
          minimumCoverage: 100,
          minimumFileCoverage: 100,
        })
    }
  },

  /** Format and lint all our sources (optionally fixing them) */
  async lint(): Promise<void> {
    banner('Linting Sources')
    await oxc({ fix: this.fix === 'true' })
  },

  async default(): Promise<void> {
    await this.transpile()
    await this.types()
    await this.coverage()
    await this.lint()
  },
})
