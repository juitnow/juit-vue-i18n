import { computed, reactive, shallowRef, warn, watch } from 'vue'

import { ISO_COUNTRIES } from './iso-3166'
import { ISO_CURRENCIES } from './iso-4217'
import { ISO_LANGUAGES } from './iso-639'

import type { DateTimeFormatAlias, DateTimeFormats, I18nOptions, ISOCountry, NumberFormatAlias, NumberFormats, Translation, TranslationKey } from './index'
import type { ISOLanguage } from './iso-639'

/* ===== TRANSLATOR INTERFACE =============================================== */

/**
 * Parameters for the formatting of a translation.
 *
 * This type is used to pass parameters to the `t` and `tc` methods of the
 * translator, allowing for the interpolation of values into the translated
 * message.
 *
 * When the parameter value is a number, it will be formatted using the `n`
 * formatter before being interpolated into the message.
 */
export interface TranslationParams {
  [ key: string ]: string | number
}

/**
 * The date input type for date and time translation
 *
 * When the input is a non-empty `string`, or a `number`, it will be constructed
 * into a `Date` object before being formatted.
 *
 * When the input is `null`, `undefined`, or an empty string, formatted result
 * will be a simple empty string.
 */
export type DateInput = Date | string | number | null | undefined

/**
 * The translator interface for the application.
 *
 * This interface provides methods to translate messages, format numbers, and
 * format dates and times.
 *
 * Configured instances can be accessed using the `useI18n()` composition
 * function, which will provide an instance of the translator.
 */
export interface Translator {
  /** The current ISO-639-1 language code used by this translator. */
  language: ISOLanguage
  /** The region (if any) used by thus translator to localize translations. */
  region: ISOCountry | undefined
  /** The `Locale` used by this translator (merges `language` and `region`) */
  locale: Readonly<Intl.Locale>

  /**
   * Return the (possibly parameterized) translation for the specified message
   * in the current language.
   *
   * Internally, this method uses the `tc(...)` function with `n=1`, in order to
   * avoid duplication of message keys
   */
  t(key: TranslationKey | Translation, params?: TranslationParams): string

  /**
   * Return the (possibly parameterized) translation for the specified message
   * in the current language, with pluralization.
   *
   * For pluralization, translation messages should be separated by the pipe
   * character, like in Vue I18N. Example:
   *
   * * `" one apple | {n} apples "` when _two_ translations are separated by a
   *   pipe, the first will be used for singular, the second for zero or plural
   * * `" no apples | one apple | {n} apples "` when _three_ translations are
   *   separated by a pipe, the first will be used for zero, the second for
   *   singular, the second for zero or plural
   *
   * For convenience, the `{n}` message parameter will always be contextualized
   * with the number, unless overridden in the `params` themselves.
   */
  tc(key: TranslationKey | Translation, n: number, params?: TranslationParams): string

  /**
   * Format a number according to the current language.
   *
   * When `format` is provided, it will be used to configure the number format.
   * This can be one of the aliases specified at initialization, or a
   * fully-fledged `Intl.NumberFormatOptions` object.
   */
  n(value?: number | bigint | null | undefined, format?: NumberFormatAlias | Intl.NumberFormatOptions): string

  /**
   * Format date and time according to the current language.
   *
   * When `format` is provided, it will be used to configure the date and time
   * format. This can be one of the aliases specified at initialization, or a
   * fully-fledged `Intl.DateTimeFormatOptions` object.
   */
  d(date?: DateInput, format?: DateTimeFormatAlias | Intl.DateTimeFormatOptions, timeZone?: string): string

  /** Extra internationalization utilities */
  utils: {
    /**
     * Return the name of the language for the given ISO-639-1 code localized
     * using the current language
     */
    language(code: ISOLanguage): string

    /**
     * Return the name of the country (or region) for the given ISO-3166-1 code
     * (or CLDR region code) using the current language
     */
    country(code: ISOCountry | 'EU' | 'UN'): string

    /**
     * Return the flag emoji for the given ISO-3166-1 code (or CLDR region
     * code).
     */
    flag(code: ISOCountry | 'EU' | 'UN'): string

    /**
     * Update the translations used by this translator.
     */
    updateTranslations(translations: Partial<Record<TranslationKey, Partial<Translation>>>): void
  }
}

