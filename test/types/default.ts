import { expectTypeOf } from 'vitest'

import { isISOCountry, isISOCurrency, isISOLanguage, ISO_COUNTRIES, ISO_CURRENCIES, ISO_LANGUAGES } from '../../lib'

import type {
  DateTimeFormatAlias, ISOCountry, ISOCurrency, ISOLanguage, Language,
  NumberFormatAlias, Translation, TranslationKey, TranslationMessage, Translator,
} from '../../lib'

// No I18nConfiguration augmentation is included in this project.
expectTypeOf<Language>().toEqualTypeOf<ISOLanguage>()
expectTypeOf<TranslationKey>().toEqualTypeOf<string>()
expectTypeOf<DateTimeFormatAlias>().toEqualTypeOf<string>()
expectTypeOf<NumberFormatAlias>().toEqualTypeOf<string>()
expectTypeOf<Translation['en']>().toEqualTypeOf<TranslationMessage | undefined>()
expectTypeOf<Translation['fr-FR']>().toEqualTypeOf<TranslationMessage | undefined>()
expectTypeOf(ISO_LANGUAGES).toEqualTypeOf<readonly ISOLanguage[]>()
expectTypeOf(ISO_COUNTRIES).toEqualTypeOf<readonly ISOCountry[]>()
expectTypeOf(ISO_CURRENCIES).toEqualTypeOf<readonly ISOCurrency[]>()

declare const code: string
if (isISOLanguage(code)) expectTypeOf(code).toEqualTypeOf<ISOLanguage>()
if (isISOCountry(code)) expectTypeOf(code).toEqualTypeOf<ISOCountry>()
if (isISOCurrency(code)) expectTypeOf(code).toEqualTypeOf<ISOCurrency>()

declare const translator: Translator
translator.t('any key')
translator.tc('any key', 2)
translator.t({})
translator.t({ fr: 'Bonjour' })
translator.t({ 'fr-FR': [ 'Bonjour' ] })
translator.t({ en: [ 'one', 'many' ] as const })
translator.t({ en: [ 'zero', 'one', 'many' ] as const })
translator.utils.updateTranslations({ anything: { fr: [ 'Bonjour' ] } })
translator.n(42, 'any format')
translator.d(0, 'any format')

// @ts-expect-error Language codes still need to be valid ISO codes.
translator.t({ zz: 'Hello' })
// @ts-expect-error Regional languages still need to be valid ISO codes.
translator.t({ 'zz-ZZ': 'Hello' })
// @ts-expect-error An explicit plural tuple needs at least one string.
translator.t({ en: [] })
// @ts-expect-error At most three plural variants are supported.
translator.t({ en: [ 'a', 'b', 'c', 'd' ] })
// @ts-expect-error Plural variants must be strings.
translator.t({ en: [ 'one', 2 ] })
// @ts-expect-error Parameters must be strings or numbers.
translator.t('hello', { name: false })
declare const readonlyTranslation: Translation
// @ts-expect-error Message properties are readonly.
readonlyTranslation.en = 'Changed'
