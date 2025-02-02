import { describe } from 'node:test'

import { expect, it } from 'vitest'
import { createApp } from 'vue'

import { i18n, useTranslator } from '../lib'

describe('I18n Plugin with Vue Apps', () => {
  const date = new Date(1234567890123)

  it('should initialize the plugin with options', () => {
    const app = createApp({}).use(i18n, {
      defaultLanguage: 'en',
      formats: {
        dateOnlyFormat: { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' },
        timeOnlyFormat: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
        dateTimeFormat: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
        numberFormat: { style: 'currency', currency: 'USD' }, // bogus, all numbers are currencies, but it's just a test
      },
      translations: {
        hello: {
          'en': 'Hello, World!',
          'de': 'Hallo, Welt!',
          'de-DE': 'Hallo, Deutschland!',
          'de-AT': 'Hallo, Österreich!',
        },
        cats: {
          en: ' no cats | one cat | {n} cats, {n}, really {n} ',
          de: ' keine Katzen | eine Katze | {n} Katzen, {n}, wirklich {n} ',
        },
      },
    })

    app.runWithContext(function() {
      const translator = useTranslator()

      translator.locale = new Intl.Locale('en-US')
      expect(translator.t('hello')).toBe('Hello, World!')
      expect(translator.tc('cats', 0)).toBe('no cats')
      expect(translator.tc('cats', 1)).toBe('one cat')
      expect(translator.tc('cats', 2)).toBe('$2.00 cats, $2.00, really $2.00')

      expect(translator.d(date)).toBe('02/13/2009, 23:31:30')
      expect(translator.d.date(date)).toBe('02/13/2009')
      expect(translator.d.time(date)).toBe('23:31:30')
      expect(translator.n(1234.56)).toBe('$1,234.56')

      translator.locale = new Intl.Locale('de-DE')
      expect(translator.t('hello')).toBe('Hallo, Deutschland!')
      expect(translator.tc('cats', 0)).toBe('keine Katzen')
      expect(translator.tc('cats', 1)).toBe('eine Katze')
      expect(translator.tc('cats', 2)).toBe('2,00\xA0$ Katzen, 2,00\xA0$, wirklich 2,00\xA0$')

      expect(translator.d(date)).toBe('13.02.2009, 23:31:30')
      expect(translator.d.date(date)).toBe('13.02.2009')
      expect(translator.d.time(date)).toBe('23:31:30')
      expect(translator.n(1234.56)).toBe('1.234,56\xA0$')
    })
  })

  it('should initialize the plugin with a language', () => {
    const app = createApp({}).use(i18n, 'en')

    app.runWithContext(function() {
      const translator = useTranslator()

      translator.locale = new Intl.Locale('de-DE') // completely unknown
      expect(translator.t({ en: 'Hello, World!' })).toBe('Hello, World!')
    })
  })

  it('should fail when the plugin is not configured', () => {
    const app = createApp({})

    app.runWithContext(function() {
      expect(() => useTranslator()).toThrowError('No translator found in the Vue app')
    })
  })
})
