import { expect, it, vi } from 'vitest'
import { dateSerialize, dateDeserialize, datetimeSerialize, datetimeDeserialize, nullableSerialize, nullableDeserialize, numberDeserialize, numberNullableDeserialize, jsonSerialize, jsonDeserialize } from '../src/lib/util.js'

it('dateDeserialize anchors the date at noon local time and serializes back to the same day', () => {
  const dt = dateDeserialize('2026-07-04')
  expect(dt.getFullYear()).toBe(2026)
  expect(dt.getMonth()).toBe(6)
  expect(dt.getDate()).toBe(4)
  expect(dt.getHours()).toBe(12)
  expect(dateSerialize(dt)).toBe('2026-07-04')
})

it('dateDeserialize returns undefined for an empty string', () => {
  expect(dateDeserialize('')).toBeUndefined()
})

it('datetime serialize/deserialize round-trips with hour and minute preserved', () => {
  const dt = datetimeDeserialize('2026-07-04T13:30')
  expect(dt.getHours()).toBe(13)
  expect(dt.getMinutes()).toBe(30)
  expect(datetimeSerialize(dt)).toBe('2026-07-04T13:30')
})

it('nullable serialize/deserialize treats empty string and undefined as equivalent', () => {
  expect(nullableSerialize(undefined)).toBe('')
  expect(nullableDeserialize('')).toBeUndefined()
  expect(nullableDeserialize('hello')).toBe('hello')
})

it('numberDeserialize converts invalid input to 0 while the nullable variant returns undefined', () => {
  expect(numberDeserialize('abc')).toBe(0)
  expect(numberDeserialize('4.5')).toBe(4.5)
  expect(numberNullableDeserialize('abc')).toBeUndefined()
  expect(numberNullableDeserialize('')).toBeUndefined()
  expect(numberNullableDeserialize('4.5')).toBe(4.5)
})

it('json serialize/deserialize round-trips objects and swallows parse errors', () => {
  const obj = { a: 1, b: ['two'] }
  expect(jsonDeserialize(jsonSerialize(obj))).toEqual(obj)

  // jsonDeserialize logs the parse error it swallows - silence it so the test output stays clean
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(jsonDeserialize('not json')).toBeUndefined()
  expect(consoleError).toHaveBeenCalledOnce()
  consoleError.mockRestore()
})
