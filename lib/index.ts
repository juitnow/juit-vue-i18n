import { inject } from 'vue'

import { isISOLanguage } from './iso-639'
import { makeTranslator } from './translator'

import type { App } from 'vue'
import type { ISOCurrency } from './iso-4217'
import type { ISOLanguage } from './iso-639'
import type { Translator } from './translator'

/* ===== REFERENCE LANGUAGES, COUNTRIES, AND CURRENCIES ====================== */

export { isISOCountry, ISO_COUNTRIES } from './iso-3166'
export { isISOCurrency, ISO_CURRENCIES } from './iso-4217'
export { isISOLanguage, ISO_LANGUAGES } from './iso-639'

export type * from './iso-3166'
export type * from './iso-4217'
export type * from './iso-639'

/* ===== TYPES FOR DECLARATION MERGING ====================================== */

/**
 * Application configuration types, supplied through declaration merging.
 *
 * This interface (intentionally empty) is used to merge the actual per-app
 * configuration of the translation system, in order to provide the correct
 * types to the rest of the system.
 *
 * The following properties can be defined as unions of string literals:
 *
 * * `languages`: the supported ISO 639-1 language codes. When configured
 *                with a subset of codes, each translation must include
 *                a message for every base language in that subset.
 * * `translationKeys`: the translation keys known by the application.
 *                      Those are the arbitrary keys used to identify the
 *                      messages to be translated with the `t` and `tc`
 *                      methods of `Translator`.
 * * `dateTimeFormats`: the date and time format _aliases_ used by the
 *                      application.
 * * `numberFormats`: the number format _aliases_ used by the application.
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

/** Extract `T[K]` when present and assignable to `R`; otherwise fall back to `R`. */
type ExtractConfig<T, R, K extends string> = T extends { [ X in K ]: infer V } ? V extends R ? V : R : R

/** The languages configured in `I18nConfiguration` or all ISO languages */
export type Language = ExtractConfig<I18nConfiguration, ISOLanguage, 'languages'>

/** A message with optional pipe-delimited variants, or a readonly tuple of one to three variants. */
export type TranslationMessage = string | readonly [string, string?, string?]

/** Base languages are required for a configured subset; otherwise all are optional. */
type BaseTranslation = ISOLanguage extends Language ? {
  readonly [ key in ISOLanguage ]?: TranslationMessage
} : {
  readonly [ key in Language ]: TranslationMessage
}

/** Optional regional variants of each supported language. */
type ExtendedTranslation = {
  readonly [ key in `${Language}-${string}` ]?: TranslationMessage
}

/** Expand the properties of the exported `Translation` type for editor hints. */
type PrettifyTranslation<T> = { [ l in keyof T ]: T[l] }

/**
 * A type describing the translations for a given translation key.
 *
 * When `I18nConfiguration.languages` specifies a subset of ISO languages,
 * every base language in that subset is required. Regional variants are
 * optional. When unconfigured, or configured with all ISO languages, every
 * language is optional.
 */
export type Translation = PrettifyTranslation<BaseTranslation & ExtendedTranslation>

/**
 * All known translation keys.
 *
 * `I18nConfiguration.translationKeys` restricts the keys accepted by the
 * `t(...)` and `tc(...)` methods and by `utils.updateTranslations(...)`.
 *
 * When left unconfigured, this type will be `string`.
 */
export type TranslationKey = ExtractConfig<I18nConfiguration, string, 'translationKeys'>

/**
 * Supported date and time format aliases.
 *
 * `I18nConfiguration.dateTimeFormats` defines the custom aliases accepted
 * by `d(...)`. Built-in aliases remain available.
 *
 * When left unconfigured, this type will be `string`.
 */
export type DateTimeFormatAlias = ExtractConfig<I18nConfiguration, string, 'dateTimeFormats'>
  | 'default' | 'short' | 'medium' | 'long' | 'full'
  | 'date' | 'shortDate' | 'mediumDate' | 'longDate' | 'fullDate'
  | 'time' | 'shortTime' | 'mediumTime' | 'longTime' | 'fullTime'

/**
 * Supported number format aliases.
 *
 * `I18nConfiguration.numberFormats` defines the custom aliases accepted
 * by `n(...)`. The `default` alias and currency code types remain available.
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
 * Each key identifies a message, and its value maps languages and regional
 * variants to message strings or plural tuples.
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
 *   // Formats for dates only
 *   date: { dateStyle: 'medium' },
 *   shortDate: { dateStyle: 'short' },
 *   mediumDate: { dateStyle: 'medium' },
 *   longDate: { dateStyle: 'long' },
 *   fullDate: { dateStyle: 'full' },
 *
 *   // Formats for times only
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
 *   // ... codes from ISO_CURRENCIES are available as aliases
 * }
 * ```
 */
