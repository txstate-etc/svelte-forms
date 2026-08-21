import { afterEach, expect, it } from 'vitest'
import { FormStore } from '../src/lib/FormStore.js'

/**
 * Regression tests for the autosave race that lost user input. When a submit was
 * already in flight, a second submit call would coalesce onto the in-flight network
 * promise without transmitting its own payload, yet still record its captured data
 * as saved. hasUnsavedChanges then reported false, so an autoSave consumer that
 * reloads and re-preloads after every save would overwrite the form with the older
 * server state, losing everything typed while the first save was in flight.
 *
 * The fix queues exactly one trailing resubmit that runs when the in-flight submit
 * settles, carrying whatever the form state is at that moment.
 */

// a submitFn we can hold open and release on command, so tests control exactly
// when each network request settles. Pass per-call responses to make a specific
// save fail; unspecified calls succeed.
function makeStore (results = []) {
  const sent = []
  const events = []
  const releases = []
  const store = new FormStore(async data => {
    const callIndex = sent.length
    sent.push(data.text)
    await new Promise(resolve => { releases.push(resolve) })
    return results[callIndex] ?? { success: true, messages: [] }
  })
  store.autoSave = true
  store.dispatch = name => { events.push(name); return true }
  store.mount()
  // the store finalizes data asynchronously before invoking submitFn, so wait
  // for the network request to actually start before releasing it
  const releaseNext = async () => {
    while (releases.length === 0) await new Promise(resolve => setTimeout(resolve, 0))
    releases.shift()()
  }
  const inFlightCount = () => releases.length
  return { store, sent, events, releaseNext, inFlightCount }
}

// let the released submit's continuations (post-processing, trailing chain,
// a trailing transmission) run to quiescence
async function settle () {
  await new Promise(resolve => setTimeout(resolve, 0))
}

let store
afterEach(() => {
  // clear any pending autosave debounce timers so they cannot fire mid-test later
  store?.reset()
  store = undefined
})

it('transmits changes made while a save was in flight via a single trailing resubmit', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit({ autoSave: true })
  await store.setField('text', 'hello world') // user keeps typing while A is in flight
  const submitB = store.submit({ autoSave: true }) // autosave debounce fires during the flight
  const submitC = store.submit({ autoSave: true }) // and again - must share the same trailing run
  await settle()
  // only the first payload has gone out; the in-flight request was not duplicated
  expect(s.sent).toEqual(['hello'])

  await s.releaseNext()
  await settle()
  // the trailing resubmit fired immediately with the latest state, exactly once
  expect(s.sent).toEqual(['hello', 'hello world'])
  expect(s.inFlightCount()).toBe(1)

  await s.releaseNext()
  await settle()
  const [respA, respB, respC] = await Promise.all([submitA, submitB, submitC])
  expect(respA.success).toBe(true)
  expect(respB.success).toBe(true)
  expect(respC.success).toBe(true)
  expect(store.value.hasUnsavedChanges).toBe(false)
})

it('keeps hasUnsavedChanges true after the first save lands, so consumers do not preload over unsaved input', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit({ autoSave: true })
  await store.setField('text', 'hello world')
  const submitB = store.submit({ autoSave: true })

  await s.releaseNext()
  await settle()
  // this is the window where the bug lost data: the first save has landed, the
  // trailing save is still in flight - the store must still report unsaved
  // changes and an active submission
  expect(store.value.hasUnsavedChanges).toBe(true)
  expect(store.value.submitting).toBe(true)

  await s.releaseNext()
  await settle()
  await Promise.all([submitA, submitB])
  expect(store.value.hasUnsavedChanges).toBe(false)
  expect(store.value.submitting).toBe(false)
})