/* ===== TRANSLATOR IMPLEMENTATION ========================================== */

function checkLocale(locale: Intl.Locale): void {
  if (! ISO_LANGUAGES.includes(locale.language as any)) {
    warn(`Unknown language code "${locale.language}"`)
  }

  if (! locale.region) return

  if (! ISO_COUNTRIES.includes(locale.region as any)) {
    warn(`Unknown region code "${locale.region}"`)
  }
}

/** Create a _reactive_ translator object from the given options */
export function makeTranslator(options: I18nOptions): Translator {
  // Default locale, parsing the default language
  const defaultLocale: Intl.Locale = typeof options.defaultLanguage === 'string' ?
    new Intl.Locale(options.defaultLanguage) :
    options.defaultLanguage

  // Normalized default language (language-REGION)
  const defaultLanguage = defaultLocale.region ?
    `${defaultLocale.language}-${defaultLocale.region}` :
    defaultLocale.language

  // Default time zone
  const defaultTimeZone = options.defaultTimeZone

  // Build our internal translations map
  const translations: InternalTranslations = new Map()
  Object.entries(options.translations ?? {}).forEach(([ key, value ]) => {
    translations.set(key, new Map(Object.entries(value ?? {})))
  })

  // Create from `null` proto: we don't want to inherit from Object.prototype
  const dateTimeFormats: DateTimeFormats = Object.assign(Object.create(null), {
    default: { dateStyle: 'medium', timeStyle: 'medium' },
    short: { dateStyle: 'short', timeStyle: 'short' },
    medium: { dateStyle: 'medium', timeStyle: 'medium' },
    long: { dateStyle: 'long', timeStyle: 'long' },
    full: { dateStyle: 'full', timeStyle: 'full' },

    // date only formats
    date: { dateStyle: 'medium' },
    shortDate: { dateStyle: 'short' },
    mediumDate: { dateStyle: 'medium' },
    longDate: { dateStyle: 'long' },
    fullDate: { dateStyle: 'full' },

    // time only formats
    time: { timeStyle: 'medium' },
    shortTime: { timeStyle: 'short' },
    mediumTime: { timeStyle: 'medium' },
    longTime: { timeStyle: 'long' },
    fullTime: { timeStyle: 'full' },

    // overrides and custom formats
    ...options.dateTimeFormats,
  })

  // Create from `null` proto: we don't want to inherit from Object.prototype
  const numberFormats: NumberFormats = Object.assign(Object.create(null), {
    // Expand all currency codes into number formats for currencies
    ...ISO_CURRENCIES.reduce((formats, currency) => {
      formats[currency] = { style: 'currency', currency }
      return formats
    }, {} as Record<string, Intl.NumberFormatOptions>),
    // Add the default number format
    default: {},
    // Overrides and custom formats
    ...options.numberFormats,
  })

  // Current locale, from the browser's language settings
  const locale = shallowRef(new Intl.Locale(defaultLanguage))
  watch(locale, checkLocale, { immediate: true })
  // checkLocale(locale.value)

  // Language order, from the current locale
  const languages = computed(() => {
    const { language, region } = locale.value
    const order: string[] = [ language ]
    if (region) order.unshift(`${language}-${region}`)
    if (language !== defaultLanguage) order.push(defaultLanguage)
    if (! order.includes(defaultLocale.language)) order.push(defaultLocale.language)
    return order as any as LanguageKeys
  })

  // The translator object (non-reactive)
  const translator = {
    get locale() {
      return locale.value
    },

    set locale(value: Intl.Locale) {
      locale.value = new Intl.Locale(value.language, { region: value.region })
    },

    get language(): ISOLanguage {
      return translator.locale.language as ISOLanguage
    },

    set language(value: ISOLanguage) {
      translator.locale = new Intl.Locale(value, { region: translator.region })
    },

    get region(): ISOCountry | undefined {
      return translator.locale.region as ISOCountry
    },

    set region(value: ISOCountry | undefined) {
      translator.locale = new Intl.Locale(translator.language, { region: value || undefined })
    },

    n(value?: number | bigint | null | undefined, format: string | Intl.NumberFormatOptions = 'default'): string {
      if (value == null) return '' // null or undefined produces an empty string

      const options = typeof format === 'string' ? numberFormats[format] : format
      if (! options) warn(`NumberFormat alias "${format}" not found`)

      return new Intl.NumberFormat(translator.locale, options).format(value)
    },

    t(translation: TranslationKey | Translation, params?: TranslationParams): string {
      return translator.tc(translation, 1, params)
    },

    tc(translation: TranslationKey | Translation, n: number, params?: TranslationParams): string {
      const template = getTemplate(translations, translation, languages.value)
      const format = new Intl.NumberFormat(translator.locale, numberFormats['default'])
      return replaceParams(template, { n, ...params }, format)
    },

    d(input?: DateInput, format: DateTimeFormatAlias | Intl.DateTimeFormatOptions = 'default', timeZone?: string): string {
      if ((input == null) || (input === '')) return ''

      const date = input instanceof Date ? input : new Date(input)
      const options = typeof format === 'string' ? dateTimeFormats[format] : format
      if (! options) warn(`DateTimeFormat alias "${format}" not found`)

      // Prefer the explicit time zone, then the format's zone, then the default.
      timeZone = timeZone ?? options?.timeZone ?? defaultTimeZone

      // Preserve inherited and non-enumerable getters that spreading would lose.
      // Define our own timeZone to override readonly properties without modifying the caller.
      const optionsWithTimeZone = Object.create(options ?? null, {
        timeZone: { value: timeZone, enumerable: true },
      }) as Intl.DateTimeFormatOptions

      // Format our date, optionally defaulting the time zone
      return new Intl.DateTimeFormat(locale.value, optionsWithTimeZone).format(date)
    },

    utils: {
      language(code: ISOLanguage): string {
        return new Intl.DisplayNames(translator.locale, { type: 'language' }).of(code)!
      },
      country(code: ISOCountry | 'EU' | 'UN'): string {
        return new Intl.DisplayNames(translator.locale, { type: 'region' }).of(code)!
      },
      flag(code: ISOCountry | 'EU' | 'UN'): string {
        return [ ...code ]
            .map((c) => c.codePointAt(0)!)
            .map((n) => 0x1f1a5 + n)
            .map((n) => String.fromCodePoint(n))
            .join('')
      },
      updateTranslations(updates: Partial<Record<TranslationKey, Partial<Translation>>>): void {
        let updated = false

        for (const [ key, translation ] of Object.entries(updates)) {
          if (! translation) continue

          for (const [ lang, value ] of Object.entries(translation)) {
            if (! value) continue

            let translation = translations.get(key)
            if (! translation) translation = new Map()
            translation.set(lang, value)
            translations.set(key, translation)
            updated = true
          }
        }

        // Clear the cache for the updated translations
        // istanbul ignore else // no need to clear the cache if no updates made
        if (updated) caches.delete(translations)
      },
    },
  } as const satisfies Translator

  // Return a reactive version of the translator
  return reactive(translator)
}

