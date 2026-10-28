import { i18n, useTranslator } from '@juit/vue-i18n'
import { JSDOM } from 'jsdom'
import { createApp, defineComponent, getCurrentInstance } from 'vue'

import { createJSDomApp } from './jsdom-vue.ts'

describe('I18n Plugin with Vue Apps', () => {
  const date = new Date(1234567890123)

  it('should initialize the plugin with options', () => {
    const app = createApp({}).use(i18n, {
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

    app.runWithContext(function () {
      const translator = useTranslator()

      translator.locale = new Intl.Locale('en-US')
      expect(translator.t('hello')).toEqual('Hello, World!')
      expect(translator.tc('cats', 0)).toEqual('no cats')
      expect(translator.tc('cats', 1)).toEqual('one cat')
      expect(translator.tc('cats', 2)).toEqual('$2.00 cats, $2.00, really $2.00')

      expect(translator.d(date)).toEqual('02/13/2009, 23:31:30')
      expect(translator.d(date, 'date')).toEqual('02/13/2009')
      expect(translator.d(date, 'time')).toEqual('23:31:30')
      expect(translator.n(1234.56)).toEqual('$1,234.56')

      translator.locale = new Intl.Locale('de-DE')
      expect(translator.t('hello')).toEqual('Hallo, Deutschland!')
      expect(translator.tc('cats', 0)).toEqual('keine Katzen')
      expect(translator.tc('cats', 1)).toEqual('eine Katze')
      expect(translator.tc('cats', 2)).toEqual('2,00\xA0$ Katzen, 2,00\xA0$, wirklich 2,00\xA0$')

      expect(translator.d(date)).toEqual('13.02.2009, 23:31:30')
      expect(translator.d(date, 'date')).toEqual('13.02.2009')
      expect(translator.d(date, 'time')).toEqual('23:31:30')
      expect(translator.n(1234.56)).toEqual('1.234,56\xA0$')
    })
  })

  it('should use the $t, $d, $n, ... aliases in templates', async () => {
    let success = false

    const component = defineComponent({
      setup() {
        const instance = getCurrentInstance()!
        expect(instance).toBeDefined()
        expect(instance.appContext.config.globalProperties.$t).toBeA('function')
        expect(instance.appContext.config.globalProperties.$tc).toBeA('function')
        expect(instance.appContext.config.globalProperties.$d).toBeA('function')
        expect(instance.appContext.config.globalProperties.$n).toBeA('function')
        const { $t, $tc, $d, $n } = instance.appContext.config.globalProperties

        expect($t('hello')).toEqual('Hello, World!')
        expect($tc('cats', 0)).toEqual('no cats')
        expect($tc('cats', 1)).toEqual('one cat')
        expect($tc('cats', 2)).toEqual('$2.00 cats, $2.00, really $2.00')
        expect($d(date)).toEqual('02/13/2009, 23:31:30')
        expect($d(date, 'date')).toEqual('02/13/2009')
        expect($d(date, 'time')).toEqual('23:31:30')
        expect($n(1234.56)).toEqual('$1,234.56')

        success = true

        return () => null
      },
    })

    const dom = new JSDOM('<!doctype html><html><body><div id="app"/></body></html>')

    const app = createJSDomApp(dom, component).use(i18n, {
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

    app.mount('#app')
    expect(success).toBeTrue()
  })

  it('should initialize the plugin with a language', () => {
    const app = createApp({}).use(i18n, 'en')

    app.runWithContext(function () {
      const translator = useTranslator()

      translator.locale = new Intl.Locale('de-DE') // completely unknown
      expect(translator.t({ en: 'Hello, World!', de: '' })).toEqual('Hello, World!')
    })
  })

  it('should fail when the plugin is not configured', () => {
    const app = createApp({})

    app.runWithContext(function () {
      expect(() => useTranslator()).toThrowError('No translator found in the Vue app')
    })
  })
})
