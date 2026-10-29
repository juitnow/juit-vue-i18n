import { computed, markRaw, shallowRef, warn } from 'vue'

import { ISO_LANGUAGES } from './iso-639.ts'
import { ISO_COUNTRIES } from './iso-3166.ts'
import { ISO_CURRENCIES } from './iso-4217.ts'

import type {
  DateTimeFormatAlias,
  DateTimeFormats,
  I18nOptions,
  ISOCountry,
  NumberFormatAlias,
  NumberFormats,
  Translation,
  TranslationKey,
  TranslationMessage,
} from './index.ts'
import type { ISOLanguage } from './iso-639.ts'
import type { ComputedRef, ShallowRef } from 'vue'

/* ===== TRANSLATOR INTERFACE =============================================== */

/**
 * Placeholder values for `t` and `tc`.
 * Numbers use the current locale and the default number format.
 */
export interface TranslationParams {
  [key: string]: string | number
}

/**
 * Accepted inputs for date and time formatting.
 *
 * Strings and numbers are passed to the `Date` constructor. Numbers are
 * milliseconds since the Unix epoch. Null, undefined, and empty strings
 * produce an empty string.
 */
export type DateInput = Date | string | number | null | undefined

/**
 * Reactive locale state, translations, and number/date formatting.
 * Retrieve the app's translator with `useTranslator()`.
 */
// oxlint-disable-next-line no-redeclare - interface and constructor share a name
export interface Translator {
  /** Current ISO 639-1 language code. */
  language: ISOLanguage
  /** Current region; assigning undefined removes it. */
  region: ISOCountry | undefined
  /** The current locale. Assignments retain only the language and region. */
  locale: Readonly<Intl.Locale>

  /**
   * Translate a key or inline message using the current locale and fallbacks.
   * Delegates to `tc` with count one; `params.n` overrides that count.
   * Missing keys warn and render literally as `[key]`.
   */
  t(key: TranslationKey | Translation, params?: TranslationParams): string

  /**
   * Translate a key or inline message with basic pluralization.
   *
   * Strings split at unescaped pipes; readonly tuples contain explicit variants:
   *
   * - One variant serves every count.
   * - Two variants mean singular/plural; zero uses plural.
   * - Three variants mean zero/singular/plural.
   *
   * Tuple pipes are literal. Both forms support placeholders and their escapes.
   * `params.n` overrides the supplied count for display and variant selection.
   * Only zero and one are special; all other counts use plural.
   * Missing keys warn and render literally as `[key]` for every count.
   */
  tc(key: TranslationKey | Translation, n: number, params?: TranslationParams): string

  /**
   * Format a number according to the current locale.
   *
   * Accepts a built-in/custom alias or `Intl.NumberFormatOptions`.
   * Omitting the format selects `default`. Null or undefined produces an empty string.
   */
  n(value?: number | bigint | null, format?: NumberFormatAlias | Intl.NumberFormatOptions): string

  /**
   * Format a date and time according to the current locale.
   *
   * Accepts a built-in/custom alias or `Intl.DateTimeFormatOptions`;
   * omitting the format selects `default`. Null, undefined, or an empty string
   * produces an empty string. Time zone precedence: explicit argument, format
   * option, configured default, then runtime default.
   */
  d(date?: DateInput, format?: DateTimeFormatAlias | Intl.DateTimeFormatOptions, timeZone?: string): string

  /**
   * Merge translations and clear cached templates. Empty strings and
   * undefined values are ignored; use a tuple containing an empty string
   * for an intentionally blank message. Tuples are copied before storing.
   * Updates invalidate computed translations and schedule component renders.
   */
  updateTranslations(translations: Partial<Record<TranslationKey, Partial<Translation>>>): void

  /**
   * Check whether a translation key is configured, regardless of locale or
   * message content. Accepts any string and never warns for missing keys.
   * Reactive consumers are updated when translations are added.
   */
  hasTranslation(key: string): boolean

  /** Locale display names, flags, and the deprecated update alias. */
  utils: {
    /** Return a language name in the current locale. */
    language(code: ISOLanguage): string

    /** Return a country or region name in the current locale. */
    country(code: ISOCountry | 'EU' | 'UN'): string

    /** Return the flag emoji for a country, the EU, or the UN. */
    flag(code: ISOCountry | 'EU' | 'UN'): string

    /** @deprecated Use `translator.updateTranslations(...)` instead. */
    updateTranslations: Translator['updateTranslations']
  }
}

/* ===== TRANSLATOR IMPLEMENTATION ========================================== */

