import { describe, expect, expectTypeOf, it } from 'vitest'

import { LanguageMatcher } from '../lib'

describe('Language Matcher', () => {
  it('should accept readonly inputs and preserve the configured language types', () => {
    const languages = [ 'en', 'de' ] as const
    const matcher = new LanguageMatcher(Object.freeze(languages))
    const preferences = Object.freeze([ 'fr-FR', 'de-DE' ])

    expect(matcher.match(preferences)).toBe('de')
    expect(matcher.availableLanguages).toEqual(languages)
    expect(matcher.availableLanguages).not.toBe(languages)
    expectTypeOf(matcher.availableLanguages).toEqualTypeOf<readonly [ 'en', 'de' ]>()
    expectTypeOf(matcher.defaultLanguage).toEqualTypeOf<'en'>()
    expectTypeOf(matcher.match(preferences)).toEqualTypeOf<'en' | 'de'>()
    expectTypeOf(matcher.match(navigator.languages)).toEqualTypeOf<'en' | 'de'>()

    const inferred = new LanguageMatcher([ 'en', 'de' ])
    expectTypeOf(inferred.availableLanguages).toEqualTypeOf<readonly [ 'en', 'de' ]>()
    const single = new LanguageMatcher('en')
    expectTypeOf(single.availableLanguages).toEqualTypeOf<readonly [ 'en' ]>()
    expectTypeOf(single.defaultLanguage).toEqualTypeOf<'en'>()

    // @ts-expect-error A matcher must have at least one available language.
    expectTypeOf<LanguageMatcher<readonly []>>()
  })

  it('should construct with a single language', () => {
    const matcher = new LanguageMatcher('en')
    expect(matcher.defaultLanguage).toBe('en')
    expect(matcher.availableLanguages).toEqual([ 'en' ])
    expect(matcher.match('en')).toBe('en')
    expect(matcher.match('EN-US')).toBe('en') // normalization
    expect(matcher.match('fr')).toBe('en') // fallback to default language
    expect(matcher.match([ 'de', 'EN-US', 'ja-JP' ])).toBe('en') // array
    expect(matcher.match(null)).toBe('en') // default
  })

  it('should construct with an array of languages', () => {
    const matcher = new LanguageMatcher([ 'en', 'XX', 'JA-JP', 'de' ] as any)
    expect(matcher.defaultLanguage).toBe('en')
    expect(matcher.availableLanguages).toEqual([ 'en', 'ja', 'de' ])
    expect(matcher.match('de')).toBe('de')
    expect(matcher.match('JA-JP')).toBe('ja') // normalization
    expect(matcher.match('fr')).toBe('en') // fallback to default language
    expect(matcher.match([ null, 'de', 'EN-US' ] as any)).toBe('de') // array
    expect(matcher.match([ '-de', 'ja' ] as any)).toBe('ja') // array
    expect(matcher.match(null)).toBe('en') // default
  })

  it('should throw when constructed with wrong languages', () => {
    // @ts-expect-error An empty tuple cannot provide a default language.
    expect(() => new LanguageMatcher([] as const)).toThrow(/At least one valid/)
    expect(() => new LanguageMatcher('XX' as any)).toThrow(/At least one valid/)
    expect(() => new LanguageMatcher([ 'XX' ] as any)).toThrow(/At least one valid/)
  })
})
