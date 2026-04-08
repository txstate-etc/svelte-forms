<script lang="ts" generics="T = object | string | number | boolean | Date | undefined">
  import { getContext, onDestroy } from 'svelte'
  import { equal, isNotBlank, set } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { Feedback, FormStore } from './FormStore'
  import { booleanDeserialize, booleanNullableDeserialize, booleanNullableSerialize, booleanSerialize, dateDeserialize, dateSerialize, datetimeDeserialize, datetimeSerialize, defaultDeserialize, defaultSerialize, jsonDeserialize, jsonSerialize, nullableDeserialize, nullableSerialize, numberDeserialize, numberNullableDeserialize, numberSerialize } from './util'

  interface $$Slots {
    default: {
      path: string
      finalPath: string
      value: any
      rawValue: any
      messages: Feedback[]
      valid: boolean
      invalid: boolean
      setVal: (val: T, notDirty?: boolean) => void
      onChange: (e?: any) => void
      onBlur: () => void
      serialize: (value: any) => string
      deserialize: (value: string) => any
    }
  }

  export let path: string
  export let defaultValue: any = undefined
  export let notNull = false
  export let number = false
  export let date = false
  export let datetime = false
  export let boolean = false
  export let json = false
  export let serialize: ((value: any) => string) | undefined = undefined
  export let deserialize: ((value: string) => any) | undefined = undefined
  export let initialize: ((value: any) => any) | undefined = undefined
  export let finalize: ((value: any, isSubmit: boolean) => any) | undefined = undefined
  export let conditional = true
  export let allowedValues: any[] | undefined = undefined
  export let allowedValuesMultiple = false
  /** Only provided for binding, useful for components that wrap Field */
  export let finalSerialize: ((v: any) => string) = () => ''
  /** Only provided for binding, useful for components that wrap Field */
  export let finalDeserialize: ((v: string) => any) = () => undefined

  $: finalSerialize = (serialize ?? (number
    ? numberSerialize
    : json
      ? jsonSerialize
      : datetime
        ? datetimeSerialize
        : date
          ? dateSerialize
          : boolean
            ? (notNull ? booleanSerialize : booleanNullableSerialize)
            : (notNull ? defaultSerialize : nullableSerialize))) as ((v: any) => string)
  $: finalDeserialize = (deserialize ?? (number
    ? (notNull ? numberDeserialize : numberNullableDeserialize)
    : json
      ? jsonDeserialize
      : datetime
        ? datetimeDeserialize
        : date
          ? dateDeserialize
          : boolean
            ? (notNull ? booleanDeserialize : booleanNullableDeserialize)
            : (notNull ? defaultDeserialize : nullableDeserialize))) as ((v: string) => any)
  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const finalPath = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  let registered = false
  const registerFieldPromise = store.registerField(finalPath, defaultValue, initialize, finalize).then(() => { registered = true })

  const val = store.getField<T>(finalPath)
  const messages = store.getFeedback(finalPath)

  const fieldValid = store.getFieldValid(finalPath)
  $: invalid = $fieldValid === 'invalid'
  $: valid = $fieldValid === 'valid'

  function setVal (v: T | ((v: T) => T)) {
    if (typeof v === 'function') v = (v as (v: T) => T)($val)
    store.setField(finalPath, v).catch(console.error)
  }

  function onChange (e: any) {
    if (this?.type === 'checkbox') {
      setVal(this.checked)
      return
    }
    const resolvedVal = this?.value ?? e.detail
    const val = finalDeserialize(resolvedVal)
    setVal(val)
    if (this instanceof HTMLInputElement) {
      const serialized = finalSerialize(val)
      // the serialize/deserialize process can convert multiple distinct input values into undefined in the store
      // this means that if the user goes from one "undefined" state to another, the store state will not change,
      // as it's just undefined -> undefined. So the input's value is not reactively overwritten to the cleaned up value.
      // we need this line here so that the input value stays in sync with the store
      if (this.value !== serialized) this.value = serialized
    }
  }

  function onBlur () {
    store.dirtyField(finalPath)
    store.updateDirtyOnBlur()
  }

  onDestroy(() => {
    store.unregisterField(finalPath)
  })

  let lastConditional: boolean | undefined = true
  async function handleConditionalData (..._: any) {
    await registerFieldPromise
    if (!conditional && lastConditional) {
      store.update(v => {
        const newData = set(v.data, finalPath, undefined)
        return { ...v, data: newData, conditionalData: { ...v.conditionalData, [finalPath]: { value: $val ?? v.conditionalData[finalPath]?.value } } }
      })
    } else if (conditional && !lastConditional) {
      store.update(v => {
        const newData = set(v.data, finalPath, v.conditionalData[finalPath]?.value)
        return { ...v, data: newData, conditionalData: { ...v.conditionalData, [finalPath]: undefined } }
      })
    }
    lastConditional = conditional
  }

  $: handleConditionalData(conditional).catch(console.error)

  async function reactToAllowedValues (..._: any[]) {
    if (allowedValues == null) return
    if (allowedValuesMultiple) {
      if (conditional) {
        if (!Array.isArray($val)) return
        const filtered = $val.filter(v => allowedValues!.some(av => equal(av, v)))
        if (!equal(filtered, $val)) await store.setField(finalPath, filtered, { notDirty: true })
      } else {
        const current = $store.conditionalData[finalPath]?.value
        if (!Array.isArray(current)) return
        const filtered = current.filter(v => allowedValues!.some(av => equal(av, v)))
        if (!equal(filtered, current)) {
          store.update(v => ({ ...v, conditionalData: { ...v.conditionalData, [finalPath]: { value: filtered } } }))
        }
      }
      return
    }
    if (!allowedValues.length) {
      return await store.setField(finalPath, finalDeserialize(''), { notDirty: true })
    }
    const resolvedDefault = notNull
      ? defaultValue != null && allowedValues.some(av => equal(av, defaultValue)) ? defaultValue : allowedValues[0]
      : finalDeserialize('')
    if (conditional) {
      if (!allowedValues.some(av => equal(av, $val))) {
        await store.setField(finalPath, resolvedDefault, { notDirty: true })
      }
    } else if ($store.conditionalData[finalPath] && !allowedValues.some(av => equal(av, $store.conditionalData[finalPath]!.value))) {
      store.update(v => ({ ...v, conditionalData: { ...v.conditionalData, [finalPath]: { value: resolvedDefault } } }))
    }
  }
  $: reactToAllowedValues(allowedValues).catch(console.error)
</script>

{@html '<!-- svelte-forms(' + finalPath + ') -->'}
{#if ((!$store.initializing && registered) || initialize == null) && conditional}
  <slot path={finalPath} finalPath={finalPath} value={finalSerialize($val)} rawValue={$val} messages={$messages} {valid} {invalid} {setVal} {onChange} {onBlur} serialize={finalSerialize} deserialize={finalDeserialize} />
{/if}