/** Built-in date and time format aliases. */
const DEFAULT_DATE_TIME_FORMATS = {
  default: { dateStyle: 'medium', timeStyle: 'medium' },
  short: { dateStyle: 'short', timeStyle: 'short' },
  medium: { dateStyle: 'medium', timeStyle: 'medium' },
  long: { dateStyle: 'long', timeStyle: 'long' },
  full: { dateStyle: 'full', timeStyle: 'full' },

  // Formats for dates only
  date: { dateStyle: 'medium' },
  shortDate: { dateStyle: 'short' },
  mediumDate: { dateStyle: 'medium' },
  longDate: { dateStyle: 'long' },
  fullDate: { dateStyle: 'full' },

  // Formats for times only
  time: { timeStyle: 'medium' },
  shortTime: { timeStyle: 'short' },
  mediumTime: { timeStyle: 'medium' },
  longTime: { timeStyle: 'long' },
  fullTime: { timeStyle: 'full' },
} as const satisfies DateTimeFormats

/** Built-in number formats, using the currency codes supported by the runtime. */
const DEFAULT_NUMBER_FORMATS = {
  ...Object.fromEntries(ISO_CURRENCIES.map((currency) => [currency, { style: 'currency', currency }])),
  default: {},
} as const satisfies NumberFormats

/** Warn about codes absent from the language and country tables. */
function checkLocale(locale: Intl.Locale): void {
  if (!ISO_LANGUAGES.includes(locale.language as any)) {
    warn(`Unknown language code "${locale.language}"`)
  }

  if (!locale.region) return

  if (!ISO_COUNTRIES.includes(locale.region as any)) {
    warn(`Unknown region code "${locale.region}"`)
  }
}

/** Internal translator state and behavior, isolated for each app. */
class TranslatorImpl implements Translator {
  private readonly _defaultTimeZone: string | undefined
  private readonly _translations: InternalTranslations
  private readonly _dateTimeFormats: DateTimeFormats
  private readonly _numberFormats: NumberFormats
  private readonly _locale: ShallowRef<Intl.Locale>
  private readonly _languages: ComputedRef<LanguageKeys>
  private readonly _translationSignal = shallowRef<object>({})
  private readonly _cache = new Map<string, Map<string, TranslationTemplate>>()

  /* ===== CONSTRUCTOR ====================================================== */

  constructor(options: I18nOptions) {
    // Internal refs provide reactivity; prevent Vue proxies from unwrapping them.
    markRaw(this)

    // Preserve detached calls while declaring behavior as prototype methods.
    this.t = this.t.bind(this)
    this.tc = this.tc.bind(this)
    this.n = this.n.bind(this)
    this.d = this.d.bind(this)
    this.updateTranslations = this.updateTranslations.bind(this)
    this.hasTranslation = this.hasTranslation.bind(this)

    // Parse the configured default language, or use the supplied locale.
    const defaultLocale =
      typeof options.defaultLanguage === 'string' ? new Intl.Locale(options.defaultLanguage) : options.defaultLanguage

    // Retain only the default language and optional region.
    const defaultLanguage = defaultLocale.region
      ? `${defaultLocale.language}-${defaultLocale.region}`
      : defaultLocale.language

    this._defaultTimeZone = options.defaultTimeZone

    // Snapshot the translations, including copies of message tuples.
    this._translations = new Map()
    Object.entries(options.translations ?? {}).forEach(([key, value]) => {
      this._translations.set(key, copyTranslation(value))
    })

    // Use null prototypes so inherited properties cannot resolve as format aliases.
    this._dateTimeFormats = Object.assign(Object.create(null), DEFAULT_DATE_TIME_FORMATS, options.dateTimeFormats)
    this._numberFormats = Object.assign(Object.create(null), DEFAULT_NUMBER_FORMATS, options.numberFormats)

    // Initialize the current locale from the configured default.
    this._locale = shallowRef(new Intl.Locale(defaultLanguage))
    checkLocale(this._locale.value)

    // Try the current regional variant and base language, then the default equivalents.
    this._languages = computed(() => {
      const { language, region } = this._locale.value
      const order: string[] = [language]
      if (region) order.unshift(`${language}-${region}`)
      if (language !== defaultLanguage) order.push(defaultLanguage)
      if (!order.includes(defaultLocale.language)) order.push(defaultLocale.language)
      return order as any as LanguageKeys
    })
  }

  /* ===== PRIVATE METHODS ================================================== */

