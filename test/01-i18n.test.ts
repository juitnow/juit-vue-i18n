import {
  i18n,
  isISOCountry,
  isISOCurrency,
  isISOLanguage,
  ISO_COUNTRIES,
  ISO_LANGUAGES,
  useTranslator,
} from '@juit/vue-i18n'
import { JSDOM } from 'jsdom'
import { defineComponent } from 'vue'

import languages from './data/iso_639-1.json' with { type: 'json' }
import countries from './data/iso_3166-1.json' with { type: 'json' }
import { createJSDomApp } from './jsdom-vue.ts'

import type { I18nOptions, TranslationMessage, Translator } from '@juit/vue-i18n'

declare module '@juit/vue-i18n' {
  export interface I18nConfiguration {
    languages: 'de' | 'en'
    translationKeys: 'hello' | 'cats'
  }
}

describe('I18N Plugin', () => {
  let translator: Translator

  function makeTranslator(options: I18nOptions): Translator {
    let translator: Translator | undefined
    const dom = new JSDOM('<!doctype html><html><body><div id="app"/></body></html>')

    const component = defineComponent({
      setup() {
        translator = useTranslator()
        return () => null
      },
    })

    createJSDomApp(dom, component).use(i18n, options).mount('#app')
    expect(translator).toBeDefined()
    return translator!
  }

  it('should create a translator', () => {
    translator = makeTranslator({
      defaultLanguage: 'en',
      translations: {
        hello: {
          'en': 'Hello, World!',
          'de': 'Hallo, Welt!',
          'de-DE': 'Hallo, Deutschland!',
          'de-AT': 'Hallo, Österreich!',
        },
        world: null as any as Record<'en' | 'de', string>, // this should not brea
      },
    })

    expect(translator).toBeDefined()

    expect(translator.language).toEqual('en')
    expect(translator.region).toBeUndefined()
    expect(translator.locale.toString()).toEqual('en')
  })

  it('should translate a string in various languages', () => {
    if (!translator) return skip()

    expect(translator.t('hello')).toEqual('Hello, World!')

    translator.language = 'de'
    expect(translator.t('hello')).toEqual('Hallo, Welt!')
    expect(translator.language).toEqual('de')
    expect(translator.region).toBeUndefined()
    expect(translator.locale.toString()).toEqual('de')

    translator.region = 'DE'
    expect(translator.t('hello')).toEqual('Hallo, Deutschland!')
    expect(translator.language).toEqual('de')
    expect(translator.region).toEqual('DE')
    expect(translator.locale.toString()).toEqual('de-DE')

    translator.region = 'AT'
    expect(translator.t('hello')).toEqual('Hallo, Österreich!')
    expect(translator.language).toEqual('de')
    expect(translator.region).toEqual('AT')
    expect(translator.locale.toString()).toEqual('de-AT')
  })

  it('should preserve the region when changing language', () => {
    const translator = makeTranslator({ defaultLanguage: 'en-CA' })

    translator.language = 'fr'
    expect(translator.locale.toString()).toEqual('fr-CA')

    translator.region = undefined
    expect(translator.locale.toString()).toEqual('fr')

    translator.language = 'en'
    expect(translator.locale.toString()).toEqual('en')
  })

  it('should keep only language and region from locales', () => {
    const translator = makeTranslator({ defaultLanguage: 'zh-Hant-TW-u-nu-hanidec' })
    expect(translator.locale.toString()).toEqual('zh-TW')

    translator.locale = new Intl.Locale('sr-Latn-RS-u-nu-latn')
    expect(translator.locale.toString()).toEqual('sr-RS')
  })

  it('should find the best match for missing languages', () => {
    if (!translator) return skip()

    translator.locale = new Intl.Locale('de-CH')
    expect(translator.t('hello')).toEqual('Hallo, Welt!')

    translator.locale = new Intl.Locale('ja-JP')
    expect(translator.t('hello')).toEqual('Hello, World!')
  })

  it('should fall back from the default region to its base language', () => {
    const translator = makeTranslator({
      defaultLanguage: 'en-US',
      translations: {
        hello: { en: 'Hello!', de: '' },
      },
    })

    translator.locale = new Intl.Locale('de-DE')
    expect(translator.t('hello')).toEqual('Hello!')

    translator.utils.updateTranslations({ hello: { 'en-US': 'Howdy!' } })
    expect(translator.t('hello')).toEqual('Howdy!')

    translator.utils.updateTranslations({ hello: { de: 'Hallo!' } })
    expect(translator.t('hello')).toEqual('Hallo!')

    translator.utils.updateTranslations({ hello: { 'de-DE': 'Guten Tag!' } })
    expect(translator.t('hello')).toEqual('Guten Tag!')
  })

  it('should format a number in various languages', () => {
    if (!translator) return skip()

    translator.locale = new Intl.Locale('en-US')
    expect(translator.n(1234.56)).toEqual('1,234.56')
    expect(translator.n(null)).toEqual('')
    expect(translator.n()).toEqual('')

    translator.locale = new Intl.Locale('de-DE')
    expect(translator.n(1234.56)).toEqual('1.234,56')
    expect(translator.n(null)).toEqual('')
    expect(translator.n()).toEqual('')
  })

  it('should format a number (as a currency) in various languages', () => {
    if (!translator) return skip()

    translator.locale = new Intl.Locale('en-US')
    expect(translator.n(1234.56, 'EUR')).toEqual('€1,234.56')
    expect(translator.n(1234.56, 'USD')).toEqual('$1,234.56')
    expect(translator.n(null, 'EUR')).toEqual('')
    expect(translator.n(null, 'USD')).toEqual('')

    translator.locale = new Intl.Locale('de-DE')
    expect(translator.n(1234.56, 'EUR')).toEqual('1.234,56\xA0€')
    expect(translator.n(1234.56, 'USD')).toEqual('1.234,56\xA0$')
    expect(translator.n(null, 'EUR')).toEqual('')
    expect(translator.n(null, 'USD')).toEqual('')
  })

  it('should format a date and time in various languages', () => {
    if (!translator) return skip()

    const date = new Date(1234567890123) // remember, by default the timezone is local, sooooo...

    const dateTimeEN = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
    const dateOnlyEN = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
    const timeOnlyEN = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' }).format(date)

    const dateTimeDE = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
    const dateOnlyDE = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date)
    const timeOnlyDE = new Intl.DateTimeFormat('de-DE', { timeStyle: 'medium' }).format(date)

    translator.locale = new Intl.Locale('en-US')

    expect(translator.d(date)).toEqual(dateTimeEN)
    expect(translator.d(date.getTime())).toEqual(dateTimeEN)
    expect(translator.d(date.toISOString())).toEqual(dateTimeEN)
    expect(translator.d(null)).toEqual('')
    expect(translator.d('')).toEqual('')
    expect(translator.d()).toEqual('')

    expect(translator.d(date, 'date')).toEqual(dateOnlyEN)
    expect(translator.d(date.getTime(), 'date')).toEqual(dateOnlyEN)
    expect(translator.d(date.toISOString(), 'date')).toEqual(dateOnlyEN)
    expect(translator.d(null, 'date')).toEqual('')
    expect(translator.d('', 'date')).toEqual('')

    expect(translator.d(date, 'time')).toEqual(timeOnlyEN)
    expect(translator.d(date.getTime(), 'time')).toEqual(timeOnlyEN)
    expect(translator.d(date.toISOString(), 'time')).toEqual(timeOnlyEN)
    expect(translator.d(null, 'time')).toEqual('')
    expect(translator.d('', 'time')).toEqual('')

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.d(date)).toEqual(dateTimeDE)
    expect(translator.d(date.getTime())).toEqual(dateTimeDE)
    expect(translator.d(date.toISOString())).toEqual(dateTimeDE)
    expect(translator.d(null)).toEqual('')
    expect(translator.d('')).toEqual('')
    expect(translator.d()).toEqual('')

    expect(translator.d(date, 'date')).toEqual(dateOnlyDE)
    expect(translator.d(date.getTime(), 'date')).toEqual(dateOnlyDE)
    expect(translator.d(date.toISOString(), 'date')).toEqual(dateOnlyDE)
    expect(translator.d(null, 'date')).toEqual('')
    expect(translator.d('', 'date')).toEqual('')

    expect(translator.d(date, 'time')).toEqual(timeOnlyDE)
    expect(translator.d(date.getTime(), 'time')).toEqual(timeOnlyDE)
    expect(translator.d(date.toISOString(), 'time')).toEqual(timeOnlyDE)
    expect(translator.d(null, 'time')).toEqual('')
    expect(translator.d('', 'time')).toEqual('')
  })

  it('should format a date and time in various languages with string styles', () => {
    if (!translator) return skip()

    const date = new Date(1234567890123) // remember, by default the timezone is local, sooooo...

    translator.locale = new Intl.Locale('en-US')

    expect(translator.d(date, 'short')).toEqual(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date),
    )
    expect(translator.d(date, 'medium')).toEqual(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(date),
    )
    expect(translator.d(date, 'long')).toEqual(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'long' }).format(date),
    )
    expect(translator.d(date, 'full')).toEqual(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'full' }).format(date),
    )

    expect(translator.d(date, 'shortDate')).toEqual(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(date),
    )
    expect(translator.d(date, 'mediumDate')).toEqual(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date),
    )
    expect(translator.d(date, 'longDate')).toEqual(new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullDate')).toEqual(new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(date))

    expect(translator.d(date, 'shortTime')).toEqual(
      new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(date),
    )
    expect(translator.d(date, 'mediumTime')).toEqual(
      new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' }).format(date),
    )
    expect(translator.d(date, 'longTime')).toEqual(new Intl.DateTimeFormat('en-US', { timeStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullTime')).toEqual(new Intl.DateTimeFormat('en-US', { timeStyle: 'full' }).format(date))

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.d(date, 'short')).toEqual(
      new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(date),
    )
    expect(translator.d(date, 'medium')).toEqual(
      new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'medium' }).format(date),
    )
    expect(translator.d(date, 'long')).toEqual(
      new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeStyle: 'long' }).format(date),
    )
    expect(translator.d(date, 'full')).toEqual(
      new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeStyle: 'full' }).format(date),
    )

    expect(translator.d(date, 'shortDate')).toEqual(
      new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' }).format(date),
    )
    expect(translator.d(date, 'mediumDate')).toEqual(
      new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date),
    )
    expect(translator.d(date, 'longDate')).toEqual(new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullDate')).toEqual(new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' }).format(date))

    expect(translator.d(date, 'shortTime')).toEqual(
      new Intl.DateTimeFormat('de-DE', { timeStyle: 'short' }).format(date),
    )
    expect(translator.d(date, 'mediumTime')).toEqual(
      new Intl.DateTimeFormat('de-DE', { timeStyle: 'medium' }).format(date),
    )
    expect(translator.d(date, 'longTime')).toEqual(new Intl.DateTimeFormat('de-DE', { timeStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullTime')).toEqual(new Intl.DateTimeFormat('de-DE', { timeStyle: 'full' }).format(date))
  })

  it('should format a date and time in various languages with object formats', () => {
    if (!translator) return skip()

    const date = new Date(1234567890123) // remember, by default the timezone is local, sooooo...

    translator.locale = new Intl.Locale('en-US')

    expect(
      translator.d(date, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long',
        timeZone: 'America/New_York',
        timeZoneName: 'long',
      }),
    ).toEqual('Friday, 02/13/2009, 18:31:30 Eastern Standard Time')

    translator.locale = new Intl.Locale('de-DE')

    expect(
      translator.d(date, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long',
        timeZone: 'Europe/Berlin',
        timeZoneName: 'long',
      }),
    ).toEqual('Samstag, 14.02.2009, 00:31:30 Mitteleuropäische Normalzeit')
  })

  it('should format ad date honoring the default time zone', () => {
    const translator = makeTranslator({
      defaultLanguage: 'en-GB',
      defaultTimeZone: 'UTC',
    })

    const date = new Date(1234567890123)

    const result1 = translator.d(date, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      timeZoneName: 'longOffset',
    })
    expect(result1).toMatch(/^13\/02\/2009, 23:31:30.123 GMT(\+00:00)?/)

    const result2 = translator.d(date, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      timeZoneName: 'longOffset',
      timeZone: 'America/New_York',
    })
    expect(result2).toEqual('13/02/2009, 18:31:30.123 GMT-05:00')

    const result3 = translator.d(
      date,
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        timeZoneName: 'longOffset',
      },
      'Asia/Tokyo',
    )
    expect(result3).toEqual('14/02/2009, 08:31:30.123 GMT+09:00')

    const result4 = translator.d(date, 'short')
    expect(result4).toEqual('13/02/2009, 23:31')

    const result5 = translator.d(date, 'short', 'Pacific/Auckland')
    expect(result5).toEqual('14/02/2009, 12:31')
  })

  it('should use the default time zone when a format time zone is undefined', () => {
    const date = new Date(1234567890123)
    const format = { hour: '2-digit', minute: '2-digit', timeZone: undefined } as const

    for (const defaultTimeZone of ['UTC', 'Asia/Tokyo']) {
      const translator = makeTranslator({
        defaultLanguage: 'en-GB',
        defaultTimeZone,
        dateTimeFormats: { custom: format },
      })
      const expected = new Intl.DateTimeFormat('en-GB', { ...format, timeZone: defaultTimeZone }).format(date)

      expect(translator.d(date, format)).toEqual(expected)
      expect(translator.d(date, 'custom')).toEqual(expected)
    }
  })

  it('should preserve non-enumerable format getters without modifying caller options', () => {
    class DateFormat implements Intl.DateTimeFormatOptions {
      get hour(): '2-digit' {
        return '2-digit'
      }
      get minute(): '2-digit' {
        return '2-digit'
      }
      get timeZone(): string {
        return 'UTC'
      }
    }

    const translator = makeTranslator({ defaultLanguage: 'en-GB' })
    const date = new Date(1234567890123)
    const formats = [
      Object.freeze(new DateFormat()),
      Object.freeze({ hour: '2-digit', minute: '2-digit', timeZone: 'UTC' } as const),
    ]

    for (const format of formats) {
      expect(translator.d(date, format)).toEqual('23:31')
      expect(translator.d(date, format, 'Asia/Tokyo')).toEqual('08:31')
      expect(format.timeZone).toEqual('UTC')
      expect(translator.d(date, format)).toEqual('23:31')
    }
  })

  it('should format a number in various languages with object formats', () => {
    if (!translator) return skip()

    translator.locale = new Intl.Locale('en-US')

    expect(
      translator.n(1234.56, {
        style: 'unit',
        unit: 'meter-per-second',
      }),
    ).toEqual('1,234.56 m/s')

    translator.locale = new Intl.Locale('de-DE')

    expect(
      translator.n(1234.56, {
        style: 'unit',
        unit: 'meter-per-second',
      }),
    ).toEqual('1.234,56 m/s')
  })

  it('should parameterize translations', () => {
    if (!translator) return skip()

    translator.locale = new Intl.Locale('en-US')

    expect(
      translator.t(
        {
          en: ' {n} items {foo} ',
          de: ' {n} Artikel {foo} ',
        },
        { n: '0', foo: 'Bar' },
      ),
    ).toEqual('0 items Bar')

    expect(
      translator.tc(
        {
          en: ' {n} items {foo} ',
          de: ' {n} Artikel {foo} ',
        },
        1,
      ),
    ).toEqual('1 items {foo}')

    expect(
      translator.t(
        {
          en: ' {n} items {foo} ',
          de: ' {n} Artikel {foo} ',
        },
        { n: null, foo: {} } as any,
      ),
    ).toEqual('items [object Object]') // edge case

    translator.locale = new Intl.Locale('de-DE')

    expect(
      translator.t(
        {
          en: ' {n} items {foo} ',
          de: ' {n} Artikel {foo} ',
        },
        { n: '0', foo: 'Bar' },
      ),
    ).toEqual('0 Artikel Bar')

    expect(
      translator.tc(
        {
          en: ' {n} items {foo} ',
          de: ' {n} Artikel {foo} ',
        },
        1,
      ),
    ).toEqual('1 Artikel {foo}')

    expect(
      translator.t(
        {
          en: ' {n} items {foo} ',
          de: ' {n} Artikel {foo} ',
        },
        { n: null, foo: {} } as any,
      ),
    ).toEqual('Artikel [object Object]') // edge case
  })

  it('should replace adjacent parameters and parameters after newlines', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = '{x}{x}{x}\n{x}\r\n{ x }'

    expect(translator.t({ en: message, de: message }, { x: 'A' })).toEqual('AAA\nA\r\nA')
  })

  it('should keep inserted parameter values literal regardless of parameter order', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = '{x} {y}'

    for (const params of [
      { x: '{y}', y: 'Alice' },
      { y: 'Alice', x: '{y}' },
    ]) {
      expect(translator.t({ en: message, de: message }, params)).toEqual('{y} Alice')
    }
  })

  it('should match parameter names case-sensitively', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = '{name} {NAME} {Name} {n} {N}'

    for (const params of [
      { name: 'lower', NAME: 'upper', N: 'Alice' },
      { N: 'Alice', NAME: 'upper', name: 'lower' },
    ]) {
      expect(translator.t({ en: message, de: message }, params)).toEqual('lower upper {Name} 1 Alice')
      expect(translator.tc({ en: message, de: message }, 2, params)).toEqual('lower upper {Name} 2 Alice')
    }
  })

  it('should treat parameter names as literal strings', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })

    for (const name of ['a.b', '[', 'a+b', '(x)', 'a$', 'x\\y', 'x{y}']) {
      const message = `{${name}}{${name}}`
      expect(translator.t({ en: message, de: message }, { [name]: 'A' })).toEqual('AA')
    }

    const message = '{a.b} {axb}'
    expect(translator.t({ en: message, de: message }, { 'a.b': 'A' })).toEqual('A {axb}')
  })

  it('should preserve escaped parameters alongside adjacent replacements', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = '\\{x}{x}\\{ X }{ X }\n\\{x}{missing}'

    expect(translator.t({ en: message, de: message }, { x: 'A', X: 'B' })).toEqual('{x}A{ X }B\n{x}{missing}')
  })

  it('should handle backslashes before placeholders like backslashes before pipes', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const slash = String.fromCharCode(92)

    for (let count = 0; count <= 6; count++) {
      const message = `prefix ${slash.repeat(count)}{ name }{name}`
      const translation = { en: message, de: message }
      const prefix = `prefix ${slash.repeat(Math.floor(count / 2))}`

      expect(translator.t(translation, { name: 'Alice' })).toEqual(
        prefix + (count % 2 ? '{ name }' : 'Alice') + 'Alice',
      )
      expect(translator.t(translation)).toEqual(prefix + (count % 2 ? '{ name }' : '{name}') + '{name}')
    }
  })

  it('should parse cached placeholders independently of supplied parameters', () => {
    const message = String.raw`Hello { name }, write \{ example }`
    const translator = makeTranslator({
      defaultLanguage: 'en',
      translations: { hello: { en: message, de: message } },
    })

    expect(translator.t('hello')).toEqual('Hello {name}, write { example }')
    expect(translator.t('hello', { name: 'Alice', example: 'ignored' })).toEqual('Hello Alice, write { example }')
    expect(translator.t('hello', { name: '{example}', example: 'ignored' })).toEqual(
      'Hello {example}, write { example }',
    )
    expect(translator.t('hello')).toEqual('Hello {name}, write { example }')

    translator.utils.updateTranslations({ hello: { en: 'Bye { name }' } })
    expect(translator.t('hello', { name: 'Alice' })).toEqual('Bye Alice')
  })

  it('should only replace placeholders with own parameter values', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = '{ constructor } { toString } { __proto__ }'
    const translation = { en: message, de: message }

    expect(translator.t(translation)).toEqual('{constructor} {toString} {__proto__}')
    expect(
      translator.t(translation, {
        ['constructor']: 'C',
        ['toString']: 'T',
        ['__proto__']: 'P',
      }),
    ).toEqual('C T P')
  })

  it('should preserve malformed placeholders and normalize missing balanced placeholders', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    for (const message of ['before {name', 'after name}', 'before {x{y}']) {
      expect(translator.t({ en: message, de: message }, { name: 'Alice', y: 'Y' })).toEqual(message)
    }

    const message = 'before { x{y} } after'
    expect(translator.t({ en: message, de: message })).toEqual('before {x{y}} after')
    expect(translator.t({ en: message, de: message }, { 'x{y}': 'value' })).toEqual('before value after')
  })

  it('should parse placeholders and escapes in every plural variant', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = String.raw`\{ absent } | { name } \| one | {n} { name }`
    const translation = { en: message, de: message }

    expect(translator.tc(translation, 0)).toEqual('{ absent }')
    expect(translator.tc(translation, 1)).toEqual('{name} | one')
    expect(translator.tc(translation, 2, { name: 'items' })).toEqual('2 items')
  })

  it('should pluralize translations', () => {
    if (!translator) return skip()

    translator.locale = new Intl.Locale('en-US')

    expect(
      translator.t(
        {
          en: ' {n} cat | {n} cats ',
          de: ' {n} Katze | {n} Katzen ',
        },
        { n: '-1' },
      ),
    ).toEqual('-1 cats')

    expect(
      translator.t(
        {
          en: ' {n} cat | {n} cats ',
          de: ' {n} Katze | {n} Katzen ',
        },
        { n: '1' },
      ),
    ).toEqual('1 cat')

    translator.locale = new Intl.Locale('de-DE')

    expect(
      translator.t(
        {
          en: ' {n} cat | {n} cats ',
          de: ' {n} Katze | {n} Katzen ',
        },
        { n: '-1' },
      ),
    ).toEqual('-1 Katzen')

    expect(
      translator.t(
        {
          en: ' {n} cat | {n} cats ',
          de: ' {n} Katze | {n} Katzen ',
        },
        { n: '1' },
      ),
    ).toEqual('1 Katze')
  })

  it('should unescape literal pipes in each plural variant', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = String.raw`none \| zero | one \| single | {n} \| many`
    const translation = { en: message, de: message }

    expect(translator.tc(translation, 0)).toEqual('none | zero')
    expect(translator.tc(translation, 1)).toEqual('one | single')
    expect(translator.tc(translation, 2)).toEqual('2 | many')
    expect(translator.t({ en: String.raw`A \| B`, de: '' })).toEqual('A | B')
  })

  it('should preserve literal backslashes before pipes', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const slash = String.fromCharCode(92)

    for (const count of [2, 3, 4, 5]) {
      const message = `one ${slash.repeat(count)}| many`
      const translation = { en: message, de: message }
      const singular = `one ${slash.repeat(Math.floor(count / 2))}`

      expect(translator.tc(translation, 1)).toEqual(count % 2 ? `${singular}| many` : singular)
      expect(translator.tc(translation, 2)).toEqual(count % 2 ? `${singular}| many` : 'many')
    }
  })

  it('should accept readonly translation tuples with one, two, or three variants', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const cases: { message: TranslationMessage; expected: readonly string[] }[] = [
      { message: ['same'] as const, expected: ['same', 'same', 'same'] },
      { message: ['one', '{n} many'] as const, expected: ['0 many', 'one', '2 many'] },
      { message: ['none', 'one', '{n} many'] as const, expected: ['none', 'one', '2 many'] },
    ]

    for (const { message, expected } of cases) {
      for (const n of [0, 1, 2]) {
        expect(translator.tc({ en: message, de: message }, n)).toEqual(expected[n])
      }
    }
  })

  it('should keep pipes literal in tuples while parsing placeholders and escapes', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const message = ['one | item', String.raw`{n} \| items \{ name }`] as const

    expect(translator.tc({ en: message, de: message }, 1)).toEqual('one | item')
    expect(translator.tc({ en: message, de: message }, 2, { name: 'ignored' })).toEqual(String.raw`2 \| items { name }`)
  })

  it('should omit trailing undefined tuple slots and preserve empty variants', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    const cases: { message: TranslationMessage; expected: readonly string[] }[] = [
      { message: ['same', undefined], expected: ['same', 'same', 'same'] },
      { message: ['same', undefined, undefined], expected: ['same', 'same', 'same'] },
      { message: ['one', 'many', undefined], expected: ['many', 'one', 'many'] },
      { message: ['', 'one', ''], expected: ['', 'one', ''] },
      { message: [''], expected: ['', '', ''] },
    ]

    for (const { message, expected } of cases) {
      for (const n of [0, 1, 2]) {
        expect(translator.tc({ en: message, de: 'fallback' }, n)).toEqual(expected[n])
      }
    }
  })

  it('should reject tuple gaps when initializing, updating, or translating inline', () => {
    const invalid = ['none', undefined, 'many'] as const
    const translator = makeTranslator({ defaultLanguage: 'en' })

    expect(() =>
      makeTranslator({ defaultLanguage: 'en', translations: { hello: { en: invalid, de: '' } } }),
    ).toThrowError(TypeError)
    expect(() => translator.utils.updateTranslations({ hello: { en: invalid } })).toThrowError(TypeError)
    expect(() => translator.t({ en: invalid, de: '' })).toThrowError(TypeError)
  })

  it('should reject invalid tuple lengths from untyped input', () => {
    const translator = makeTranslator({ defaultLanguage: 'en' })
    for (const message of [[], ['a', 'b', 'c', 'd']]) {
      expect(() => translator.t({ en: message as unknown as TranslationMessage, de: '' })).toThrowError(TypeError)
    }
  })

  it('should leave translations unchanged when an update contains an invalid tuple', () => {
    const translator = makeTranslator({
      defaultLanguage: 'en',
      translations: { hello: { en: 'original', de: '' } },
    })
    expect(translator.t('hello')).toEqual('original')
    expect(() =>
      translator.utils.updateTranslations({
        hello: { en: 'partial update' },
        cats: { en: ['none', undefined, 'many'] },
      }),
    ).toThrowError(TypeError)

    // Force the next lookup to read stored messages rather than the old cache.
    translator.utils.updateTranslations({ cats: { en: 'cats' } })
    expect(translator.t('hello')).toEqual('original')
  })

  it('should copy tuples on initialization and updates, including before cache population', () => {
    const original: [string, string] = ['one', 'many']
    const translator = makeTranslator({
      defaultLanguage: 'en',
      translations: { hello: { en: original, de: original } },
    })
    original[0] = 'mutated'
    original[1] = 'mutated'
    expect(translator.tc('hello', 1)).toEqual('one')
    expect(translator.tc('hello', 2)).toEqual('many')
    translator.language = 'de'
    expect(translator.tc('hello', 1)).toEqual('one')

    const update: [string, string, string] = ['zero updated', 'one updated', 'many updated']
    translator.utils.updateTranslations({ hello: { en: update } })
    update.fill('mutated')
    translator.language = 'en'
    expect(translator.tc('hello', 0)).toEqual('zero updated')
    expect(translator.tc('hello', 1)).toEqual('one updated')
    expect(translator.tc('hello', 2)).toEqual('many updated')

    translator.utils.updateTranslations({ hello: { de: 'cache invalidation' } })
    expect(translator.tc('hello', 2)).toEqual('many updated')
  })

  it('should use tuples in regional translations and fall back to string messages', () => {
    const translator = makeTranslator({
      defaultLanguage: 'en-US',
      translations: { hello: { 'en': 'one | many', 'de': '', 'de-AT': ['eins', 'viele'] as const } },
    })

    translator.locale = new Intl.Locale('de-AT')
    expect(translator.tc('hello', 2)).toEqual('viele')
    translator.region = 'DE'
    expect(translator.tc('hello', 2)).toEqual('many')
    translator.utils.updateTranslations({ hello: { 'de-DE': ['eines', 'mehrere'] as const } })
    expect(translator.tc('hello', 2)).toEqual('mehrere')
  })

  it('should pluralize translations with an option for zero', () => {
    if (!translator) return skip()

    translator.locale = new Intl.Locale('en-US')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat | {n} cats ',
          de: ' keine Katzen | eine Katze | {n} Katzen ',
        },
        0,
      ),
    ).toEqual('no cats')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat \\{n} | {n} cats ',
          de: ' keine Katzen | eine Katze \\{n} | {n} Katzen ',
        },
        1,
      ),
    ).toEqual('one cat {n}')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat | {n} cats ',
          de: ' keine Katzen | eine Katze | {n} Katzen ',
        },
        2,
      ),
    ).toEqual('2 cats')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat | {n} cats ',
          de: ' keine Katzen | eine Katze | {n} Katzen ',
        },
        1234.56,
      ),
    ).toEqual('1,234.56 cats')

    translator.locale = new Intl.Locale('de-DE')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat | {n} cats ',
          de: ' keine Katzen | eine Katze | {n} Katzen ',
        },
        0,
      ),
    ).toEqual('keine Katzen')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat \\{n} | {n} cats ',
          de: ' keine Katzen | eine Katze \\{n} | {n} Katzen ',
        },
        1,
      ),
    ).toEqual('eine Katze {n}')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat | {n} cats ',
          de: ' keine Katzen | eine Katze | {n} Katzen ',
        },
        2,
      ),
    ).toEqual('2 Katzen')

    expect(
      translator.tc(
        {
          en: ' no cats | one cat | {n} cats ',
          de: ' keine Katzen | eine Katze | {n} Katzen ',
        },
        1234.56,
      ),
    ).toEqual('1.234,56 Katzen')
  })

  it('should configure default formats', () => {
    const translator = makeTranslator({
      defaultLanguage: 'en',
      dateTimeFormats: {
        default: {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'UTC',
        },
        date: { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' },
        time: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
      },
      numberFormats: {
        default: { style: 'unit', unit: 'meter-per-second' },
        test: { style: 'currency', currency: 'JPY' },
      },
    })

    const date = new Date(1234567890123)

    translator.locale = new Intl.Locale('en-US')
    expect(translator.d(date)).toEqual('02/13/2009, 23:31:30')
    expect(translator.d(date, 'date')).toEqual('02/13/2009')
    expect(translator.d(date, 'time')).toEqual('23:31:30')
    expect(translator.n(1234.56)).toEqual('1,234.56 m/s')
    expect(translator.n(1234.56, 'test')).toEqual('¥1,235') // no decimal on JPY
    expect(translator.n(1234.56, 'EUR')).toEqual('€1,234.56')

    translator.locale = new Intl.Locale('de-DE')
    expect(translator.d(date)).toEqual('13.02.2009, 23:31:30')
    expect(translator.d(date, 'date')).toEqual('13.02.2009')
    expect(translator.d(date, 'time')).toEqual('23:31:30')
    expect(translator.n(1234.56)).toEqual('1.234,56 m/s')
    expect(translator.n(1234.56, 'test')).toEqual('1.235\xA0¥')
    expect(translator.n(1234.56, 'EUR')).toEqual('1.234,56\xA0€')
  })

  describe('Edge Cases', () => {
    it('should warn with an invalid locales', () => {
      const translator = makeTranslator({ defaultLanguage: new Intl.Locale('xx-ZZ') })

      expect(translator.locale.language).toEqual('xx')
      expect(translator.locale.region).toEqual('ZZ')
      expect(translator.language).toEqual('xx')
      expect(translator.region).toEqual('ZZ')

      translator.language = 'zz' as any
      translator.region = 'XX' as any
      expect(translator.language).toEqual('zz')
      expect(translator.region).toEqual('XX')
      expect(translator.locale.toString()).toEqual('zz-XX')

      translator.language = 'qq' as any
      translator.region = false as any
      expect(translator.language).toEqual('qq')
      expect(translator.region).toEqual(undefined)
      expect(translator.locale.toString()).toEqual('qq')
    })

    it('should fail when translating an empty key', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(() => translator.t('' as any)).toThrowError('No translation key specified')
    })

    it('should warn when translating a missing translation', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.t('flipper' as any)).toEqual('flipper')
    })

    it('should warn when missing the default language', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.t({ de: 'flipper' } as any)).toEqual('')
    })

    it('should warn when the date time format is invalid', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.d(new Date(), 'bogus')).toBeA('string')
    })

    it('should warn when the number format is invalid', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.n(1234.56, 'bogus')).toBeA('string')
    })
  })

  describe('Static data', () => {
    it('should export the array of all known ISO-3166-1 countries', () => {
      expect(ISO_COUNTRIES).toEqual(Object.keys(countries).sort())
    })

    it('should export the array of all known ISO-639-1 languages', () => {
      expect(ISO_LANGUAGES).toEqual(Object.keys(languages).sort())
    })

    it('should validate an ISO-3166-1 country code', () => {
      expect(isISOCountry('US')).toEqual(true)
      expect(isISOCountry('ZZ')).toEqual(false)
    })

    it('should validate an ISO-639-1 language code', () => {
      expect(isISOLanguage('en')).toEqual(true)
      expect(isISOLanguage('zz')).toEqual(false)
    })

    it('should validate an ISO-4217 currency code', () => {
      expect(isISOCurrency('EUR')).toEqual(true)
      expect(isISOCurrency('ZZZ')).toEqual(false)
    })

    it('should return valid country names for each of our countries', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      for (const country of [...ISO_COUNTRIES, 'EU', 'UN'] as const) {
        const value = translator.utils.country(country)
        expect(value).toBeA('string')
        expect(value.length, `Code: ${country}`).toBeGreaterThan(2) // no codes
      }
    })

    it('should return valid language names for each of our language', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      for (const language of ISO_LANGUAGES) {
        const value = translator.utils.language(language)
        expect(value, `Code: ${language}`).toBeA('string')
        expect(value.length, `Code: ${language}`).toBeGreaterThan(2) // no codes
      }
    })

    it('should return valid flags for each of our countries', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      for (const country of [...ISO_COUNTRIES, 'EU', 'UN'] as const) {
        const value = translator.utils.flag(country)
        expect(value, `Code: ${country}`).toBeA('string')
        expect(value.length, `Code: ${country}`).toEqual(4) // 2 codepoints
        expect(
          [
            String.fromCharCode(value.codePointAt(0)! - 0x1f1a5),
            String.fromCharCode(value.codePointAt(2)! - 0x1f1a5),
          ].join(''),
        ).toEqual(country)
      }
    })
  })

  describe('Translation updates', () => {
    it('should update translations', () => {
      const translator = makeTranslator({
        defaultLanguage: 'en',
        translations: {
          hello: {
            en: 'Hello, World!',
            de: 'Hallo, Welt!',
          },
        },
      })

      translator.language = 'en'
      expect(translator.t('hello')).toEqual('Hello, World!')
      translator.language = 'de'
      expect(translator.t('hello')).toEqual('Hallo, Welt!')

      translator.utils.updateTranslations({
        hello: {
          en: 'Hello, Again!',
        },
      })

      translator.language = 'en'
      expect(translator.t('hello')).toEqual('Hello, Again!')
      translator.language = 'de'
      expect(translator.t('hello')).toEqual('Hallo, Welt!')

      translator.utils.updateTranslations({
        null: null,
        undefined: undefined,
        silly: { en: null },
        missing: {
          de: 'No way this existed!',
        },
      } as any)

      translator.language = 'en'
      expect(translator.t('missing' as any)).toEqual('') // empty
      translator.language = 'de'
      expect(translator.t('missing' as any)).toEqual('No way this existed!')
    })
  })
})
