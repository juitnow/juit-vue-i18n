import { i18n, useTranslator } from '@juit/vue-i18n'
import { JSDOM } from 'jsdom'
import { compile, createApp, defineComponent } from 'vue'

import { createJSDomApp } from './jsdom-vue.ts'

import type { I18nOptions } from '@juit/vue-i18n'

describe('I18n Plugin with Vue Apps', () => {
  const date = new Date(1234567890123)
  const options = {
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
  } satisfies I18nOptions

  it('should create independent translators for each app', () => {
    const first = createApp({}).use(i18n, options)
    const second = createApp({}).use(i18n, options)
    const translator = first.runWithContext(() => useTranslator())
    const other = second.runWithContext(() => useTranslator())

    expect(translator).not.toStrictlyEqual(other)
    translator.language = 'de'
    expect(translator.t('hello')).toEqual('Hallo, Welt!')
    expect(other.language).toEqual('en')
    expect(other.t('hello')).toEqual('Hello, World!')
  })

  it('should use the $t, $tc, $d, and $n aliases in templates', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>')
    const component = defineComponent({
      setup: () => ({ date }),
      render: compile(`<div>
        <span>{{ $t('hello') }}</span>
        <span>{{ $tc('cats', 0) }}</span>
        <span>{{ $tc('cats', 1) }}</span>
        <span>{{ $tc('cats', 2) }}</span>
        <span>{{ $d(date) }}</span>
        <span>{{ $d(date, 'date') }}</span>
        <span>{{ $d(date, 'time') }}</span>
        <span>{{ $n(1234.56) }}</span>
      </div>`),
    })
    const app = createJSDomApp(dom, component).use(i18n, options)

    try {
      app.mount('#app')
      const contents = [...dom.window.document.querySelectorAll('span')].map((element) => element.textContent)
      expect(contents).toEqual([
        'Hello, World!',
        'no cats',
        'one cat',
        '$2.00 cats, $2.00, really $2.00',
        '02/13/2009, 23:31:30',
        '02/13/2009',
        '23:31:30',
        '$1,234.56',
      ])
    } finally {
      app.unmount()
      dom.window.close()
    }
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
