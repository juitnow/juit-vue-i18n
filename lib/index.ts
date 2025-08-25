import { inject } from 'vue'

import { makeTranslator } from './translator'

import type { App } from 'vue'
import type { ISOCurrency } from './iso-4217'
import type { ISOLanguage } from './iso-639'
import type { Translator } from './translator'

/* ===== REFERENCE LANGUAGES AND COUNTRIES ================================== */

export { ISO_COUNTRIES } from './iso-3166'
export { ISO_CURRENCIES } from './iso-4217'
export { ISO_LANGUAGES } from './iso-639'

export type * from './iso-3166'
export type * from './iso-639'

/* ===== TYPES FOR DECLARATION MERGING ====================================== */

/**
 * I18n Configuration interface (to be merged with the actual configuration).
 *
 * This interface (intentionally empty) is used to merge the actual per-app
 * configuration of the translation system, in order to provide the correct
 * types to the rest of the system.
 *
 * Two properties are expected to be defined in the configuration:
 *
 * * `languages`: the list of supported languages for the application. Those
 *                are ISO 639-1 language codes, and when specified, _every_
 *                translation _must_ include a translation for each.
 * * `translationKeys`: the list of translation keys known by the application.
 *                      Those are the arbitrary keys used to identify the
 *                      messages to be  translated with the `t` and `tc`
 *                      methods of `Translator`.
 * * `dateTimeFormats`: the date and time formats _aliases_ used by the
 *                      application.
 * * `numberFormats`: the number formats _aliases_ used by the application.
 *
 * To configure the types, follow the example below:
 *
 * ```ts
 * const translations = {
 *   'hello': { en: 'Hello, world!', de: 'Hallo, Welt!' }
 * } as const satisfies Translations
 *
 * const dateTimeFormats = {
 *  // override the default format
 *  default: { dateStyle: 'short', timeStyle: 'short' },
 *  // add a new custom format
 *  custom: {
 *    day: '2-digit',
 *    month: '2-digit',
 *    year: 'numeric',
 *    weekday: 'short',
 *    timeZone: 'UTC',
 *  },
 * } as const satisfies DateTimeFormats
 *
 * const numberFormats = {
 *  speed: { style: 'unit', unit: 'kilometer-per-hour' },
 * } as const satisfies NumberFormats
 *
 * declare module '@juit/vue-i18n' {
 *   export interface I18nConfiguration {
 *     languages: 'de' | 'en',
 *     translationKeys: keyof typeof translations,
 *     dateTimeFormats: keyof typeof dateTimeFormats,
 *     numberFormats: keyof typeof numberFormats,
 *   }
 * }
 * ```
 */
export interface I18nConfiguration {
  // intentionally empty
}

/* ===== FROM CONFIG TO TRANSLATIONS ======================================== */

/** Extract the value associated with key `K` from type `T` if it extends `R`, otherwise return `R` */
type ExtractConfig<T, R, K extends string> = T extends { [ X in K ]: infer V } ? V extends R ? V : R : R

/** The languages configured in `I18nConfiguration` or all ISO languages */
export type Language = ExtractConfig<I18nConfiguration, ISOLanguage, 'languages'>

/** Base translations, either required when languages are set or all optional */
type BaseTranslation = ISOLanguage extends Language ? {
  readonly [ key in ISOLanguage ]?: string
} : {
  readonly [ key in Language ]: string
}

/** Extended translations, supporting multiple region of each language */
type ExtendedTranslation = {
  readonly [ key in `${Language}-${string}` ]?: string
}

/** Prettify our `Translations` exported type */
type PrettifyTranslation<T> = { [ l in keyof T ]: T[l] }

/**
 * A type describing the translations for a given translation key.
 *
 * When the `I18nConfig` interface is properly merged with and its contains
 * the `languages` property, this type will represent the list of required
 * translation keys (languages) required for each translation.
 *
 * When left unconfigured, all ISO languages will be considered as optional.
 */
export type Translation = PrettifyTranslation<BaseTranslation & ExtendedTranslation>

/**
 * All known translation keys.
 *
 * When the `I18nConfig` interface is properly merged with and its contains
 * the `translationKeys` property, this type will represent the list of
 * translations keys available to the `t(...)` and `tc(...)` methods.
 *
 * When left unconfigured, this type will be `string`.
 */
export type TranslationKey = ExtractConfig<I18nConfiguration, string, 'translationKeys'>

/**
 * All known date and time formats aliases.
 *
 * When the `I18nConfig` interface is properly merged with and its contains
 * the `dateTimeFormats` property, this type will represent the list of
 * date and time formats available to the `d(...)` method.
 *
 * When left unconfigured, this type will be `string`.
 */