export interface NumberFormats {
  readonly [ key: string ]: Intl.NumberFormatOptions
}

/** The initial language or locale; only its language and region are retained. */
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

/** Retrieve the translator from the current Vue injection context, or throw if none is provided. */
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
    /** Format a number into a string according to the current locale. */
    $n: Translator['n']
    /**
     * Format a date and time using the current locale and the specified
     * format, or the configurable `default` alias when omitted.
     */
    $d: Translator['d']
  }
}

/* ===== UTILITIES ========================================================== */

function normalizeLanguage(language: unknown): ISOLanguage | undefined {
  if (typeof language !== 'string') return undefined

  const normalized = language.toLowerCase().split(/[-_]/)[0]
  if (! normalized) return undefined // empty after normalization

  return isISOLanguage(normalized) ? normalized : undefined
}

interface LanguageMatcherConstructor {
  /**
   * Create a new {@link LanguageMatcher} instance matching *only* the single
   * language specified.
   *
   * At runtime, the input is normalized. If it does not resolve to a valid
   * ISO language code, an error is thrown.
   */
  new <L extends ISOLanguage>(availableLanguages: L): LanguageMatcher<[ L ]>
  /**
   * Create a new {@link LanguageMatcher} instance matching the specified set
   * of available languages.
   *
   * Typed inputs must be valid ISO language codes. At runtime, inputs are
   * normalized and invalid entries are filtered out. The resulting list is
   * copied, so later changes to the input array do not affect the matcher.
   *
   * If no valid ISO languages are provided, an error will be thrown.
   */
  new <const A extends readonly [ ISOLanguage, ...ISOLanguage[] ]>(availableLanguages: A): LanguageMatcher<A>
}

/**
 * A language matcher that determines the best matching language from a set
 * of available languages.
 */
export interface LanguageMatcher<T extends readonly [ ISOLanguage, ...ISOLanguage[] ]> {
  /** The list of available languages, with the first one being the default */
  readonly availableLanguages: Readonly<T>
  /** The default language */
  readonly defaultLanguage: T[0]

  /**
   * Determine the best matching language from the available languages.
   *
   * The first supported language in the input preference order is returned.
   * Empty input or an input with no matches returns the default language.
   *
   * All languages here will be *normalized* before matching (for example
   * `en-US` will be normalized to `en`, and `JA` will be normalized to `ja`).
   *
   * @param languages The language or list of languages to match against the
   *                  available languages.
   * @returns The best matching language from the available languages, or the
   *          default language if no match is found.
   */
  match(languages: readonly string[] | string | undefined | null): T[number]
}

/** Implementation of the {@link LanguageMatcher} interface */
class LanguageMatcherImpl implements LanguageMatcher<readonly [ ISOLanguage, ...ISOLanguage[] ]> {
  readonly availableLanguages: readonly [ ISOLanguage, ...ISOLanguage[] ]
  readonly defaultLanguage: ISOLanguage

  constructor(availableLanguages: ISOLanguage | readonly ISOLanguage[]) {
    const languages = typeof availableLanguages === 'string' ?
      [ availableLanguages ] : availableLanguages

    const [ defaultLanguage, ...extraLanguages ] = languages
        .map(normalizeLanguage) // Normalize each language, returning undefined for invalid entries.
        .filter((language) => !! language) // Remove invalid entries.

    if (!defaultLanguage) {
      throw new Error(`At least one valid ISO language must be provided (${languages.join(', ')})`)
    }

    this.defaultLanguage = defaultLanguage
    this.availableLanguages = [ defaultLanguage, ...extraLanguages ]
  }

  match(languages: readonly string[] | string | undefined | null): ISOLanguage {
    // Use the default when no preferences are supplied.
    if (!languages) return this.defaultLanguage

    // Normalize the input to an array of strings.
    if (typeof languages === 'string') languages = [ languages ]

    // Iterate over the provided languages in order of preference.
    for (const language of languages) {
      const normalized = normalizeLanguage(language)
      if (! normalized) continue // empty after normalization

      // Check if the normalized language is available. If so, we match!
      if (this.availableLanguages.includes(normalized)) {
        return normalized
      }
    }

    // None of the provided languages matched, so we return the default.
    return this.defaultLanguage
  }
}

/** The {@link LanguageMatcher} constructor */
export const LanguageMatcher = LanguageMatcherImpl as LanguageMatcherConstructor
