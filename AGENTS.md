# Using and maintaining @juit/vue-i18n

This is a small Vue 3 internationalization library built around native `Intl`
APIs. Keep it small: full locale negotiation, CLDR plural rules, and a richer
message syntax are outside its intended scope. Read `README.md` for public API
examples and `package.json` for current dependencies and commands.

## Guidance for consumer applications

Use this section when helping an application adopt the package. The source map
and verification commands below apply to maintaining this repository; use the
consumer application's own build and test commands when working there.

### Install and configure

- Install with `npm install @juit/vue-i18n` and use a compatible Vue 3 version
  (see `peerDependencies` in `package.json`). The package exports ESM and relies
  on native `Intl` APIs, including `Intl.supportedValuesOf`; it provides no
  polyfills.
- Import runtime APIs and types from `@juit/vue-i18n`. Do not import internal
  `lib/` files or use `makeTranslator` in consumer code.
- Register `app.use(i18n, options)` before mounting the app. `defaultLanguage`
  is required; provide a translation in its base language for each message.
- Language selection is explicit. For browser preferences, use
  `new LanguageMatcher(['en', 'de']).match(navigator.languages)` and pass the
  result as `defaultLanguage`. Access `navigator` only in browser code; on the
  server, pass preferences obtained from the request or a configured default.

Prefer a configuration module that exports the actual runtime options and
derives key types from its message dictionary:

```ts
import type { I18nOptions, Translations } from '@juit/vue-i18n'

const translations = {
  hello: { en: 'Hello, {name}!', de: 'Hallo, {name}!' },
  cats: { en: ['one cat', '{n} cats'], de: ['eine Katze', '{n} Katzen'] },
} as const satisfies Translations

declare module '@juit/vue-i18n' {
  interface I18nConfiguration {
    languages: 'en' | 'de'
    translationKeys: keyof typeof translations
  }
}

export const i18nOptions = {
  defaultLanguage: 'en',
  translations,
} satisfies I18nOptions
```

