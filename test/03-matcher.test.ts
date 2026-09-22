import { describe, expect, it } from 'vitest'

import { LanguageMatcher } from '../lib'

describe('Language Matcher', () => {
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
    expect(() => new LanguageMatcher('XX' as any)).toThrow(/At least one valid/)
    expect(() => new LanguageMatcher([ 'XX' ] as any)).toThrow(/At least one valid/)
  })
})
