Juit I18n for Vue
=================

The `@juit/vue-i18n` package provides a _minimalistic_ plugin for VueJS (v. 3)
to support basic internationalization (translations, numbers and date formats).

It relies on the `Intl.Locale`, `Intl.NumberFormat` and `Intl.DateTimeFormat`
widely supported by modern browsers.

It also deeply integrates with Typescript to provide compile-time checking on
required translation languages, and translation keys.


## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Translating messages](#translating-messages)
  - [Parameterizing translations](#parameterizing-translations)
  - [Pluralization](#pluralization)
- [Formatting numbers](#formatting-numbers)
- [Formatting dates](#formatting-dates)
- [Legal Stuff](#legal-stuff)


## Installation

As usual, install with NPM (or the cool package-manager du jour):

```bash
npm install '@juit/vue-i18n'
```

And add the plugin to your Vue app:

```typescript
import { createApp } from 'vue'
import { i18n } from '@juit/vue-i18n'
import MyApp from './app.vue'

const app = createApp(MyApp).use(i18n, {
  defaultLanguage: 'en',
  translations: {
    hello: {
      en: 'Hello, world!',
      de: 'Hallo, Welt!',
    },
  }
})
```


## Configuration

The plugin can be configured with a simple string (the `defaultLanguage`)
described below, or some options:

* `defaultLanguage`: the default language to use, all translations should be
                     available in this language.
* `translations`: an object containing the translations for the messages to
                  translate, keyed by its identifier.
* `formats`: configurations for number and date formatting:
  * `dateTimeFormat`: a string (`short`, `medium`, `long` or `full`) used to
                      format date-and-time values, or the options to be provided
                      to the `Intl.DateTimeFormat` constructor.
  * `dateOnlyFormat`: a string (`short`, `medium`, `long` or `full`) used to
                      format dates, or the options to be provided to the
                      `Intl.DateTimeFormat` constructor.
  * `timeOnlyFormat`: a string (`short`, `medium`, `long` or `full`) used to
                      format times, or the options to be provided to the
                      `Intl.DateTimeFormat` constructor.


## Usage

In any component `setup()` method, you can use the `useTranslator()` function
to get a hold on the `Translator` configured for the current app.

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()
```


## Translating messages

The base function to translate messages is exposed as `translator.t(...)` or
(within components) the `$t(...)` function.

This function takes a translation _key_ (specified in the configuration
phase, see above).

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const hello = translator.t('hello')
// the "hello" string will be "Hello, world!" or "Hallo, Welt!"
```

It can also take an inline translation:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const panagram = translator.t({
  en: 'The quick fox jumped over the lazy dog',
  de: 'Franz jagt im komplett verwahrlosten Taxi quer durch Bayern'
})
```


### Parameterizing translations

Translations can include parameters enclosing them in curly braces `{param}`.

For example:

```typescript
const name = 'John Doe'

const string: translator.t({
  en: 'Your name is {name}'
  de: 'Ihr Name ist {name}'
}, { name })
// This will result in either "Your name is John Doe" or "Ihr Name ist John Doe"
```

When parameters are number, those will be formatted as numbers:

```typescript
const string: translator.t({
  en: 'Score {points} points'
  de: 'Punktestand {points} Punkte'
}, { points: 1234.56 })
// This will result in "Score 1,234.56 points" or "Punktestand 1.234,56 Punkte"
```


### Pluralization

The translator supports minimal rules for pluralization by separating
translation messages with the `|` (pipe) character.

Messages can contain two variants `singular|plural` or three variants
`zero|singular|plural`, with each variant used when the reference number to
pluralized is either zero, one or another number:

To contextualize the number, either use the `n` parameter, or use the `tc(...)`
function which will take, as a second parameter, the reference number

For example:

```typescript
const string: translator.t({
  en: 'no cats | one cat | {n} cats'
  de: 'keine Katzen | eine Katze | {n} Katzen'
}, { n })
// This will result in "no cats" or "keine katzen" when "n" is zero,
// "one cat" or "eine Katze" when "n" is 1, or
// "1,234.56 cats" or "1.234,56 Katzen" when "n" is 1234.56
```

Is equivalent to:

```typescript
const string: translator.tc({
  en: 'no cats | one cat | {n} cats'
  de: 'keine Katzen | eine Katze | {n} Katzen'
}, n)
```


## Formatting numbers

The `n(...)` function can be used to format numbers in the current locale:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const number = translator.n(1234.5)
// the "number" string will be "1,234.5", "1.234,5" or whatever locale specified
```

A currency can be specified as a second parameter, for quick formatting:

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const amount = translator.n(1234.5, 'USD')
// the "amount" will be "$1,234.5", "1.234,5 $" or whatever locale specified
```

A full [`Intl.NumberFormatOptions`][1] set of options can also be specified
as a second parameter to fine-tune the formatting.

The default format can be specified when configuring the plugin as the
`formats.numberFormat` option (intentionally, there is no default).


## Formatting dates

The `d(...)` function can be used to format date-and-time values in the current
locale, together with the `d.date(...)` to format only dates, or `d.time(...)`
to format only times

```typescript
import { useTranslator } from '@juit/vue-i18n'

const translator = useTranslator()

const dateTime = translator.d(new Date()) // e.g. '03.02.2025, 18:08:05' in de-DE
const dateOnly = translator.d.date(new Date()) // e.g. '03.02.2025' in de-DE
const dateTime = translator.d.time(new Date()) // e.g. '18:08:05' in de-DE
```

A full [`Intl.DateTimeFormatOptions`][2] set of options can also be specified
as a second parameter to fine-tune the formatting.

The second parameter can also be a simple string `full`, `long`, `medium`, or
`short`, as a shortcut to `options.dateStyle` or `options.timeStyle`.

The default formatting options for each method can be specified at configuration
time, using the `formats.dateTimeFormat`, `formats.dateOnlyFormat` or
`formats.timeOnlyFormat` parameters.

By default they are all set to `medium`.


## Configuring Types

One of the keys of this package is to provide compile time safety for all
translation languages (we don't want to forget to translate a message in
a new language) and translation keys (we don't want to mistype a translation
key by accident).

To do so we can _merge_ the `I18nConfiguration` interface of this package
with our specific configurations. Two properties are expected to be defined
in the configuration:

* `languages`: the list of supported languages for the application. Those
               are ISO 639-1 language codes, and when specified, _every_
               translation _must_ include a translation for each.
* `translationKeys`: the list of translation keys known by the application.
                     Those are the arbitrary keys used to identify the
                     messages to be  translated with the `t` and `tc`
                     methods of `Translator`.

To configure the types, follow the example below:

```ts
const translations = {
  'hello': { en: 'Hello, world!', de: 'Hallo, Welt!' }
} as const satisfies TranslationsOptions

declare module '@juit/vue-i18n' {
  export interface I18nConfiguration {
    translationKeys: keyof typeof translations
    languages: 'de' | 'en'
  }
}
```

In the example above, if any of the translation objects in our app is missing
a language (either `en` or `de`) TypeScript will complain.

In the same way if we pass any other string but `hello` to `t(...)` or `tc(...)`
TypeScript will report the wrong key.


## Legal Stuff

* [Copyright Notice](NOTICE.md)
* [License](LICENSE.md)



[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options
[2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#options
