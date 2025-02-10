import { computed, reactive, shallowRef, warn } from 'vue'

import type { DateTimeFormats, I18nOptions, ISOCountry, Translation, TranslationKey } from './index'
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
  locale: Intl.Locale

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
   * Format a number into a string according to the current language.
   *
   * If the `currency` parameter is set, the number will be formatted as a
   * currency value, using the specified currency symbol.
   */
  n(value?: number | bigint | null | undefined, currency?: string): string

  /**
   * Format a number into a string according to the current language.
   *
   * When `format` is provided, it will be used to configure the number format,
   * otherwise the default `format.numberFormat` plugin option will be used.
   */
  n(value?: number | bigint | null | undefined, format?: Intl.NumberFormatOptions): string

  d: {
    /**
     * Format date and time according to the current language.
     *
     * When `style` is provided, it will be used to configure the date and time
     * format, otherwise the default `format.dateTimeFormat` plugin option will
     * be used.
     */
    (date?: DateInput, style?: DateTimeFormats['dateTimeFormat']): string
    /**
     * Format the date part (without time) according to the current language.
     *
     * When `style` is provided, it will be used to configure the date and time
     * format, otherwise the default `format.dateOnlyFormat` plugin option will
     * be used.
     */
    date(date?: DateInput, style?: DateTimeFormats['dateOnlyFormat']): string
    /**
     * Format the time part (without date) according to the current language.
     *
     * When `style` is provided, it will be used to configure the date and time
     * format, otherwise the default `format.timeOnlyFormat` plugin option will
     * be used.
     */
    time(date?: DateInput, style?: DateTimeFormats['timeOnlyFormat']): string
  }
}

/* ===== TRANSLATOR IMPLEMENTATION ========================================== */

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

  const translations: InternalTranslations = options.translations ? structuredClone(options.translations) : {}
  const {
    dateOnlyFormat = { dateStyle: 'medium' },
    timeOnlyFormat = { timeStyle: 'medium' },
    dateTimeFormat = { dateStyle: 'medium', timeStyle: 'medium' },
    numberFormat = {},
  } = options.formats || {}

  // Current locale, from the browser's language settings
  const locale = shallowRef(new Intl.Locale(defaultLanguage))

  // Language order, from the current locale
  const languages = computed(() => {
    const { language, region } = locale.value
    const order: string[] = [ language ]
    if (region) order.unshift(`${language}-${region}`)
    if (language !== defaultLanguage) order.push(defaultLanguage)
    return order as any as LanguageKeys
  })

  // Date-time translator, from the current locale
  function dateTime(input?: DateInput, style = dateTimeFormat): string {
    if ((input == null) || (input === '')) return ''

    const date = input instanceof Date ? input : new Date(input)
    const options = typeof style === 'string' ? { dateStyle: style, timeStyle: style } : style
    return new Intl.DateTimeFormat(locale.value, options).format(date)
  }

  // Date-only translator, from the current locale
  function dateOnly(input?: DateInput, style = dateOnlyFormat): string {
    const options = typeof style === 'string' ? { dateStyle: style } : style
    return dateTime(input, options)
  }

  // Time-only translator, from the current locale
  function timeOnly(input?: DateInput, style = timeOnlyFormat): string {
    const options = typeof style === 'string' ? { timeStyle: style } : style
    return dateTime(input, options)
  }

  // The translator object (non-reactive)
  const translator = {
    get locale() {
      return locale.value
    },

    set locale(value: Intl.Locale) {
      locale.value = value
    },

    get language(): ISOLanguage {
      return translator.locale.language as ISOLanguage
    },

    set language(value: ISOLanguage) {
      translator.locale = new Intl.Locale(value, { ...locale.value })
    },

    get region(): ISOCountry | undefined {
      return translator.locale.region as ISOCountry
    },

    set region(value: ISOCountry | undefined) {
      translator.locale = new Intl.Locale(translator.language, { ...translator.locale, region: value || undefined })
    },

    n(value?: number | bigint | null | undefined, currencyOrOptions?: string | Intl.NumberFormatOptions): string {
      if (value == null) return '' // null or undefined produces an empty string
      if (typeof currencyOrOptions === 'string') {
        const currency = currencyOrOptions
        return new Intl.NumberFormat(translator.locale, { style: 'currency', currency }).format(value)
      } else {
        const options = currencyOrOptions || numberFormat
        return new Intl.NumberFormat(translator.locale, options).format(value)
      }
    },

    t(translation: TranslationKey | Translation, params?: TranslationParams): string {
      return translator.tc(translation, 1, params)
    },

    tc(translation: TranslationKey | Translation, n: number, params?: TranslationParams): string {
      const template = getTemplate(translations, translation, languages.value)
      const format = new Intl.NumberFormat(translator.locale, numberFormat)
      return replaceParams(template, Object.assign({ n }, params), format)
    },

    d: Object.assign(dateTime, { date: dateOnly, time: timeOnly }),
  } as const satisfies Translator

  // Return a reactive version of the translator
  return reactive(translator)
}

