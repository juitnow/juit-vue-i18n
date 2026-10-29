---
name: use-juit-vue-i18n
description: Configure and use @juit/vue-i18n in Vue 3 applications, including typed messages, template helpers, locale changes, and asynchronously loaded translations. Use for consumer integration, not maintenance of the library itself.
---

# Using @juit/vue-i18n

Apply this guidance in the consuming application. Follow that application's
conventions and verification commands. Read the relevant sections of
[README.md](README.md) for API details and examples; check `peerDependencies`
in the accompanying `package.json` for the supported Vue version.

## Configure the application

- Import runtime APIs and types from `@juit/vue-i18n`. The translator constructor
  is internal; do not import `lib/` files or construct a translator directly.
- Install the plugin with `app.use(i18n, options)` before mounting.
  `defaultLanguage` is required. Supply each message in its base language.
- Keep the runtime dictionaries and their TypeScript configuration together.
  Declaration merging only supplies types; pass those dictionaries to the plugin.

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

Import `i18nOptions` in the app entry point and pass it to
`app.use(i18n, i18nOptions)`. Include the augmentation module in the app's
TypeScript project. For custom formats, use `satisfies DateTimeFormats` or
`satisfies NumberFormats`, derive the corresponding configuration unions with
`keyof typeof`, and pass those dictionaries to the plugin too. Built-in format
aliases remain available. See [Configuring Types](README.md#configuring-types).

## Use reactive translations

Call `useTranslator()` in component setup or another valid Vue injection
context. Pass the translator into ordinary helpers instead of calling the
composable at module scope.

| Translator method              | Template helper                 | Purpose                  |
| ------------------------------ | ------------------------------- | ------------------------ |
| `t(key, params?)`              | `$t(key, params?)`              | Translate a message.     |
| `tc(key, count, params?)`      | `$tc(key, count, params?)`      | Select a plural variant. |
| `n(value, format?)`            | `$n(value, format?)`            | Format a number.         |
| `d(value, format?, timeZone?)` | `$d(value, format?, timeZone?)` | Format a date or time.   |

Use translated text in templates or in `computed(() => translator.t(...))`
when it must update. A string translated once during setup stays unchanged.
Read `translator.language`, `region`, and `locale` through the instance rather
than destructuring their current values.

Set those properties to change locale. Changing language preserves region;
assigning `undefined` to region removes it. Only language and region are
retained; scripts and Unicode extensions are discarded. Lookup tries the
current regional variant, current base language, default regional variant,
and default base language.

## Choose messages and load updates

- Messages are strings or readonly tuples of one to three strings. One variant
  serves every count; two mean singular/plural; three mean zero/singular/plural.
  Only zero and one receive special treatment. `params.n` overrides the count
  used for both display and variant selection.
- Prefer tuples for literal pipes. String messages split at unescaped pipes;
  tuples skip pipe splitting and unescaping. Both forms parse placeholders.
- Parameters accept strings and numbers. Names are case-sensitive and trimmed;
  missing values remain as `{name}`. Inserted values are literal text. Output
  is trimmed and consists of plain strings, not Vue components or HTML.
- Use `translator.updateTranslations(...)` for loaded messages rather than
  mutating the original dictionary. Updates merge partial messages and trigger
  reactive consumers. Await Vue's `nextTick()` before checking the updated DOM.
  `translator.utils.updateTranslations(...)` is a deprecated alias.
- Empty string messages fall through during lookup and are ignored by updates.
  Use `['']` for intentionally blank output. Tuples are copied; gaps are rejected.
- `translator.hasTranslation(key)` accepts any string and checks whether the
  key is configured, regardless of locale or empty messages. It is reactive
  and does not warn. There is no `$hasTranslation` template global.
- Missing keys warn and render literally as `[key]`. Adding the message through
  `updateTranslations(...)` replaces that fallback. A configured key with no
  usable fallback message warns and returns an empty string.

For placeholder and pipe escaping, refer to
[Parameterizing translations](README.md#parameterizing-translations) and
[Pluralization](README.md#pluralization).

## Respect runtime and locale boundaries

- Locale selection is explicit. For browser preferences, use
  `new LanguageMatcher(['en', 'de']).match(navigator.languages)` and pass the
  result as `defaultLanguage`. The matcher uses the first supported preference
  and falls back to the first configured language. Access `navigator` only in
  browser code; use request preferences or a configured default on the server.
- Initialize the plugin separately for each server-rendered app/request.
  Match initial locales and choose explicit time zones on server and client
  when formatted output must agree.
- Date time zone precedence is the explicit argument, format option, configured
  default, then runtime default. Options passed by the caller are not modified.
- The package uses native `Intl` APIs and provides no polyfills. Currency aliases
  come from `Intl.supportedValuesOf('currency')`; the static union may differ
  from runtime support. Full locale negotiation, CLDR plural rules, and richer
  message syntax are outside this library's scope.

## Verify the integration

Use the application's type checks, tests, and build. Check that the plugin is
installed before mounting and that translated UI follows locale and message
updates. Keep configured and unconfigured declaration-merging tests in separate
TypeScript projects if both are needed. Avoid using this library repository's
build commands in a consuming application.