  private _getTemplate(translation: TranslationKey | Translation, languages: LanguageKeys): TranslationTemplate {
    if (!translation) throw new Error('No translation key specified')

    if (typeof translation === 'string') {
      // Get the cache for the current language and optional region.
      let languageCache = this._cache.get(languages[0])
      if (!languageCache) this._cache.set(languages[0], (languageCache = new Map()))

      // Reuse the parsed template or build it once.
      let template = languageCache.get(translation)
      if (!template) {
        const object = this._translations.get(translation)
        if (object) {
          template = extractTemplate(object, languages)
        } else {
          warn(`Translation key "${translation}" not found`)
          // Missing keys are literal text, never message syntax.
          const fallback = `[${translation}]`
          template = { zero: [fallback], singular: [fallback], plural: [fallback] }
        }

        languageCache.set(translation, template)
      }

      return template
    } else {
      // Snapshot inline messages, including tuples, without caching the result.
      const map = copyTranslation(translation)
      return extractTemplate(map, languages)
    }
  }

  /* ===== GETTERS AND SETTERS ============================================== */

  get locale(): Readonly<Intl.Locale> {
    return this._locale.value
  }

  set locale(value: Intl.Locale) {
    const locale = new Intl.Locale(value.language, { region: value.region })
    checkLocale(locale)
    this._locale.value = locale
  }

  get language(): ISOLanguage {
    return this.locale.language as ISOLanguage
  }

  set language(value: ISOLanguage) {
    this.locale = new Intl.Locale(value, { region: this.region })
  }

  get region(): ISOCountry | undefined {
    return this.locale.region as ISOCountry
  }

  set region(value: ISOCountry | undefined) {
    this.locale = new Intl.Locale(this.language, { region: value || undefined })
  }

  /* ===== PUBLIC METHODS =================================================== */

  n(value?: number | bigint | null, format: string | Intl.NumberFormatOptions = 'default'): string {
    if (value == null) return '' // null or undefined produces an empty string

    let options: Intl.NumberFormatOptions | undefined
    if (typeof format === 'string') {
      options = this._numberFormats[format]
      if (!options) warn(`NumberFormat alias "${format}" not found`)
    } else options = format

    return new Intl.NumberFormat(this.locale, options).format(value)
  }

  t(translation: TranslationKey | Translation, params?: TranslationParams): string {
    return this.tc(translation, 1, params)
  }

  tc(translation: TranslationKey | Translation, n: number, params?: TranslationParams): string {
    // Track message updates in component renders and computed translations.
    void this._translationSignal.value
    const template = this._getTemplate(translation, this._languages.value)
    const format = new Intl.NumberFormat(this.locale, this._numberFormats['default'])
    return replaceParams(template, { n, ...params }, format)
  }

  d(
    input?: DateInput,
    format: DateTimeFormatAlias | Intl.DateTimeFormatOptions = 'default',
    timeZone?: string,
  ): string {
    if (input == null || input === '') return ''

    const date = input instanceof Date ? input : new Date(input)

    let options: Intl.DateTimeFormatOptions | undefined
    if (typeof format === 'string') {
      options = this._dateTimeFormats[format]
      if (!options) warn(`DateTimeFormat alias "${format}" not found`)
    } else options = format

    // Prefer the explicit time zone, then the format's zone, then the default.
    timeZone = timeZone ?? options?.timeZone ?? this._defaultTimeZone

    // Preserve inherited and non-enumerable getters that spreading would lose.
    // Define our own timeZone to override readonly properties without modifying the caller.
    const optionsWithTimeZone = Object.create(options ?? null, {
      timeZone: { value: timeZone, enumerable: true },
    }) as Intl.DateTimeFormatOptions

    return new Intl.DateTimeFormat(this._locale.value, optionsWithTimeZone).format(date)
  }

  hasTranslation(key: string): boolean {
    void this._translationSignal.value
    return this._translations.has(key)
  }

  updateTranslations(updates: Partial<Record<TranslationKey, Partial<Translation>>>): void {
    // Validate and copy all inputs before changing stored messages or their cache.
    const copiedUpdates = Object.entries(updates).map(
      ([key, translation]) => [key, copyTranslation(translation)] as const,
    )
    let updated = false

    for (const [key, translation] of copiedUpdates) {
      for (const [lang, value] of translation) {
        if (!value) continue

        let translation = this._translations.get(key)
        if (!translation) translation = new Map()
        translation.set(lang, value)
        this._translations.set(key, translation)
        updated = true
      }
    }

    // Invalidate templates before notifying reactive consumers.
    if (updated) {
      this._cache.clear()
      // Write a fresh identity without tracking the caller as a consumer.
      this._translationSignal.value = {}
    }
  }

  /* ===== UTILITIES ======================================================== */