/* ===== TRANSLATION UTILITIES ============================================== */

type LanguageKeys = readonly [ string, ...string[] ]
type InternalTranslation = Map<string, string | undefined>
type InternalTranslations = Map<string, InternalTranslation>
type TemplatePart = string | { param: string }
type TranslationTemplate = { zero: TemplatePart[], singular: TemplatePart[], plural: TemplatePart[] }

/**
 * Cached parsed translation templates.
 *
 * The keys are:
 * 1) the translations instance (WeakMap key)
 * 2) the current language (first entry in the order)
 * 3) the translation key
 */
const caches = new WeakMap<InternalTranslations, Map<string, Map<string, TranslationTemplate>>>()

/** Get the `TranslationTemplate` for the translation or translation key. */
function getTemplate(
    translations: InternalTranslations,
    translation: TranslationKey | Translation,
    languages: LanguageKeys,
): TranslationTemplate {
  if (! translation) throw new Error('No translation key specified')

  if (typeof translation === 'string') {
    // Get the cache for the messages instance
    let cache = caches.get(translations)
    if (! cache) caches.set(translations, cache = new Map())

    // Get the cache for the current language
    let languageCache = cache.get(languages[0])
    if (! languageCache) cache.set(languages[0], languageCache = new Map())

    // Get the translation from the cache or parse it
    let template = languageCache.get(translation)
    if (! template) {
      let object = translations.get(translation)
      if (! object) {
        warn(`Translation key "${translation}" not found`)
        object = new Map()
        object.set(languages[languages.length - 1]!, translation)
      }
      template = extractTemplate(object, languages)

      languageCache.set(translation, template)
    }

    return template
  } else {
    // At this point "translation" here is a record of language-to-string
    // mappings... let's convert it to an InternalTranslation map
    const map: InternalTranslation = new Map(Object.entries(translation))
    return extractTemplate(map, languages)
  }
}

