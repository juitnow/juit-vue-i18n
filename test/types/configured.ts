import { expectTypeOf } from 'vitest'

import type { ComponentCustomProperties } from 'vue'
import type {
  DateTimeFormatAlias, DateTimeFormats, ISOCurrency, Language, NumberFormatAlias,
  NumberFormats, Translation, TranslationKey, TranslationMessage, Translations, Translator, useTranslator,
} from '../../lib'

// This project is isolated from the default configuration and runtime tests.
const translations = {
  hello: { en: 'Hello', de: 'Hallo' },
  cats: { en: [ 'one cat', '{n} cats' ], de: [ 'eine Katze', '{n} Katzen' ] },
} as const satisfies Translations
const dateTimeFormats = { customDate: { year: 'numeric' } } as const satisfies DateTimeFormats
const numberFormats = { speed: { style: 'unit', unit: 'meter-per-second' } } as const satisfies NumberFormats

declare module '../../lib/index' {
  interface I18nConfiguration {
    languages: 'en' | 'de',
    translationKeys: keyof typeof translations,
    dateTimeFormats: keyof typeof dateTimeFormats,
    numberFormats: keyof typeof numberFormats,
  }
}

expectTypeOf<Language>().toEqualTypeOf<'en' | 'de'>()
expectTypeOf<TranslationKey>().toEqualTypeOf<'hello' | 'cats'>()
expectTypeOf<NumberFormatAlias>().toEqualTypeOf<'speed' | 'default' | ISOCurrency>()
expectTypeOf<DateTimeFormatAlias>().toEqualTypeOf<
  'customDate' | 'default' | 'short' | 'medium' | 'long' | 'full'
  | 'date' | 'shortDate' | 'mediumDate' | 'longDate' | 'fullDate'
  | 'time' | 'shortTime' | 'mediumTime' | 'longTime' | 'fullTime'
>()
expectTypeOf<Translation['en']>().toEqualTypeOf<TranslationMessage>()
expectTypeOf<Translation['de-AT']>().toEqualTypeOf<TranslationMessage | undefined>()
expectTypeOf<ReturnType<typeof useTranslator>>().toEqualTypeOf<Translator>()
expectTypeOf<ComponentCustomProperties['$t']>().toEqualTypeOf<Translator['t']>()
expectTypeOf<ComponentCustomProperties['$tc']>().toEqualTypeOf<Translator['tc']>()
expectTypeOf<ComponentCustomProperties['$n']>().toEqualTypeOf<Translator['n']>()
expectTypeOf<ComponentCustomProperties['$d']>().toEqualTypeOf<Translator['d']>()

// These calls are compiled only: invalid inputs must fail before reaching runtime.
declare const translator: Translator
declare const component: ComponentCustomProperties
expectTypeOf(translator.t('hello', { name: 'Alice', n: 2 })).toEqualTypeOf<string>()
expectTypeOf(translator.tc('cats', 2)).toEqualTypeOf<string>()
translator.t(translations.hello)
translator.tc(translations.cats, 2)
translator.t({ 'en': [ 'Hello' ], 'de': 'Hallo', 'de-AT': [ 'Servus' ] })
translator.utils.updateTranslations({ hello: { 'de-AT': [ 'Servus' ] }, cats: { en: 'cats' } })
translator.n(42, 'speed')
translator.n(42, 'EUR')
translator.n(42, 'default')
translator.n(42, { maximumFractionDigits: 2 })
translator.n(42, numberFormats.speed)
translator.d(0, 'customDate')
translator.d(0, 'fullTime')
translator.d(0, { year: 'numeric' })
translator.d(0, dateTimeFormats.customDate)
component.$t('hello')
component.$tc('cats', 2)
component.$n(42, 'speed')
component.$d(0, 'customDate')

// @ts-expect-error All configured base languages are required.
translator.t({ en: 'Hello' })
// @ts-expect-error Unconfigured base languages are not accepted.
translator.t({ en: 'Hello', de: 'Hallo', fr: 'Bonjour' })
// @ts-expect-error Regional translations must belong to a configured language.
translator.t({ 'en': 'Hello', 'de': 'Hallo', 'fr-FR': 'Bonjour' })
// @ts-expect-error Translation keys are restricted by configuration.
translator.t('missing')
// @ts-expect-error Plural translations use the same configured keys.
translator.tc('missing', 2)
// @ts-expect-error Updates must use a configured key.
translator.utils.updateTranslations({ missing: { en: 'Hello' } })
// @ts-expect-error Updates must use configured languages.
translator.utils.updateTranslations({ hello: { fr: 'Bonjour' } })
// @ts-expect-error Unknown custom number alias.
translator.n(42, 'missing')
// @ts-expect-error Unknown custom date alias.
translator.d(0, 'missing')
// @ts-expect-error Vue globals retain the configured translation keys.
component.$t('missing')
// @ts-expect-error Vue globals retain the configured plural translation keys.
component.$tc('missing', 2)
// @ts-expect-error Vue globals retain the configured number aliases.
component.$n(42, 'missing')
// @ts-expect-error Vue globals retain the configured date aliases.
component.$d(0, 'missing')
declare const readonlyTranslation: Translation
// @ts-expect-error Translation properties remain readonly.
readonlyTranslation.en = 'Changed'