export type DateTimeFormatAlias = ExtractConfig<I18nConfiguration, string, 'dateTimeFormats'>
  | 'default' | 'short' | 'medium' | 'long' | 'full'
  | 'date' | 'shortDate' | 'mediumDate' | 'longDate' | 'fullDate'
  | 'time' | 'shortTime' | 'mediumTime' | 'longTime' | 'fullTime'

/**
 * All known number formats aliases.
 *
 * When the `I18nConfig` interface is properly merged with and its contains
 * the `numberFormats` property, this type will represent the list of
 * date and time formats available to the `n(...)` method.
 *
 * When left unconfigured, this type will be `string`.
 */
export type NumberFormatAlias = ExtractConfig<I18nConfiguration, string, 'numberFormats'>
  | 'default' | ISOCurrency

/* ===== MODULE INITIALIZATION ============================================== */

/* Export the translator types */
export type * from './translator'

/**
 * Options to initialize the translations handled by the translation system.
 *
 * Shared translations are defined as a key-value pair, where the key is the
 * identifier of the translation, and the value is an object containing the
 * translations for each language.
 */
export interface Translations {
  readonly [ key: string ]: Translation
}

/**
 * Options to initialize the date and time format _aliases_ used by the
 * translation system.
 *
 * The default aliases (each can be overridden) are:
 *
 * ```ts
 * {
 *   default: { dateStyle: 'medium', timeStyle: 'medium' },
 *   short: { dateStyle: 'short', timeStyle: 'short' },
 *   medium: { dateStyle: 'medium', timeStyle: 'medium' },
 *   long: { dateStyle: 'long', timeStyle: 'long' },
 *   full: { dateStyle: 'full', timeStyle: 'full' },
 *
 *   // date only formats
 *   date: { dateStyle: 'medium' },
 *   shortDate: { dateStyle: 'short' },
 *   mediumDate: { dateStyle: 'medium' },
 *   longDate: { dateStyle: 'long' },
 *   fullDate: { dateStyle: 'full' },
 *
 *   // time only formats
 *   time: { timeStyle: 'medium' },
 *   shortTime: { timeStyle: 'short' },
 *   mediumTime: { timeStyle: 'medium' },
 *   longTime: { timeStyle: 'long' },
 *   fullTime: { timeStyle: 'full' },
 * }
 * ```
 */
export interface DateTimeFormats {
  readonly [ key: string ]: Intl.DateTimeFormatOptions
}

/**
 * Options to initialize the number format _aliases_ used by the translation
 * system.
 *
 * The default aliases (each can be overridden) are:
 *
 * ```ts
 * {
 *   default: { }, // use the default number format
 *   EUR: { style: 'currency', currency: 'EUR' },
 *   USD: { style: 'currency', currency: 'USD' },
 *   // ... all currency codes can be used as aliases
 * }
 * ```
 */
export interface NumberFormats {
  readonly [ key: string ]: Intl.NumberFormatOptions
}

/** The language or locale to use at construction */
export type DefaultLanguage = ISOLanguage | `${ISOLanguage}-${string}` | Intl.Locale

/** Options to initialize the I18n plugin */
export interface I18nOptions {
  defaultLanguage: DefaultLanguage,
  defaultTimeZone?: string,
  translations?: Translations,
  dateTimeFormats?: DateTimeFormats,
  numberFormats?: NumberFormats,
}

/* ===== PUBLIC METHODS ===================================================== */

/** Symbol for Vue injections */
const injectionSymbol = Symbol.for('@juit/vue-i18n/translator')

/** Initialize the translation system plugin */
export function i18n(app: App, optionsOrLanguage: Language | I18nOptions): App {
  const options = typeof optionsOrLanguage === 'string' ?
    { defaultLanguage: optionsOrLanguage } : optionsOrLanguage

  const translator = makeTranslator(options)

  app.config.globalProperties.$t = translator.t
  app.config.globalProperties.$tc = translator.tc
  app.config.globalProperties.$n = translator.n
  app.config.globalProperties.$d = translator.d

  app.provide(injectionSymbol, translator)
  return app
}

/** Retrieve the translator instance from the Vue app */
export function useTranslator(): Translator {
  const translator = inject(injectionSymbol)
  if (! translator) throw new Error('No translator found in the Vue app')
  return translator as Translator
}

/* ===== VUE EXTENSIONS ===================================================== */

// Extension to the Vue component interface
declare module 'vue' {
  interface ComponentCustomProperties {
    /** Translate a message according to the current language */
    $t: Translator['t']
    /**
     * Return the (possibly parameterized) translation for the specified message
     * in the current language, with pluralization.
     */
    $tc: Translator['tc']
    /** Format a number into a string according to the current language */
    $n: Translator['n']
    /**
     * Format date and time using the specified style (defaults to `medium`)
     * according to the current language
     */
    $d: Translator['d']
  }
}
