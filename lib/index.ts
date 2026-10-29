import { inject } from 'vue'

import { isISOLanguage } from './iso-639.ts'
import { Translator } from './translator.ts'

import type { ISOLanguage } from './iso-639.ts'
import type { ISOCurrency } from './iso-4217.ts'
import type { App } from 'vue'

/* ===== REFERENCE LANGUAGES, COUNTRIES, AND CURRENCIES ====================== */

export { isISOCountry, ISO_COUNTRIES } from './iso-3166.ts'
export { isISOCurrency, ISO_CURRENCIES } from './iso-4217.ts'
export { isISOLanguage, ISO_LANGUAGES } from './iso-639.ts'

export type * from './iso-3166.ts'
export type * from './iso-4217.ts'
export type * from './iso-639.ts'

/* ===== TYPES FOR DECLARATION MERGING ====================================== */

/**
 * Application types supplied through declaration merging.
 *
 * Define these properties as unions of string literals:
 *
 * - `languages`: ISO 639-1 codes. For a configured subset, each translation must include every base language in that
 *   subset.
 * - `translationKeys`: keys accepted by `t`, `tc`, and `updateTranslations`.
 * - `dateTimeFormats`: custom date and time format aliases.
 * - `numberFormats`: custom number format aliases.
 *
 * These types do not register translations or formats at runtime.
 *
 * Example:
 *
 * ```ts
 * const translations = {
 *   hello: { en: 'Hello, world!', de: 'Hallo, Welt!' },
 * } as const satisfies Translations
 *
 * const dateTimeFormats = {
 *   // Override the default format.
 *   default: { dateStyle: 'short', timeStyle: 'short' },
 *   // Add a custom format.
 *   custom: {
 *     day: '2-digit',
 *     month: '2-digit',
 *     year: 'numeric',
 *     weekday: 'short',
 *     timeZone: 'UTC',
 *   },
 * } as const satisfies DateTimeFormats
 *
 * const numberFormats = {
 *   speed: { style: 'unit', unit: 'kilometer-per-hour' },
 * } as const satisfies NumberFormats
 *
 * declare module '@juit/vue-i18n' {
 *   export interface I18nConfiguration {
 *     languages: 'de' | 'en'
 *     translationKeys: keyof typeof translations
 *     dateTimeFormats: keyof typeof dateTimeFormats
 *     numberFormats: keyof typeof numberFormats
 *   }
 * }
 * ```
 */
export interface I18nConfiguration {
  // Extended through declaration merging.
}

/* ===== FROM CONFIG TO TRANSLATIONS ======================================== */

/** Extract `T[K]` when present and assignable to `R`; otherwise fall back to `R`. */
type ExtractConfig<T, R, K extends string> = T extends { [X in K]: infer V } ? (V extends R ? V : R) : R

/** Configured ISO 639-1 language codes, or all codes when unconfigured. */
export type Language = ExtractConfig<I18nConfiguration, ISOLanguage, 'languages'>

/** A message with optional pipe-delimited variants, or a readonly tuple of one to three variants. */
export type TranslationMessage = string | readonly [string, string?, string?]

/** Base languages are required for a configured subset; otherwise all are optional. */
type BaseTranslation = ISOLanguage extends Language
  ? {
      readonly [key in ISOLanguage]?: TranslationMessage
    }
  : {
      readonly [key in Language]: TranslationMessage
    }

/** Optional regional variants of each supported language. */
type ExtendedTranslation = {
  readonly [key in `${Language}-${string}`]?: TranslationMessage
}

/** Expand the properties of the exported `Translation` type for editor hints. */
type PrettifyTranslation<T> = { [l in keyof T]: T[l] }

/**
 * Messages for one key, indexed by language or regional variant.
 *
 * When `I18nConfiguration.languages` specifies a subset of ISO languages,
 * every base language in that subset is required. Regional variants are
 * optional. When unconfigured, or configured with all ISO languages, every
 * language is optional.
 */