  utils: Translator['utils'] = {
    updateTranslations: (updates) => {
      this.updateTranslations(updates)
    },

    language: (code) => {
      return new Intl.DisplayNames(this.locale, { type: 'language' }).of(code)!
    },
    country: (code): string => {
      return new Intl.DisplayNames(this.locale, { type: 'region' }).of(code)!
    },

    flag: (code): string => {
      return [...code] // oxlint-disable-line typescript/no-misused-spread
        .map((c) => c.codePointAt(0)!)
        .map((n) => 0x1f1a5 + n)
        .map((n) => String.fromCodePoint(n))
        .join('')
    },
  }
}

/* ===== TRANSLATION UTILITIES ============================================== */

type LanguageKeys = readonly [string, ...string[]]
type InternalMessage = string | string[]
type InternalTranslation = Map<string, InternalMessage | undefined>
type InternalTranslations = Map<string, InternalTranslation>
type TemplatePart = string | { param: string }
type TranslationTemplate = { zero: TemplatePart[]; singular: TemplatePart[]; plural: TemplatePart[] }

/** Copy and validate message tuples, allowing omitted trailing variants but no gaps. */
function copyMessage(message: TranslationMessage | undefined): InternalMessage | undefined {
  if (message == null || typeof message === 'string') return message

  const variants = [...message]
  while (variants.length && variants[variants.length - 1] === undefined) variants.pop()
  if (!variants.length || variants.length > 3) {
    throw new TypeError('Translation tuples must contain one to three strings without gaps')
  }
  return variants.map((variant) => {
    if (typeof variant !== 'string') {
      throw new TypeError('Translation tuples must contain one to three strings without gaps')
    }
    return variant
  })
}

/** Snapshot a translation, including any explicit plural tuples. */
function copyTranslation(translation: Partial<Translation> | undefined): InternalTranslation {
  return new Map(
    Object.entries(translation ?? {}).map(([language, message]) => [language, copyMessage(message)] as const),
  )
}

/** Select a message in fallback order and parse its plural variants. */
function extractTemplate(translation: InternalTranslation, languages: LanguageKeys): TranslationTemplate {
  let message: InternalMessage | undefined = undefined

  for (const language of languages) {
    message = translation.get(language)
    if (message) break
  }

  if (!message) {
    const language = languages[languages.length - 1]
    const entries = Object.fromEntries(translation.entries())
    warn(`Translation missing default language "${language}" in`, entries)
    return { zero: [], singular: [], plural: [] }
  }

  // Tuple elements are already separated; their pipes remain literal.
  const translations = typeof message === 'string' ? splitVariants(message) : message
  const [first, second, third] = translations.map(parseTemplate)
  if (translations.length === 1) {
    return { zero: first!, singular: first!, plural: first! }
  } else if (translations.length === 2) {
    return { zero: second!, singular: first!, plural: second! }
  } else {
    return { zero: first!, singular: second!, plural: third! }
  }
}

/** Split variants at unescaped pipes and decode backslash runs immediately before pipes. */
function splitVariants(string: string): string[] {
  const translations: string[] = []
  let start = 0
  let part = ''

  // Each pair produces one literal backslash; an odd remainder escapes the pipe.
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
  return translations
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

    // As with pipes, pairs are literal backslashes and an odd remainder escapes.
    let slashes = 0
    while (literal[literal.length - slashes - 1] === '\\') slashes++
    literal = literal.slice(0, literal.length - slashes) + '\\'.repeat(Math.floor(slashes / 2))

    if (slashes % 2) {
      literal += template.slice(index, end + 1)
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

/** Select a plural variant, substitute parameters once, and trim the result. */
function replaceParams(template: TranslationTemplate, params: TranslationParams, format: Intl.NumberFormat): string {
  // Select the variant using the effective count.
  const n = typeof params['n'] === 'string' ? Number(params['n']) : params['n']
  const formatted = n === 0 ? template.zero : n === 1 ? template.singular : template.plural

  return formatted
    .map((part) => {
      if (typeof part === 'string') return part
      if (!Object.hasOwn(params, part.param)) return `{${part.param}}`

      const value = params[part.param]
      return typeof value === 'number'
        ? format.format(value)
        : typeof value === 'string'
          ? value
          : value
            ? String(value)
            : ''
    })
    .join('')
    .trim()
}

/* ===== EXPORTS ============================================================ */

interface TranslatorConstructor {
  new (options: I18nOptions): Translator
}

/** Internal constructor exposed through the public instance interface. */
export const Translator: TranslatorConstructor = TranslatorImpl
