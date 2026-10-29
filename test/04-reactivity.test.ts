import { i18n, useTranslator } from '@juit/vue-i18n'
import { JSDOM } from 'jsdom'
import { compile, computed, defineComponent, nextTick } from 'vue'

import { createJSDomApp } from './jsdom-vue.ts'

import type { Translator } from '@juit/vue-i18n'

describe('Translator reactivity', () => {
  const amount = 1234.56
  const date = new Date('2026-01-02T12:00:00Z')

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
        const content = (kind: string): string | null | undefined =>
          dom.window.document.querySelector(`[data-kind="${kind}"]`)?.textContent

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
  }
})