Import `i18nOptions` in the app entry point and pass it to `app.use(i18n,
i18nOptions)`. Keep the augmentation in a module included by the application's
TypeScript configuration. Declaration merging supplies compile-time checks;
it does not register translations or formats at runtime. For custom formats,
use `satisfies DateTimeFormats` / `satisfies NumberFormats`, derive the
corresponding configuration unions with `keyof typeof`, and pass those same
dictionaries to the plugin. See [Configuring Types](README.md#configuring-types).

### Use the translator

- Call `useTranslator()` inside component setup or another valid Vue injection
  context. For ordinary helper functions, pass the translator as an argument
  instead of calling the composable at module scope.
- Use `translator.t('hello', { name: 'Alice' })`, `translator.tc('cats', count)`,
  `translator.n(amount, 'EUR')`, and `translator.d(date, 'shortDate')`.
  Templates expose the same methods as `$t`, `$tc`, `$n`, and `$d`.
- Keep translated text in templates or a `computed(() => translator.t(...))`
  when it must follow locale changes. A string translated once during setup
  does not update itself. Read `translator.language` / `region` / `locale`
  through the reactive object rather than destructuring their current values.
- Change locale through those properties. Only language and region are
  supported; the message syntax and plural rules below are intentionally basic.
- Prefer tuples when messages contain literal pipes. Use `as const satisfies
  Translations` to retain tuple and key inference. Parameters accept strings
  and numbers; translations produce plain strings, not Vue components.
- For asynchronously loaded messages, use `updateTranslations(...)`
  rather than mutating the original dictionary. Updates invalidate computed
  translations and schedule component renders; await `nextTick()` before
  reading the updated DOM.
- For server rendering, initialize a translator per app/request. Choose
  matching initial locales and explicit time zones on server and client when
  formatted output must agree.

## Repository layout

- `lib/index.ts`: public exports, configuration types, Vue plugin installation,
  `useTranslator()`, component global types, and `LanguageMatcher`.
- `lib/translator.ts`: reactive locale state, translation parsing and caching,
  number/date formatting, and translation updates. `makeTranslator` is an
  internal factory; it is not a runtime export of the package entry point.
- `lib/iso-639.ts`, `lib/iso-3166.ts`, `lib/iso-4217.ts`: reference types,
  frozen code arrays, and type guards.
- `test/01-i18n.test.ts`: translator and reference-data runtime tests, creating
  translators through the public plugin and a mounted component.
- `test/02-app.test.ts`: Vue plugin, injection, and component global tests.
- `test/jsdom-vue.ts`: custom Vue renderer backed by an explicit JSDOM document;
  `createJSDomApp` supports element and selector mount targets.
- `test/03-matcher.test.ts`: matcher runtime and type assertions.
- `test/types/default/` and `test/types/configured/`: separate compiler-only
  projects for default and augmented types.
- `test/data/`: authoritative fixtures for this repository's country and
  language tables. See its README for provenance.

- `build.ts`: PlugJS tasks for compilation, type checks, tests, coverage, and lint.
- `tsconfig.options.json`: shared strict NodeNext compiler options;
  `lib/tsconfig.json` emits ESM, declarations, and maps into `dist/`.
- `test/tsconfig.json` and `test/types/*/tsconfig.json`: test type checks.
- `oxlint.config.ts` and `oxfmt.config.ts`: lint and formatting configuration.

## Development workflow

The build uses PlugJS, `@plugjs/tsgo`, `@plugjs/expect5`, `@plugjs/cov8`,
and `@plugjs/oxc`. Use the tasks in `build.ts`; the former Vitest, Vite,
vue-tsc, and ESLint workflow no longer applies.

| Command                                       | Purpose                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run build`                               | Compile sources, check test types, run tests with coverage, then lint and format-check. |
| `npm run build transpile`                     | Clean `dist/` and emit JavaScript, declarations, and source maps.                       |
| `npm run build types`                         | Check every TypeScript project under `test/`.                                           |
| `npm run build test`                          | Run runtime tests without preparing a coverage report.                                  |
| `npm run build coverage`                      | Run tests and prepare coverage, including when tests fail.                              |
| `npm run build coverage reportUncovered=true` | Also print uncovered source line numbers.                                               |
| `npm run build reportUncovered=true`          | Run the full workflow with uncovered line reporting.                                    |
| `npm run build lint`                          | Check linting and formatting.                                                           |
| `npm run build lint fix=true`                 | Apply lint and formatting fixes.                                                        |
| `npm run dev`                                 | Watch `lib/` and `test/` and rerun the coverage task.                                   |

Runtime tests import `@juit/vue-i18n`, resolving the package's emitted entry
point in `dist/`. Run the full build, or `transpile` before standalone test or
coverage tasks, after changing library sources. Relative source imports use
explicit `.ts` extensions, which the compiler rewrites in emitted JavaScript.
Declarations are emitted per module; this build does not bundle them.

Coverage requires 100% overall and per source file. Raw data lives in
`.coverage-data/`; reports are written to `coverage/`. A coverage failure can
follow passing tests, including when a suite is deliberately skipped. Read the
uncovered line report before changing code or tests; do not lower thresholds
or re-enable intentionally disabled tests merely to make a run pass. The full
workflow stops on failure, so run lint separately if coverage blocks it.

### Runtime tests and Vue context

- The test runner supplies `describe`, `it`, `expect`, and `skip` through
  `@plugjs/expect5`; match its assertion API, such as `toEqual`, `toBeA`, and
  `toThrowError`.
- For component tests, create a JSDOM instance and use `createJSDomApp` from
  `test/jsdom-vue.ts`. Its renderer uses that document without installing DOM
  objects on `globalThis`. A browser lint environment does not create runtime
  browser globals.
- Obtain translators through `app.use(i18n, options)` and `useTranslator()` in
  component setup, or use `app.runWithContext` for synchronous injection tests.
  Mounting an app does not activate component context in later test callbacks.
- Unmount apps and close JSDOM windows during teardown when adding fixtures.
  Use `nextTick()` before asserting results of reactive rendering changes.

## Intentional behavior

### Locales and matching

- Translators retain only language and region, including on construction and
  assignment to `locale`. Scripts and Unicode extensions are discarded.
- Setting `language` preserves the region; setting `region` preserves the
  language. Setting the region to `undefined` removes it.
- Translation lookup tries the current regional variant, current base language,
  configured default regional variant, and default base language, where present.
- `Intl.Locale` canonicalizes some ISO language codes to other codes. The
  resulting mismatch for a few languages is an accepted limitation; do not add
  an alias table merely to eliminate it.
- `LanguageMatcher` is independent of Vue. It normalizes case, strips suffixes
  after `-` or `_`, and chooses the first supported input preference. Its fallback
  is the first configured language, not the first ISO language alphabetically.
- Matcher inputs accept readonly tuples/arrays. Its non-empty generic tuple
  `T` is preserved as `Readonly<T>` in `availableLanguages`; `defaultLanguage`
  is `T[0]`, and `match()` returns `T[number]`. Construction copies the input.

### Messages and updates

- A message is a string or a readonly tuple of one to three strings. One variant
  serves all counts; two mean singular/plural (zero uses plural); three mean
  zero/singular/plural. Only counts zero and one receive special treatment.
- `t()` delegates to `tc()` with count one. `params.n` overrides both the value
  inserted for `{n}` and the count used for variant selection.
- Strings split at unescaped pipes. Tuples skip pipe splitting and pipe
  unescaping entirely. Tuple inputs are copied, including during updates.
- Trailing undefined tuple slots are omitted; gaps and invalid tuple lengths
  are rejected. Empty strings fall through during lookup and are ignored by
  updates. Use `['']` for an intentionally blank translation.
- Placeholders are case-sensitive, trim their names, and support balanced nested
  braces. Missing parameters render as `{name}`. Only own parameter properties
  are substituted; inserted values are never parsed again.
- Immediately before a pipe or placeholder, each backslash pair produces one
  literal backslash and an odd remainder escapes the pipe or placeholder.
  Tuples apply only placeholder escaping. Final rendered output is trimmed.
- Parsed templates contain literal strings and `{ param: string }` tokens.
  Cache them independently of parameter values. Caches are scoped to the
  translator's translation map, current language/region, and message key.
- `translator.updateTranslations(...)` is the primary update API; keep
  `translator.utils.updateTranslations(...)` as a deprecated compatibility alias.
- Updates are validated and copied before stored messages are changed. They
  invalidate parsed caches and increment a per-translator reactive revision.
  Both message updates and locale changes are reactive. Ignored or invalid
  updates do not notify consumers.
- Preserve `Map` storage for messages and null-prototype format dictionaries:
  keys such as `constructor` and `__proto__` must not resolve inherited entries.

### Formatting and reference data

- Date time-zone precedence is explicit argument, format option, configured
  default, then runtime default. Do not mutate the caller's options.
- The date formatter uses `Object.create` with an own `timeZone` descriptor to
  preserve inherited/non-enumerable options and override readonly time zones.
  The changed getter receiver is an accepted edge case for private-field getters.
- Numeric interpolation uses the current locale and default number format.
- Country codes include CLDR's `XK` for Kosovo. Keep language/country reference
  names aligned with `test/data/`, rather than independently modernizing them.
- Currency codes and built-in currency aliases come from the runtime's
  `Intl.supportedValuesOf('currency')`. The static currency union can differ;
  this is intentional. Do not replace runtime discovery with the static table.

## Public types and maintenance

`I18nConfiguration` supports declaration merging for language, translation-key,
date-format, and number-format unions. With a configured subset of languages,
all base languages are required in each translation; regional entries remain
optional. Without configuration, base languages are optional and keys/aliases
accept arbitrary strings. Built-in format aliases remain available when custom
aliases are configured. Translation updates accept partial messages.

Keep configured and unconfigured type tests in separate TypeScript projects:
declaration merging affects the entire project. Import `expectTypeOf` from
`expect-type` for inferred types and use descriptive `@ts-expect-error`
assertions for rejected inputs. Runtime test execution does not enforce these
compiler assertions; run the `types` task or full build. Preserve the
`string & {}` fallback in format alias types so arbitrary strings remain
accepted while built-in literals remain available for autocomplete.

Add focused regressions for behavioral fixes and public type changes. Prefer
the full build before completing code changes; for documentation-only edits,
run lint and verify that code/types are unchanged. Do not hand-edit generated
`dist/`, `.coverage-data/`, or `coverage/` files. Match the existing TypeScript
style and keep README examples and source comments consistent with changed
behavior.
