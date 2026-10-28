import { oxc } from '@plugjs/oxc'
import { banner, plugjs, rmrf } from '@plugjs/plug'
import { tsbuild } from '@plugjs/tsgo'

export default plugjs({
  /** Flag indicating whether linting/formatting errors should be fixed or not */
  fix: 'false',

  /** Transpile all sources and produce some JavaScript code in 'dist' */
  async transpile(): Promise<void> {
    banner('Transpiling TypeScript Sources')
    await rmrf('./dist')
    await tsbuild('./lib/tsconfig.json')
  },

  /** Format and lint all our sources (optionally fixing them) */
  async lint(): Promise<void> {
    banner('Linting Sources')
    await oxc({ fix: this.fix === 'true' })
  },

  async default(): Promise<void> {
    await this.transpile()
    await this.lint()
  },
})