/**
 * Extract a message from a translation, according to its locale, and split
 * it into its parsed components: zero, singular, and plural.
 */
function extractTemplate(
    translation: InternalTranslation,
    languages: LanguageKeys,
): TranslationTemplate {
  let string: string | undefined = undefined

  for (const language of languages) {
    string = translation.get(language)
    if (string) break
  }

  if (! string) {
    const language = languages[languages.length - 1]
    warn(`Translation missing default language "${language}" in`, translation)
    return { zero: [], singular: [], plural: [] }
  }

  const translations: string[] = []
  let start = 0
  let part = ''

  // An odd backslash escapes the pipe; each pair represents a literal backslash.
  for (const match of string.matchAll(/(\\*)\|/g)) {
    const slashes = match[1]!.length
    part += string.slice(start, match.index) + '\\'.repeat(Math.floor(slashes / 2))
    if (slashes % 2) {
      part += '|'
    } else {
      translations.push(part)
      part = ''
    }
    start = match.index + match[0].length
  }
  translations.push(part + string.slice(start))
  const [ first, second, third ] = translations.map(parseTemplate)
  if (translations.length === 1) {
    return { zero: first!, singular: first!, plural: first! }
  } else if (translations.length === 2) {
    return { zero: second!, singular: first!, plural: second! }
  } else {
    return { zero: first!, singular: second!, plural: third! }
  }
}

/** Parse balanced placeholders and resolve escapes independently of parameter values. */
function parseTemplate(template: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  let literal = ''

  for (let index = 0; index < template.length; index++) {
    if (template[index] !== '{') {
      literal += template[index]
      continue
    }

    // Balanced braces preserve parameter names such as "x{y}".
    let end = index + 1
    let depth = 1
    for (; end < template.length; end++) {
      if (template[end] === '{') depth++
      if (template[end] === '}' && --depth === 0) break
    }
    if (depth) {
      literal += template.slice(index)
      break
    }

    if (literal.endsWith('\\')) {
      literal = literal.slice(0, -1) + template.slice(index, end + 1)
    } else {
      if (literal) parts.push(literal)
      parts.push({ param: template.slice(index + 1, end).trim() })
      literal = ''
    }
    index = end
  }

  if (literal) parts.push(literal)
  return parts
}

/** Replace the parameters in a translation template, returning a string */
function replaceParams(
    template: TranslationTemplate,
    params: TranslationParams,
    format: Intl.NumberFormat,
): string {
  // Select the template to use based on the "n" (number) parameter
  const n = typeof params.n === 'string' ? Number(params.n) : params.n
  const formatted = n === 0 ? template.zero :
    n === 1 ? template.singular :
    template.plural

  return formatted.map((part) => {
    if (typeof part === 'string') return part
    if (! Object.hasOwn(params, part.param)) return `{${part.param}}`

    const value = params[part.param]
    return typeof value === 'number' ? format.format(value) :
      typeof value === 'string' ? value :
      value ? String(value) : ''
  }).join('').trim()
}
