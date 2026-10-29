import { JSDOM } from 'jsdom'
import { compile, computed, createApp, defineComponent, nextTick, reactive, ref } from 'vue'

import { i18n, useTranslator } from '../lib/index.ts'
import { createJSDomApp } from './jsdom-vue.ts'

import type { Translator } from '../lib/index.ts'

describe('Translator reactivity', () => {
  const amount = 1234.56
  const date = new Date('2026-01-02T12:00:00Z')

  for (const container of ['ref', 'reactive'] as const) {
    it(`should preserve locale access and reactivity inside a ${container} container`, () => {
      const app = createApp({}).use(i18n, {
        defaultLanguage: 'en',
        translations: { hello: { en: 'Hello', de: 'Hallo' } },
      })
      const translator = app.runWithContext(() => useTranslator())
      const wrapped = container === 'ref' ? ref(translator).value : reactive({ translator }).translator
      const language = computed(() => wrapped.language)
      const text = computed(() => wrapped.t('hello'))

      expect(language.value).toEqual('en')
      expect(text.value).toEqual('Hello')
      wrapped.language = 'de'
      expect(language.value).toEqual('de')
      expect(text.value).toEqual('Hallo')
      wrapped.region = 'AT'
      expect(wrapped.locale.toString()).toEqual('de-AT')
      wrapped.locale = new Intl.Locale('en-GB')
      expect(wrapped.language).toEqual('en')
      expect(wrapped.region).toEqual('GB')
      expect(text.value).toEqual('Hello')
      wrapped.updateTranslations({ hello: { en: 'Welcome' } })
      expect(text.value).toEqual('Welcome')
    })
  }

  for (const mode of ['template globals', 'computed translations'] as const) {
    it(`should update HTML after language, region, and locale changes using ${mode}`, async () => {
      const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>')
      let translator!: Translator

      const component = defineComponent({
        setup() {
          translator = useTranslator()
          if (mode === 'template globals') return { amount, date }

          return {
            text: computed(() => translator.t('hello')),
            plural: computed(() => translator.tc('cats', amount)),
            number: computed(() => translator.n(amount)),
            formattedDate: computed(() => translator.d(date, 'shortDate')),
          }
        },
        render: compile(
          mode === 'template globals'
            ? `<div>
                <span data-kind="text">{{ $t('hello') }}</span>
                <span data-kind="plural">{{ $tc('cats', amount) }}</span>
                <span data-kind="number">{{ $n(amount) }}</span>
                <span data-kind="date">{{ $d(date, 'shortDate') }}</span>
              </div>`
            : `<div>
                <span data-kind="text">{{ text }}</span>
                <span data-kind="plural">{{ plural }}</span>
                <span data-kind="number">{{ number }}</span>
                <span data-kind="date">{{ formattedDate }}</span>
              </div>`,
        ),
      })

      const app = createJSDomApp(dom, component).use(i18n, {
        defaultLanguage: 'en-US',
        defaultTimeZone: 'UTC',
        translations: {
          hello: {
            'en': 'Hello',
            'en-GB': 'Hello from Britain',
            'de': 'Hallo',
            'de-AT': 'Servus',
          },
          cats: {
            'en': 'one cat | {n} cats',
            'en-GB': 'one British cat | {n} British cats',
            'de': 'eine Katze | {n} Katzen',
            'de-AT': 'eine österreichische Katze | {n} österreichische Katzen',
          },
        },
      })

      function expectHTML(locale: string, text: string, cats: string): void {
        const number = new Intl.NumberFormat(locale).format(amount)
        const formattedDate = new Intl.DateTimeFormat(locale, {
          dateStyle: 'short',
          timeZone: 'UTC',
        }).format(date)
        function content(kind: string): string | null | undefined {
          return dom.window.document.querySelector(`[data-kind="${kind}"]`)?.textContent
        }

        expect(content('text')).toEqual(text)
        expect(content('plural')).toEqual(`${number} ${cats}`)
        expect(content('number')).toEqual(number)
        expect(content('date')).toEqual(formattedDate)
      }

      try {
        app.mount('#app')
        expectHTML('en-US', 'Hello', 'cats')

        // Changing the language preserves the current region.
        translator.language = 'de'
        await nextTick()
        expectHTML('de-US', 'Hallo', 'Katzen')

        translator.region = 'AT'
        await nextTick()
        expectHTML('de-AT', 'Servus', 'österreichische Katzen')

        translator.locale = new Intl.Locale('en-GB')
        await nextTick()
        expectHTML('en-GB', 'Hello from Britain', 'British cats')

        // Removing the region returns to the base-language messages and formats.
        translator.region = undefined
        await nextTick()
        expectHTML('en', 'Hello', 'cats')
      } finally {
        app.unmount()
        dom.window.close()
      }
    })

    for (const entryPoint of ['updateTranslations', 'utils.updateTranslations'] as const) {
      for (const initialMessages of ['existing', 'missing'] as const) {
        it(`should update HTML after updating ${initialMessages} translations using ${mode} via ${entryPoint}`, async () => {
          const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>')
          let translator!: Translator
          const component = defineComponent({
            setup() {
              translator = useTranslator()
              return {
                text: computed(() => translator.t('hello', { name: 'Alice' })),
                plural: computed(() => translator.tc('cats', 2)),
              }
            },
            render: compile(
              mode === 'template globals'
                ? `<div>
                <span>{{ $t('hello', { name: 'Alice' }) }}</span>
                <span>{{ $tc('cats', 2) }}</span>
              </div>`
                : `<div>
                <span>{{ text }}</span>
                <span>{{ plural }}</span>
              </div>`,
            ),
          })
          const app = createJSDomApp(dom, component).use(i18n, {
            defaultLanguage: 'en',
            translations:
              initialMessages === 'existing'
                ? {
                    hello: { en: 'Hello, {name}!', de: 'Hallo, {name}!' },
                    cats: { en: ['one cat', '{n} cats'], de: ['eine Katze', '{n} Katzen'] },
                  }
                : undefined,
          })
          function contents(): (string | null)[] {
            return [...dom.window.document.querySelectorAll('span')].map((element) => element.textContent)
          }

          try {
            app.mount('#app')
            // Missing keys render literally and populate the fallback template cache.
            expect(contents()).toEqual(initialMessages === 'existing' ? ['Hello, Alice!', '2 cats'] : ['hello', 'cats'])

            // Updating messages alone should invalidate the rendered translations.
            // Do not change locale or force a component render to make this pass.
            const updateTranslations =
              entryPoint === 'updateTranslations'
                ? translator.updateTranslations.bind(translator)
                : translator.utils.updateTranslations.bind(translator.utils)
            updateTranslations({
              hello: { en: 'Welcome, {name}!' },
              cats: { en: ['one kitten', '{n} kittens'] },
            })
            await nextTick()

            expect(contents()).toEqual(['Welcome, Alice!', '2 kittens'])
          } finally {
            app.unmount()
            dom.window.close()
          }
        })
      }
    }
  }
})
