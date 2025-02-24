import { describe, expect, it } from 'vitest'

import { ISO_COUNTRIES, ISO_LANGUAGES } from '../lib'
import { makeTranslator } from '../lib/translator'
import countries from './data/iso_3166-1.json'
import languages from './data/iso_639-1.json'

import type { Translator } from '../lib/translator'

describe('I18N Plugin', () => {
  let translator: Translator

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
      },
    })

    expect(translator).toBeDefined()

    expect(translator.language).toBe('en')
    expect(translator.region).toBeUndefined()
    expect(translator.locale.toString()).toBe('en')
  })

  it('should translate a string in various languages', (context) => {
    if (!translator) return context.skip()

    expect(translator.t('hello')).toBe('Hello, World!')

    translator.language = 'de'
    expect(translator.t('hello')).toBe('Hallo, Welt!')
    expect(translator.language).toBe('de')
    expect(translator.region).toBeUndefined()
    expect(translator.locale.toString()).toBe('de')

    translator.region = 'DE'
    expect(translator.t('hello')).toBe('Hallo, Deutschland!')
    expect(translator.language).toBe('de')
    expect(translator.region).toBe('DE')
    expect(translator.locale.toString()).toBe('de-DE')

    translator.region = 'AT'
    expect(translator.t('hello')).toBe('Hallo, Österreich!')
    expect(translator.language).toBe('de')
    expect(translator.region).toBe('AT')
    expect(translator.locale.toString()).toBe('de-AT')
  })

  it('should find the best match for missing languages', (context) => {
    if (!translator) return context.skip()

    translator.locale = new Intl.Locale('de-CH')
    expect(translator.t('hello')).toBe('Hallo, Welt!')

    translator.locale = new Intl.Locale('ja-JP')
    expect(translator.t('hello')).toBe('Hello, World!')
  })

  it('should format a number in various languages', (context) => {
    if (!translator) return context.skip()

    translator.locale = new Intl.Locale('en-US')
    expect(translator.n(1234.56)).toBe('1,234.56')
    expect(translator.n(null)).toBe('')
    expect(translator.n()).toBe('')

    translator.locale = new Intl.Locale('de-DE')
    expect(translator.n(1234.56)).toBe('1.234,56')
    expect(translator.n(null)).toBe('')
    expect(translator.n()).toBe('')
  })

  it('should format a number (as a currency) in various languages', (context) => {
    if (!translator) return context.skip()

    translator.locale = new Intl.Locale('en-US')
    expect(translator.n(1234.56, 'EUR')).toBe('€1,234.56')
    expect(translator.n(1234.56, 'USD')).toBe('$1,234.56')
    expect(translator.n(null, 'EUR')).toBe('')
    expect(translator.n(null, 'USD')).toBe('')

    translator.locale = new Intl.Locale('de-DE')
    expect(translator.n(1234.56, 'EUR')).toBe('1.234,56\xA0€')
    expect(translator.n(1234.56, 'USD')).toBe('1.234,56\xA0$')
    expect(translator.n(null, 'EUR')).toBe('')
    expect(translator.n(null, 'USD')).toBe('')
  })

  it('should format a date and time in various languages', (context) => {
    if (!translator) return context.skip()

    const date = new Date(1234567890123) // remember, by default the timezone is local, sooooo...

    const dateTimeEN = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
    const dateOnlyEN = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
    const timeOnlyEN = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' }).format(date)

    const dateTimeDE = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
    const dateOnlyDE = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date)
    const timeOnlyDE = new Intl.DateTimeFormat('de-DE', { timeStyle: 'medium' }).format(date)

    translator.locale = new Intl.Locale('en-US')

    expect(translator.d(date)).toBe(dateTimeEN)
    expect(translator.d(date.getTime())).toBe(dateTimeEN)
    expect(translator.d(date.toISOString())).toBe(dateTimeEN)
    expect(translator.d(null)).toBe('')
    expect(translator.d('')).toBe('')
    expect(translator.d()).toBe('')

    expect(translator.d(date, 'date')).toBe(dateOnlyEN)
    expect(translator.d(date.getTime(), 'date')).toBe(dateOnlyEN)
    expect(translator.d(date.toISOString(), 'date')).toBe(dateOnlyEN)
    expect(translator.d(null, 'date')).toBe('')
    expect(translator.d('', 'date')).toBe('')

    expect(translator.d(date, 'time')).toBe(timeOnlyEN)
    expect(translator.d(date.getTime(), 'time')).toBe(timeOnlyEN)
    expect(translator.d(date.toISOString(), 'time')).toBe(timeOnlyEN)
    expect(translator.d(null, 'time')).toBe('')
    expect(translator.d('', 'time')).toBe('')

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.d(date)).toBe(dateTimeDE)
    expect(translator.d(date.getTime())).toBe(dateTimeDE)
    expect(translator.d(date.toISOString())).toBe(dateTimeDE)
    expect(translator.d(null)).toBe('')
    expect(translator.d('')).toBe('')
    expect(translator.d()).toBe('')

    expect(translator.d(date, 'date')).toBe(dateOnlyDE)
    expect(translator.d(date.getTime(), 'date')).toBe(dateOnlyDE)
    expect(translator.d(date.toISOString(), 'date')).toBe(dateOnlyDE)
    expect(translator.d(null, 'date')).toBe('')
    expect(translator.d('', 'date')).toBe('')

    expect(translator.d(date, 'time')).toBe(timeOnlyDE)
    expect(translator.d(date.getTime(), 'time')).toBe(timeOnlyDE)
    expect(translator.d(date.toISOString(), 'time')).toBe(timeOnlyDE)
    expect(translator.d(null, 'time')).toBe('')
    expect(translator.d('', 'time')).toBe('')
  })

  it('should format a date and time in various languages with string styles', (context) => {
    if (!translator) return context.skip()

    const date = new Date(1234567890123) // remember, by default the timezone is local, sooooo...

    translator.locale = new Intl.Locale('en-US')

    expect(translator.d(date, 'short')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date))
    expect(translator.d(date, 'medium')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(date))
    expect(translator.d(date, 'long')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'long' }).format(date))
    expect(translator.d(date, 'full')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'full' }).format(date))

    expect(translator.d(date, 'shortDate')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(date))
    expect(translator.d(date, 'mediumDate')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date))
    expect(translator.d(date, 'longDate')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullDate')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(date))

    expect(translator.d(date, 'shortTime')).toBe(new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(date))
    expect(translator.d(date, 'mediumTime')).toBe(new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' }).format(date))
    expect(translator.d(date, 'longTime')).toBe(new Intl.DateTimeFormat('en-US', { timeStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullTime')).toBe(new Intl.DateTimeFormat('en-US', { timeStyle: 'full' }).format(date))

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.d(date, 'short')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(date))
    expect(translator.d(date, 'medium')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'medium' }).format(date))
    expect(translator.d(date, 'long')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeStyle: 'long' }).format(date))
    expect(translator.d(date, 'full')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeStyle: 'full' }).format(date))

    expect(translator.d(date, 'shortDate')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' }).format(date))
    expect(translator.d(date, 'mediumDate')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date))
    expect(translator.d(date, 'longDate')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullDate')).toBe(new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' }).format(date))

    expect(translator.d(date, 'shortTime')).toBe(new Intl.DateTimeFormat('de-DE', { timeStyle: 'short' }).format(date))
    expect(translator.d(date, 'mediumTime')).toBe(new Intl.DateTimeFormat('de-DE', { timeStyle: 'medium' }).format(date))
    expect(translator.d(date, 'longTime')).toBe(new Intl.DateTimeFormat('de-DE', { timeStyle: 'long' }).format(date))
    expect(translator.d(date, 'fullTime')).toBe(new Intl.DateTimeFormat('de-DE', { timeStyle: 'full' }).format(date))
  })

  it('should format a date and time in various languages with object formats', (context) => {
    if (!translator) return context.skip()

    const date = new Date(1234567890123) // remember, by default the timezone is local, sooooo...

    translator.locale = new Intl.Locale('en-US')

    expect(translator.d(date, {
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
    })).toBe('Friday, 02/13/2009, 18:31:30 Eastern Standard Time')

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.d(date, {
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
    })).toBe('Samstag, 14.02.2009, 00:31:30 Mitteleuropäische Normalzeit')
  })

  it('should format a number in various languages with object formats', (context) => {
    if (!translator) return context.skip()

    translator.locale = new Intl.Locale('en-US')

    expect(translator.n(1234.56, {
      style: 'unit',
      unit: 'meter-per-second',
    })).toBe('1,234.56 m/s')

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.n(1234.56, {
      style: 'unit',
      unit: 'meter-per-second',
    })).toBe('1.234,56 m/s')
  })

  it('should parameterize translations', (context) => {
    if (!translator) return context.skip()

    translator.locale = new Intl.Locale('en-US')

    expect(translator.t({
      en: ' {n} items {foo} ',
      de: ' {n} Artikel {foo} ',
    }, { n: '0', foo: 'Bar' })).toBe('0 items Bar')

    expect(translator.tc({
      en: ' {n} items {foo} ',
      de: ' {n} Artikel {foo} ',
    }, 1)).toBe('1 items {foo}')

    expect(translator.t({
      en: ' {n} items {foo} ',
      de: ' {n} Artikel {foo} ',
    }, { n: null, foo: {} } as any)).toBe('items [object Object]') // edge case

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.t({
      en: ' {n} items {foo} ',
      de: ' {n} Artikel {foo} ',
    }, { n: '0', foo: 'Bar' })).toBe('0 Artikel Bar')

    expect(translator.tc({
      en: ' {n} items {foo} ',
      de: ' {n} Artikel {foo} ',
    }, 1)).toBe('1 Artikel {foo}')

    expect(translator.t({
      en: ' {n} items {foo} ',
      de: ' {n} Artikel {foo} ',
    }, { n: null, foo: {} } as any )).toBe('Artikel [object Object]') // edge case
  })

  it('should pluralize translations', (context) => {
    if (!translator) return context.skip()

    translator.locale = new Intl.Locale('en-US')

    expect(translator.t({
      en: ' {n} cat | {n} cats ',
      de: ' {n} Katze | {n} Katzen ',
    }, { n: '-1' })).toBe('-1 cats')

    expect(translator.t({
      en: ' {n} cat | {n} cats ',
      de: ' {n} Katze | {n} Katzen ',
    }, { n: '1' })).toBe('1 cat')

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.t({
      en: ' {n} cat | {n} cats ',
      de: ' {n} Katze | {n} Katzen ',
    }, { n: '-1' })).toBe('-1 Katzen')

    expect(translator.t({
      en: ' {n} cat | {n} cats ',
      de: ' {n} Katze | {n} Katzen ',
    }, { n: '1' })).toBe('1 Katze')
  })

  it('should pluralize translations with an option for zero', (context) => {
    if (!translator) return context.skip()

    translator.locale = new Intl.Locale('en-US')

    expect(translator.tc({
      en: ' no cats | one cat | {n} cats ',
      de: ' keine Katzen | eine Katze | {n} Katzen ',
    }, 0)).toBe('no cats')

    expect(translator.tc({
      en: ' no cats | one cat \\{n} | {n} cats ',
      de: ' keine Katzen | eine Katze \\{n} | {n} Katzen ',
    }, 1)).toBe('one cat {n}')

    expect(translator.tc({
      en: ' no cats | one cat | {n} cats ',
      de: ' keine Katzen | eine Katze | {n} Katzen ',
    }, 2)).toBe('2 cats')

    expect(translator.tc({
      en: ' no cats | one cat | {n} cats ',
      de: ' keine Katzen | eine Katze | {n} Katzen ',
    }, 1234.56)).toBe('1,234.56 cats')

    translator.locale = new Intl.Locale('de-DE')

    expect(translator.tc({
      en: ' no cats | one cat | {n} cats ',
      de: ' keine Katzen | eine Katze | {n} Katzen ',
    }, 0)).toBe('keine Katzen')

    expect(translator.tc({
      en: ' no cats | one cat \\{n} | {n} cats ',
      de: ' keine Katzen | eine Katze \\{n} | {n} Katzen ',
    }, 1)).toBe('eine Katze {n}')

    expect(translator.tc({
      en: ' no cats | one cat | {n} cats ',
      de: ' keine Katzen | eine Katze | {n} Katzen ',
    }, 2)).toBe('2 Katzen')

    expect(translator.tc({
      en: ' no cats | one cat | {n} cats ',
      de: ' keine Katzen | eine Katze | {n} Katzen ',
    }, 1234.56)).toBe('1.234,56 Katzen')
  })

  it('should configure default formats', () => {
    const translator = makeTranslator({
      defaultLanguage: 'en',
      dateTimeFormats: {
        default: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
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
    expect(translator.d(date)).toBe('02/13/2009, 23:31:30')
    expect(translator.d(date, 'date')).toBe('02/13/2009')
    expect(translator.d(date, 'time')).toBe('23:31:30')
    expect(translator.n(1234.56)).toBe('1,234.56 m/s')
    expect(translator.n(1234.56, 'test')).toBe('¥1,235') // no decimal on JPY
    expect(translator.n(1234.56, 'EUR')).toBe('€1,234.56')

    translator.locale = new Intl.Locale('de-DE')
    expect(translator.d(date)).toBe('13.02.2009, 23:31:30')
    expect(translator.d(date, 'date')).toBe('13.02.2009')
    expect(translator.d(date, 'time')).toBe('23:31:30')
    expect(translator.n(1234.56)).toBe('1.234,56 m/s')
    expect(translator.n(1234.56, 'test')).toBe('1.235\xA0¥')
    expect(translator.n(1234.56, 'EUR')).toBe('1.234,56\xA0€')
  })

  describe('Edge Cases', () => {
    it('should warn with an invalid locales', () => {
      const translator = makeTranslator({ defaultLanguage: new Intl.Locale('xx-ZZ') })

      expect(translator.locale.language).toBe('xx')
      expect(translator.locale.region).toBe('ZZ')
      expect(translator.language).toBe('xx')
      expect(translator.region).toBe('ZZ')

      translator.language = 'zz' as any
      translator.region = 'XX' as any
      expect(translator.language).toBe('zz')
      expect(translator.region).toBe('XX')
      expect(translator.locale.toString()).toBe('zz-XX')

      translator.language = 'qq' as any
      translator.region = false as any
      expect(translator.language).toBe('qq')
      expect(translator.region).toBe(undefined)
      expect(translator.locale.toString()).toBe('qq')
    })

    it('should fail when translating an empty key', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(() => translator.t('')).toThrow('No translation key specified')
    })

    it('should warn when translating a missing translation', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.t('flipper')).toBe('flipper')
    })

    it('should warn when missing the default language', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.t({ de: 'flipper' })).toBe('')
    })

    it('should warn when the date time format is invalid', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.d(new Date(), 'bogus')).toBeTypeOf('string')
    })

    it('should warn when the number format is invalid', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      expect(translator.n(1234.56, 'bogus')).toBeTypeOf('string')
    })
  })

  describe('Static data', () => {
    it('should export the array of all known ISO-3166-1 countries', () => {
      expect(ISO_COUNTRIES).toEqual(Object.keys(countries).sort())
    })

    it('should export the array of all known ISO-639-1 languages', () => {
      expect(ISO_LANGUAGES).toEqual(Object.keys(languages).sort())
    })

    it('should return valid country names for each of our countries', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      for (const country of [ ...ISO_COUNTRIES, 'EU', 'UN' ] as const) {
        const value = translator.utils.country(country)
        expect(value).toBeTypeOf('string')
        expect(value.length, `Code: ${country}`).toBeGreaterThan(2) // no codes
      }
    })

    it('should return valid language names for each of our language', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      for (const language of ISO_LANGUAGES) {
        const value = translator.utils.language(language)
        expect(value, `Code: ${language}`).toBeTypeOf('string')
        expect(value.length, `Code: ${language}`).toBeGreaterThan(2) // no codes
      }
    })

    it('should return valid flags for each of our countries', () => {
      const translator = makeTranslator({ defaultLanguage: 'en' })
      for (const country of [ ...ISO_COUNTRIES, 'EU', 'UN' ] as const) {
        const value = translator.utils.flag(country)
        expect(value, `Code: ${country}`).toBeTypeOf('string')
        expect(value.length, `Code: ${country}`).toEqual(4) // 2 codepoints
        expect([
          String.fromCharCode(value.codePointAt(0)! - 0x1f1a5),
          String.fromCharCode(value.codePointAt(2)! - 0x1f1a5),
        ].join('')).toEqual(country)
      }
    })
  })
})
