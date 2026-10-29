Juit I18n for Vue
=================

The `@juit/vue-i18n` package provides a _minimal_ plugin for Vue 3
to support basic internationalization (translations, number formatting, and
date formatting).

It relies heavily on the [`Intl.Locale`][1], [`Intl.NumberFormat`][2], and
[`Intl.DateTimeFormat`][3] global objects, which are widely supported by modern
browsers.

It also integrates with TypeScript to provide compile-time checks for
required translation languages and translation keys.

For agents integrating the package into an application, see [SKILL.md](SKILL.md).

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
  - [Date and Time Format Aliases](#date-and-time-format-aliases)
  - [Number Format Aliases](#number-format-aliases)
- [Usage](#usage)
  - [Usage in Templates](#usage-in-templates)
  - [Switching language](#switching-language)
- [Translating messages](#translating-messages)
  - [Parameterizing translations](#parameterizing-translations)
  - [Pluralization](#pluralization)
- [Formatting numbers](#formatting-numbers)
- [Formatting dates](#formatting-dates)
- [Configuring Types](#configuring-types)
- [Checking Translations](#checking-translations)
- [Updating Translations](#updating-translations)
- [Language Matching](#language-matching)
- [Remarks](#remarks)
- Legal Stuff
  - [Copyright Notice](NOTICE.md)
  - [License](LICENSE.md)

## Installation

As usual, install with npm (or the cool package manager du jour):

```bash
npm install '@juit/vue-i18n'
```

Then add the plugin to your Vue app before mounting:

```typescript
import { i18n } from '@juit/vue-i18n'
import { createApp } from 'vue'

import MyApp from './app.vue'

const app = createApp(MyApp).use(i18n, {
  defaultLanguage: 'en',
  translations: {
    hello: {
      en: 'Hello, world!',
      de: 'Hallo, Welt!',
    },
  },
})
```

## Configuration

The plugin can be configured with a language code string (the default
language) or an object containing the following options:

- `defaultLanguage`: **(required)** a base language, locale string, or
  `Intl.Locale`. Supply each translation in its base language.
- `defaultTimeZone`: the default time zone to use when formatting dates
  (defaults to the _local_ time zone).
- `translations`: an object containing the translations for the messages to
  translate, keyed by message identifier.
- `dateTimeFormats`: date and time format aliases used when formatting dates.
- `numberFormats`: number format aliases used when formatting numbers.

### Date and Time Format Aliases

Date and time format aliases can be configured using string keys and
[`Intl.DateTimeFormatOptions`][5] values:

```typescript
import { i18n } from '@juit/vue-i18n'
import { createApp } from 'vue'

import MyApp from './app.vue'

const app = createApp(MyApp).use(i18n, {
  defaultLanguage: 'en',
  dateTimeFormats: {
    custom: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  },
})
```

The default (overridable) formats are as follows:

```typescript
const dateTimeFormats = {
  // used when no alias or date and time format is specified
  default: { dateStyle: 'medium', timeStyle: 'medium' },

  // generic formats
  short: { dateStyle: 'short', timeStyle: 'short' },
  medium: { dateStyle: 'medium', timeStyle: 'medium' },
  long: { dateStyle: 'long', timeStyle: 'long' },
  full: { dateStyle: 'full', timeStyle: 'full' },

  // date only formats
  date: { dateStyle: 'medium' },
  shortDate: { dateStyle: 'short' },
  mediumDate: { dateStyle: 'medium' },
  longDate: { dateStyle: 'long' },
  fullDate: { dateStyle: 'full' },

  // time only formats
  time: { timeStyle: 'medium' },
  shortTime: { timeStyle: 'short' },
  mediumTime: { timeStyle: 'medium' },
  longTime: { timeStyle: 'long' },
  fullTime: { timeStyle: 'full' },
}
```

### Number Format Aliases

Similarly, number format aliases can be configured using string keys and
[`Intl.NumberFormatOptions`][4] values:

```typescript
import { i18n } from '@juit/vue-i18n'
import { createApp } from 'vue'

import MyApp from './app.vue'

const app = createApp(MyApp).use(i18n, {
  defaultLanguage: 'en',
  numberFormats: {
    speed: {
      style: 'unit',
      unit: 'kilometer-per-hour',
    },
  },
})
```

By default, numbers use the locale's standard formatting. Currency codes
reported by the runtime's `Intl.supportedValuesOf('currency')` (e.g. `EUR`,
`USD`, ...) can be used as aliases. The static currency type may differ from
runtime support.

To configure the default number format, use the `default` key.

## Usage

In any component's `setup()` method, you can use the `useTranslator()` function
to retrieve the `Translator` configured for the current app.

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()
```

Use:

- `translator.t(key, params?)` to [translate a message](#translating-messages),
- `translator.tc(key, count, params?)` to select a [plural form](#pluralization),
- `translator.n(value, format?)` to [format numbers](#formatting-numbers) and
- `translator.d(value, format?, timeZone?)` to [format dates and times](#formatting-dates).

### Usage in Templates

The plugin registers `$t(...)`, `$tc(...)`, `$n(...)`, and `$d(...)` as template
helpers. They accept the same arguments as the corresponding translator
methods; you do not need to call `useTranslator()` to use them in a template.

Use:

- `$t(key, params?)` for [translations](#translating-messages),
- `$tc(key, count, params?)` for [pluralization](#pluralization),
- `$n(value, format?)` for [numbers](#formatting-numbers) and
- `$d(value, format?, timeZone?)` for [dates and times](#formatting-dates).

For example, with `hello` and `cats` translation keys configured:

```html
<template>
  <p>{{ $t('hello') }}</p>
  <p>{{ $tc('cats', 2) }}</p>
  <p>{{ $n(1234.5, 'EUR') }}</p>
  <p>{{ $d(new Date(), 'shortDate') }}</p>
</template>
```

These helpers update the rendered text when the locale or translations change.

### Switching language

To switch languages, simply set the `language`, `region`, or `locale` property
on the translator instance:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator() // assuming the default locale is "en-US"

translator.region = 'CA' // we have switched to Canada, and the locale is now "en-CA"
translator.language = 'fr' // we have switched to French, and the locale is now "fr-CA"

// or set the full `locale`
translator.locale = new Intl.Locale('de-AT')
```

Translations in templates and computed values update when the locale changes.
A string translated once during setup does not update itself; use
`computed(() => translator.t(...))` when it must follow locale changes.

## Translating messages

The function for translating messages is exposed as `translator.t(...)`
(or `$t(...)` in templates).

This function takes a translation _key_ specified during configuration
(see above).

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const hello = translator.t('hello')
// the "hello" string will be "Hello, world!" or "Hallo, Welt!"
```

In a template, use `$t(...)` with the same arguments:

```html
<template>
  <p>{{ $t('hello') }}</p>
</template>
```

If a translation key is not configured, the translator logs a warning and
renders the key literally inside square brackets: `missing` becomes `[missing]`
for every count. Pipes, placeholders, and escapes in missing keys are not
interpreted. Adding the translation through `updateTranslations(...)` replaces
the fallback and updates reactive consumers. A configured key with no usable
message in the fallback languages logs a warning and returns an empty string.

It can also take an inline translation:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const pangram = translator.t({
  en: 'The quick brown fox jumps over the lazy dog',
  de: 'Franz jagt im komplett verwahrlosten Taxi quer durch Bayern',
})
```

### Parameterizing translations

Translations can include parameters by enclosing them in curly braces `{param}`.
Parameter names are case-sensitive: `{name}` and `{NAME}` refer to different parameters.

Whitespace around parameter names is ignored. If a parameter is missing,
its placeholder is kept in normalized form: `{ name }` becomes `{name}`.

Escape a placeholder's opening brace with a backslash to display it literally:
`\{ name }` becomes `{ name }`, even when no parameter is supplied. In a normal
JavaScript string, write the backslash as `\\`, or use a `String.raw` template.
Inserted parameter values are treated as literal text and are never parsed again.

Backslashes before placeholders follow the same rule as those before pipes:
each pair produces one literal backslash, and an odd remaining backslash
escapes the placeholder. With two actual backslashes before `{name}`, one
backslash is displayed and `name` is substituted; with three, one backslash
is displayed and `{name}` stays literal.

For example:

```typescript
const name = 'John Doe'

const string = translator.t(
  {
    en: 'Your name is {name}',
    de: 'Ihr Name ist {name}',
  },
  { name },
)
// This will result in either "Your name is John Doe" or "Ihr Name ist John Doe"
```

Numeric parameters are formatted according to the current locale:

```typescript
const string = translator.t(
  {
    en: 'Score { points } points',
    de: 'Punktestand { points } Punkte',
  },
  { points: 1234.56 },
)
// This will result in "Score 1,234.56 points" or "Punktestand 1.234,56 Punkte"
```

### Pluralization

The `translator.tc(...)` function (or `$tc(...)` in templates) supports basic
pluralization by separating translation messages with the `|` (pipe) character. Escape a literal pipe as
`\|`, or use a tuple as shown below.

Messages can contain two variants, `singular|plural`, or three variants,
`zero|singular|plural`. The singular variant is used for one, and the plural
variant for other numbers. If a zero variant is provided, it is used for zero
instead of the plural variant.

To specify the number used for pluralization, either use the `n` parameter
or pass the number as the second argument to `tc(...)`. A supplied `params.n`
overrides that argument for both display and variant selection.

For example:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()
const n = 2

const string = translator.t(
  {
    en: 'no cats | one cat | {n} cats',
    de: 'keine Katzen | eine Katze | {n} Katzen',
  },
  { n },
)
// This will result in "no cats" or "keine Katzen" when "n" is zero,
// "one cat" or "eine Katze" when "n" is 1, or
// "1,234.56 cats" or "1.234,56 Katzen" when "n" is 1234.56
```

This is equivalent to:

```typescript
const string = translator.tc(
  {
    en: 'no cats | one cat | {n} cats',
    de: 'keine Katzen | eine Katze | {n} Katzen',
  },
  n,
)
```

For a configured `cats` key, the template equivalent is:

```html
<template>
  <p>{{ $tc('cats', 2) }}</p>
</template>
```

Messages can also use explicit tuples instead of pipe-delimited strings:

```typescript
const message = {
  en: ['no cats', 'one cat', '{n} cats'],
  de: ['keine Katzen', 'eine Katze', '{n} Katzen'],
} as const

translator.tc(message, 2) // '2 cats' or '2 Katzen'
```

A tuple with one element is used for every count. Two elements mean
`[singular, plural]`, with zero using the plural variant. Three elements mean
`[zero, singular, plural]`.

Tuple elements still support placeholders and escaped placeholders, but skip
pipe splitting and pipe unescaping entirely: `['A | B']` displays `A | B`.

Tuples work in base and regional translations, inline messages, and
`updateTranslations(...)`. They are copied when stored, so changing the
original array later cannot change stored messages or cached results.

## Formatting numbers

The `translator.n(...)` function (or `$n(...)` in templates) can be used to
format numbers in the current locale:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const number = translator.n(1234.5)
// the "number" string will be "1,234.5", "1.234,5", etc., depending on the locale
```

A currency can be specified as a second parameter for quick formatting:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const amount = translator.n(1234.5, 'USD')
// the "amount" string will be "$1,234.50" in en-US
```

In a template, use `$n(...)` with the same value and format:

```html
<template>
  <p>{{ $n(1234.5) }}</p>
  <p>{{ $n(1234.5, 'USD') }}</p>
</template>
```

An [`Intl.NumberFormatOptions`][4] object can also be specified
as a second parameter to fine-tune the formatting.

The default format can be specified using `numberFormats.default` when
configuring the plugin.

## Formatting dates

The `translator.d(...)` function (or `$d(...)` in templates) can be used to
format date and time values in the current locale.

When the second parameter is a string, it is considered to be one of the
built-in or custom _aliases_ configured when the plugin is set up.

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const dateTime = translator.d(new Date()) // e.g. '03.02.2025, 18:08:05' in de-DE
const dateOnly = translator.d(new Date(), 'date') // e.g. '03.02.2025' in de-DE
const timeOnly = translator.d(new Date(), 'time') // e.g. '18:08:05' in de-DE
```

In a template, use `$d(...)` with the same arguments:

```html
<template>
  <p>{{ $d(new Date()) }}</p>
  <p>{{ $d(new Date(), 'date') }}</p>
  <p>{{ $d(new Date(), 'time', 'UTC') }}</p>
</template>
```

An [`Intl.DateTimeFormatOptions`][5] object can also be specified
as a second parameter to fine-tune the formatting. Inputs may be a `Date`,
a date string, or milliseconds since the Unix epoch. Null, undefined, and an
empty string produce an empty string.

The third parameter, if specified, can be used to override the time zone used
when formatting the date. This is useful when time zones are specified in
the definitions of date and time format _aliases_ (see above). Time zone
precedence is the explicit argument, the format's `timeZone`, the configured
`defaultTimeZone`, then the runtime default:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

translator.d(new Date(), 'full', 'Europe/Berlin')
// e.g. Monday, 3 February 2025 at 18:08:03 Central European Standard Time
```

## Configuring Types

One of the key features of this package is compile-time safety for all
translation languages (we don't want to forget to translate a message into
a new language) and translation keys (we don't want to mistype a translation
key by accident).

To do so, we can _merge_ the `I18nConfiguration` interface of this package
with our application-specific configuration. The following properties can
be defined:

- `languages`: a union of supported ISO 639-1 language codes. When configured
  with a subset of codes, _every_ translation _must_ include each base language.
  Regional variants remain optional.
- `translationKeys`: a union of translation keys known by the application.
  These are the arbitrary keys used to identify the
  messages to be translated with the `t` and `tc`
  methods of `Translator`.
- `dateTimeFormats`: the date and time format _aliases_ used by the
  application.
- `numberFormats`: the number format _aliases_ used by the application.

To configure the types, follow the example below. Keep the augmentation in a
module included by your application's TypeScript configuration:

```typescript
import { i18n } from '@juit/vue-i18n'
import { createApp } from 'vue'

import MyApp from './app.vue'

import type { DateTimeFormats, NumberFormats, Translations } from '@juit/vue-i18n'

const translations = {
  hello: { en: 'Hello, world!', de: 'Hallo, Welt!' },
} as const satisfies Translations

const dateTimeFormats = {
  // override the default format
  default: { dateStyle: 'short', timeStyle: 'short' },
  // add a new custom format
  custom: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  },
} as const satisfies DateTimeFormats

const numberFormats = {
  speed: { style: 'unit', unit: 'kilometer-per-hour' },
} as const satisfies NumberFormats

declare module '@juit/vue-i18n' {
  export interface I18nConfiguration {
    languages: 'de' | 'en'
    translationKeys: keyof typeof translations
    dateTimeFormats: keyof typeof dateTimeFormats
    numberFormats: keyof typeof numberFormats
  }
}

const app = createApp(MyApp).use(i18n, {
  defaultLanguage: 'en',
  translations,
  dateTimeFormats,
  numberFormats,
})
```

In the example above, if any of the translation objects in our app is missing
a language (either `en` or `de`), TypeScript will complain.

In the same way, if we pass any string other than `hello` to `t(...)` or
`tc(...)`, TypeScript will report an invalid key.

Date, time, and number format alias types will also be augmented using the
customizations specified in `dateTimeFormats` and `numberFormats`. Built-in
aliases remain available. Declaration merging only configures types; pass the
same dictionaries to the plugin to register them at runtime, as shown above.

## Checking Translations

Use `translator.hasTranslation(key)` to check whether a key is configured.
It accepts any string, including when translation keys are restricted through
`I18nConfiguration`, and returns a boolean without warning about missing keys.

The check is independent of the current locale and message contents: keys with
empty messages also return `true`. It does not check whether a message can be
resolved for the current locale. Calls in templates and computed values react
when `updateTranslations(...)` adds a key.

```typescript
import { computed } from 'vue'

const available = computed(() => translator.hasTranslation('hello'))
```

The method is available on the translator; there is no template global alias.

## Updating Translations

`translator.utils.updateTranslations(...)` is deprecated. Use
`translator.updateTranslations(...)` instead; the old method remains available
as a backward-compatible alias with the same behavior.

Use `translator.updateTranslations(...)` to add or change translations
after the plugin has been configured, for example when loading messages from
a server. Pass an object keyed by translation key, with language codes and
their translated messages as values:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

translator.updateTranslations({
  hello: {
    en: 'Hello again!',
  },
})

translator.language = 'en'
translator.t('hello') // 'Hello again!'
```

Updates are merged into the existing translations: only the supplied
key-language pairs are overwritten. In this example, the German translation
of `hello` is preserved. New keys and language variants can also be added.

Both translation keys and languages are optional in an update, so you do not
need to supply every configured language. If you have configured
`I18nConfiguration`, TypeScript checks the supplied keys and languages against
those types.

Empty strings and `undefined` values are ignored; they cannot be used to
delete an existing translation. The method returns nothing and clears the
translation cache when an update is applied, so subsequent calls to `t(...)`
and `tc(...)` use the updated messages. Updates also invalidate computed
translations and schedule Vue components using `$t`, `$tc`, or the translator
methods to render again. Use translations in templates or in
`computed(() => translator.t(...))` to follow these changes; a string translated
once does not update itself. Await Vue's `nextTick()` before reading the updated
DOM.

Each translator tracks its own updates. Applying messages causes all reactive
translations using that translator to reevaluate, including keys not present in
the update. Updates containing only ignored values do not trigger reevaluation.
Invalid updates are rejected before any messages or reactive state change.

## Language Matching

The `LanguageMatcher` class selects a supported language from a user's
preferences. It can be used independently of the Vue plugin, for example to
choose the initial language from the browser's `navigator.languages`:

```typescript
import { LanguageMatcher } from '@juit/vue-i18n'

const matcher = new LanguageMatcher(['en', 'de', 'ja'])

matcher.defaultLanguage // 'en'
matcher.availableLanguages // [ 'en', 'de', 'ja' ]

const app = createApp(MyApp).use(i18n, {
  defaultLanguage: matcher.match([...navigator.languages]),
  translations,
})
```

The constructor accepts a single ISO 639-1 language code (such as `'en'`) or
a non-empty array of codes. The first valid language is the default, used
whenever no preference matches.

The `match(...)` method accepts a string, an array of strings in preference
order (including readonly arrays), `null`, or `undefined`. It returns the **first supported preference**,
regardless of the order of the available languages:

```typescript
matcher.match('de') // 'de'
matcher.match('JA-JP') // 'ja'
matcher.match('de_AT') // 'de'
matcher.match(['fr', 'ja-JP', 'de']) // 'ja'
matcher.match('fr') // 'en' (default)
matcher.match([]) // 'en' (default)
matcher.match(null) // 'en' (default)
matcher.match(undefined) // 'en' (default)

const englishOnly = new LanguageMatcher('en')
englishOnly.match('de') // 'en'
```

## Remarks

To keep the package small, the translator supports only the **language** and
optional **region** of a locale. Both `defaultLanguage` and assignments to
`translator.locale` discard script subtags and Unicode extensions, including
calendar and numbering-system preferences. For example,
`zh-Hant-TW-u-nu-hanidec` becomes `zh-TW`.

Changing `translator.language` preserves the current region: switching from
`en-CA` to `fr` produces `fr-CA`. Changing `translator.region` preserves the
language; setting it to `undefined` removes the region.

[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale
[2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
[3]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
[4]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options
[5]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#options