export type Translation = PrettifyTranslation<BaseTranslation & ExtendedTranslation>

/**
 * Configured translation keys.
 *
 * `I18nConfiguration.translationKeys` restricts the keys accepted by the
 * `t`, `tc`, and `updateTranslations` methods. `hasTranslation` accepts any string.
 * Unconfigured keys accept any string.
 */
export type TranslationKey = ExtractConfig<I18nConfiguration, string, 'translationKeys'>

/**
 * Supported date and time format aliases.
 *
 * `I18nConfiguration.dateTimeFormats` defines the custom aliases accepted
 * by `d(...)`. Built-in aliases remain available.
 *
 * When unconfigured, any string is accepted; built-in aliases retain autocomplete suggestions.
 */
export type DateTimeFormatAlias =
  | ExtractConfig<I18nConfiguration, string & {}, 'dateTimeFormats'>
  | 'default'
  | 'short'
  | 'medium'
  | 'long'
  | 'full'
  | 'date'
  | 'shortDate'
  | 'mediumDate'
  | 'longDate'
  | 'fullDate'
  | 'time'
  | 'shortTime'
  | 'mediumTime'
  | 'longTime'
  | 'fullTime'

/**
 * Supported number format aliases.
 *
 * `I18nConfiguration.numberFormats` defines the custom aliases accepted
 * by `n(...)`. The `default` alias and currency code types remain available.
 *
 * When unconfigured, any string is accepted; built-in aliases retain autocomplete suggestions.
 */
export type NumberFormatAlias = ExtractConfig<I18nConfiguration, string & {}, 'numberFormats'> | 'default' | ISOCurrency

/* ===== TRANSLATOR TYPES AND PLUGIN OPTIONS ================================ */

/* Export translator types without exposing the internal constructor. */
export type * from './translator.ts'

/** Messages indexed by translation key, then language or regional variant. */
export interface Translations {
  readonly [key: string]: Translation
}

/**
 * Date and time options indexed by format alias.
 * Built-in aliases can be overridden:
 *
 * ```ts
 * ;({
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
 * })
 * ```
 */
export interface DateTimeFormats {
  readonly [key: string]: Intl.DateTimeFormatOptions
}

/**
 * Number options indexed by format alias.
 * Built-in aliases can be overridden:
 *
 * ```ts
 * ;({
 *   default: {}, // Default number format.
 *   EUR: { style: 'currency', currency: 'EUR' },
 *   USD: { style: 'currency', currency: 'USD' },
 *   // Other codes in ISO_CURRENCIES are also aliases.
 * })
 * ```
 */
export interface NumberFormats {
  readonly [key: string]: Intl.NumberFormatOptions
}

/** The initial language or locale; only its language and region are retained. */
export type DefaultLanguage = ISOLanguage | `${ISOLanguage}-${string}` | Intl.Locale

/** Vue plugin options. */
export interface I18nOptions {
  defaultLanguage: DefaultLanguage
  defaultTimeZone?: string
  translations?: Translations
  dateTimeFormats?: DateTimeFormats
  numberFormats?: NumberFormats
}

/* ===== PUBLIC METHODS ===================================================== */

/** App-level translator injection key. */
const injectionSymbol = Symbol.for('@juit/vue-i18n/translator')

/** Install the translator and its template globals in a Vue app. */
export function i18n(app: App, optionsOrLanguage: Language | I18nOptions): App {
  const options = typeof optionsOrLanguage === 'string' ? { defaultLanguage: optionsOrLanguage } : optionsOrLanguage

  const translator = new Translator(options)

  app.config.globalProperties.$t = translator.t.bind(translator)
  app.config.globalProperties.$tc = translator.tc.bind(translator)
  app.config.globalProperties.$n = translator.n.bind(translator)
  app.config.globalProperties.$d = translator.d.bind(translator)

  app.provide(injectionSymbol, translator)
  return app
}