/* ===== TRANSLATION UTILITIES ============================================== */

type LanguageKeys = readonly [ string, ...string[] ]
type InternalTranslation = Record<string, string | undefined>
type InternalTranslations = Record<string, InternalTranslation>
type TranslationTemplate = { zero: string, singular: string, plural: string }

/**
 * Cached parsed translation templates.
 *
 * The keys are:
 * 1) the translations instance (WeakMap key)
 * 2) the current language (first entry in the order)
 * 3) the translation key
 */
const caches = new WeakMap<InternalTranslations, Record<string, Record<string, TranslationTemplate>>>()

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
    if (! cache) caches.set(translations, cache = {})

    // Get the cache for the current language
    let languageCache = cache[languages[0]]
    if (! languageCache) cache[languages[0]] = languageCache = {}

    // Get the translation from the cache or parse it
    let template = languageCache[translation]
    if (! template) {
      let object = translations[translation]
      if (! object) {
        warn(`Translation key "${translation}" not found`)
        object = { [languages[languages.length - 1]!]: translation }
      }
      template = extractTemplate(object, languages)
      languageCache[translation] = template
    }

    return template
  } else {
    return extractTemplate(translation, languages)
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
    string = translation[language as any]
    if (string) break
  }

  if (! string) {
    const language = languages[languages.length - 1]
    warn(`Translation missing default language "${language}" in`, translation)
    return { zero: '', singular: '', plural: '' }
  }

  let parsed: TranslationTemplate

  const translations = string.split(/(?<!\\)(?:\\\\)*\|/)
  if (translations.length === 1) {
    const [ singular ] = translations
    parsed = { zero: singular!, singular: singular!, plural: singular! }
  } else if (translations.length === 2) {
    const [ singular, plural ] = translations
    parsed ={ zero: plural!, singular: singular!, plural: plural! }
  } else {
    const [ zero, singular, plural ] = translations
    parsed ={ zero: zero!, singular: singular!, plural: plural! }
  }

  const { zero, singular, plural } = parsed
  return { zero: zero.trim(), singular: singular.trim(), plural: plural.trim() }
}

/** Replace the parameters in a translation template, returning a string */
function replaceParams(
    template: TranslationTemplate,
    params: TranslationParams,
    format: Intl.NumberFormat,
): string {
  // Select the template to use based on the "n" (number) parameter
  const n = typeof params.n === 'string' ? Number(params.n) : params.n
  let formatted = n === 0 ? template.zero :
                  n === 1 ? template.singular :
                  template.plural

  // Replace any property `{ prop }` with the associated value
  for (const [ prop, value ] of Object.entries(params)) {
    const string =
      typeof value === 'number' ? format.format(value) :
      typeof value === 'string' ? value :
      value ? String(value) : ''

    // Expression matches `{ xxx }` where `{` is _not_ preceded by a '\'
    const expr = new RegExp(`(.|^)({\\s*${prop}\\s*})`, 'gi')
    formatted = formatted.replaceAll(expr, (_, before, token) => {
      return before === '\\' ? token : before + string
    })
  }

  // All done!
  return formatted.trim()
}