it('sends the very latest state when typing continues after the trailing resubmit was queued', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'one')
  const submitA = store.submit({ autoSave: true })
  await store.setField('text', 'one two')
  const submitB = store.submit({ autoSave: true }) // trailing queued
  await store.setField('text', 'one two three') // typed after queueing, before A lands

  await s.releaseNext()
  await settle()
  expect(s.sent).toEqual(['one', 'one two three'])

  await s.releaseNext()
  await settle()
  await Promise.all([submitA, submitB])
  expect(store.value.hasUnsavedChanges).toBe(false)
})

it('does not repeat the mutation when a submit is double-fired with no new changes', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit()
  const submitB = store.submit() // e.g. a double-clicked save button

  await s.releaseNext()
  await settle()
  const [respA, respB] = await Promise.all([submitA, submitB])
  // both callers report success but only one network request went out
  expect(respA.success).toBe(true)
  expect(respB.success).toBe(true)
  expect(s.sent).toEqual(['hello'])
  expect(s.inFlightCount()).toBe(0)
  expect(store.value.submitting).toBe(false)
  expect(s.events).toEqual(['saved'])
})

it('dispatches a single autosaved event only after the whole burst is saved', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit({ autoSave: true })
  await store.setField('text', 'hello world')
  const submitB = store.submit({ autoSave: true })

  await s.releaseNext()
  await settle()
  // A committed but the trailing save carries newer input - announcing here would let
  // a consumer refresh with a snapshot missing "world" and revert the form with it
  expect(s.events).toEqual([])

  await s.releaseNext()
  await settle()
  await Promise.all([submitA, submitB])
  expect(s.events).toEqual(['autosaved'])
})

it('holds the autosaved event while typed input is still awaiting its debounced save', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit({ autoSave: true })
  await store.setField('text', 'hello world') // typed during flight, debounce has not fired yet

  await s.releaseNext()
  await settle()
  // no trailing submit exists, but the form still holds unsaved input
  expect(s.events).toEqual([])

  const submitB = store.submit({ autoSave: true }) // the debounce fires
  await s.releaseNext()
  await settle()
  await Promise.all([submitA, submitB])
  expect(s.sent).toEqual(['hello', 'hello world'])
  expect(s.events).toEqual(['autosaved'])
})

it('flushes the held announcement when the trailing resubmit is skipped', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit({ autoSave: true })
  const submitB = store.submit({ autoSave: true }) // double-fired, no new input

  await s.releaseNext()
  await settle()
  await Promise.all([submitA, submitB])
  // the trailing run skipped the resubmit, so it must announce the save it rode on -
  // otherwise the burst's commit would never be announced at all
  expect(s.sent).toEqual(['hello'])
  expect(s.events).toEqual(['autosaved'])
})

it('flushes the held announcement when the trailing save fails', async () => {
  const s = makeStore([
    { success: true, messages: [] },
    { success: false, messages: [{ type: 'error', message: 'no good', path: 'text' }] }
  ])
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit({ autoSave: true })
  await store.setField('text', 'hello world')
  const submitB = store.submit({ autoSave: true })

  await s.releaseNext()
  await settle()
  expect(s.events).toEqual([])

  await s.releaseNext()
  await settle()
  await Promise.all([submitA, submitB])
  // "hello" did commit even though "hello world" was rejected - consumers still need
  // to hear about it so surrounding UI can reflect the earlier save
  expect(s.events).toEqual(['autosaved'])
  expect(store.value.hasUnsavedChanges).toBe(true)
})

it('cancels a queued trailing resubmit when the store is reset mid-flight', async () => {
  const s = makeStore()
  store = s.store
  await store.setField('text', 'hello')
  const submitA = store.submit({ autoSave: true })
  await store.setField('text', 'hello world')
  const submitB = store.submit({ autoSave: true })
  store.reset() // e.g. the form unmounted while the save was in flight

  await s.releaseNext()
  await settle()
  await Promise.all([submitA, submitB])
  // the trailing resubmit must not fire with wiped form state
  expect(s.sent).toEqual(['hello'])
  expect(s.inFlightCount()).toBe(0)
})