/** Retrieve the translator from the current Vue injection context, or throw if none is provided. */
export function useTranslator(): Translator {
  const translator = inject(injectionSymbol)
  if (!translator) throw new Error('No translator found in the Vue app')
  return translator as Translator
}

/* ===== VUE EXTENSIONS ===================================================== */

declare module 'vue' {
  interface ComponentCustomProperties {
    /** Translate a key or inline message using the current locale. */
    $t: Translator['t']
    /** Translate a key or inline message with pluralization. */
    $tc: Translator['tc']
    /** Format a number using the current locale. */
    $n: Translator['n']
    /**
     * Format a date and time using the current locale and the specified
     * format, or the configurable `default` alias when omitted.
     */
    $d: Translator['d']
  }
}

/* ===== UTILITIES ========================================================== */

/** Return a valid base ISO 639-1 code from a language tag. */
function normalizeLanguage(language: unknown): ISOLanguage | undefined {
  if (typeof language !== 'string') return undefined

  const normalized = language.toLowerCase().split(/[-_]/)[0]
  if (!normalized) return undefined // empty after normalization

  return isISOLanguage(normalized) ? normalized : undefined
}

interface LanguageMatcherConstructor {
  /**
   * Match a single ISO 639-1 language. Runtime input is normalized;
   * an invalid code throws.
   */
  new <L extends ISOLanguage>(availableLanguages: L): LanguageMatcher<[L]>
  /**
   * Match a nonempty list of ISO 639-1 languages, using the first valid code as fallback.
   * Runtime inputs are normalized, filtered, and copied. Throws if none are valid.
   */
  new <const A extends readonly [ISOLanguage, ...ISOLanguage[]]>(availableLanguages: A): LanguageMatcher<A>
}

/** Match normalized preferences against configured ISO 639-1 languages. */
// oxlint-disable-next-line no-redeclare - interface and constructor share a name
export interface LanguageMatcher<T extends readonly [ISOLanguage, ...ISOLanguage[]]> {
  /** Copied language list; the first entry is the fallback. */
  readonly availableLanguages: Readonly<T>
  /** Fallback when no preference matches. */
  readonly defaultLanguage: T[0]

  /**
   * Return the first supported preference, or the default if none matches.
   * Matching ignores case and suffixes after `-` or `_`.
   * Empty, null, or undefined input returns the default.
   */
  match(languages: readonly string[] | string | undefined | null): T[number]
}

/** Implementation of the {@link LanguageMatcher} interface */
class LanguageMatcherImpl implements LanguageMatcher<readonly [ISOLanguage, ...ISOLanguage[]]> {
  readonly availableLanguages: readonly [ISOLanguage, ...ISOLanguage[]]
  readonly defaultLanguage: ISOLanguage

  constructor(availableLanguages: ISOLanguage | readonly ISOLanguage[]) {
    const languages = typeof availableLanguages === 'string' ? [availableLanguages] : availableLanguages

    const [defaultLanguage, ...extraLanguages] = languages.map(normalizeLanguage).filter((language) => !!language)

    if (!defaultLanguage) {
      throw new Error(`At least one valid ISO language must be provided (${languages.join(', ')})`)
    }

    this.defaultLanguage = defaultLanguage
    this.availableLanguages = [defaultLanguage, ...extraLanguages]
  }

  match(languages: readonly string[] | string | undefined | null): ISOLanguage {
    // Use the default when no preferences are supplied.
    if (!languages) return this.defaultLanguage

    // Treat a single preference as a list.
    if (typeof languages === 'string') languages = [languages]

    // Preserve preference order.
    for (const language of languages) {
      const normalized = normalizeLanguage(language)
      if (!normalized) continue // empty after normalization

      if (this.availableLanguages.includes(normalized)) {
        return normalized
      }
    }

    // Fall back when no preference matches.
    return this.defaultLanguage
  }
}

/** The {@link LanguageMatcher} constructor */
export const LanguageMatcher = LanguageMatcherImpl as LanguageMatcherConstructor
