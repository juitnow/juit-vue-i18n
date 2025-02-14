import { describe } from 'node:test'

import { expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'

import { i18n, useTranslator } from '../lib'
import TestComponent from './test.vue'

describe('I18n Plugin with Vue Apps', () => {
  const date = new Date(1234567890123)

  it('should initialize the plugin with options', () => {
    const app = createApp({}).use(i18n, {
      defaultLanguage: 'en',
      dateTimeFormats: {
        default: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
        date: { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' },
        time: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
      },
      numberFormats: {
        default: { style: 'currency', currency: 'USD' },
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
      expect(translator.d(date, 'date')).toBe('02/13/2009')
      expect(translator.d(date, 'time')).toBe('23:31:30')
      expect(translator.n(1234.56)).toBe('$1,234.56')

      translator.locale = new Intl.Locale('de-DE')
      expect(translator.t('hello')).toBe('Hallo, Deutschland!')
      expect(translator.tc('cats', 0)).toBe('keine Katzen')
      expect(translator.tc('cats', 1)).toBe('eine Katze')
      expect(translator.tc('cats', 2)).toBe('2,00\xA0$ Katzen, 2,00\xA0$, wirklich 2,00\xA0$')

      expect(translator.d(date)).toBe('13.02.2009, 23:31:30')
      expect(translator.d(date, 'date')).toBe('13.02.2009')
      expect(translator.d(date, 'time')).toBe('23:31:30')
      expect(translator.n(1234.56)).toBe('1.234,56\xA0$')
    })
  })

  it('should use the $t, $d, $n, ... aliases in templates', async () => {
    const app = createApp(TestComponent).use(i18n, {
      defaultLanguage: 'en',
      dateTimeFormats: {
        default: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
        date: { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' },
        time: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' },
      },
      numberFormats: {
        default: { style: 'currency', currency: 'USD' },
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

    document.body.innerHTML = '<div id="app"></div>'
    app.mount('#app')

    await nextTick()

    expect(document.querySelector('#t')?.innerHTML).toBe('Hello, World!')
    expect(document.querySelector('#tc0')?.innerHTML).toBe('no cats')
    expect(document.querySelector('#tc1')?.innerHTML).toBe('one cat')
    expect(document.querySelector('#tc2')?.innerHTML).toBe('$2.00 cats, $2.00, really $2.00')
    expect(document.querySelector('#d')?.innerHTML).toBe('02/13/2009, 23:31:30')
    expect(document.querySelector('#ddate')?.innerHTML).toBe('02/13/2009')
    expect(document.querySelector('#dtime')?.innerHTML).toBe('23:31:30')
    expect(document.querySelector('#n')?.innerHTML).toBe('$1,234.56')
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
