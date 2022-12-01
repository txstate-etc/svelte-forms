<script lang="ts">
  import { getContext, onDestroy } from 'svelte'
  import { isNotBlank } from 'txstate-utils'
  import { type Feedback, FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { FormStore } from './FormStore'
  import { booleanDeserialize, booleanNullableDeserialize, booleanSerialize, dateDeserialize, dateSerialize, datetimeDeserialize, datetimeSerialize, defaultDeserialize, defaultSerialize, nullableDeserialize, nullableSerialize, numberDeserialize, numberNullableDeserialize, numberSerialize } from './util'

  type T = $$Generic<object|string|number|boolean|Date>
  interface $$Slots {
    default: {
      path: string
      value: any
      messages: Feedback[]
      valid: boolean
      invalid: boolean
      setVal: (val: T) => void
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
  export let serialize: ((value: any) => string)|undefined = undefined
  export let deserialize: ((value: string) => any)|undefined = undefined
  export let conditional: boolean | undefined = true
  $: finalSerialize = (serialize ?? (number
    ? numberSerialize
    : datetime
      ? datetimeSerialize
      : date
        ? dateSerialize
        : boolean
          ? booleanSerialize
          : (notNull ? defaultSerialize : nullableSerialize))) as ((v: any) => string)
  $: finalDeserialize = (deserialize ?? (number
    ? (notNull ? numberDeserialize : numberNullableDeserialize)
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
  store.registerField(finalPath, defaultValue, conditional)

  const val = store.getField<T>(finalPath)
  const messages = store.getFeedback(finalPath)
  $: resolvedVal = finalSerialize($val)

  const fieldValid = store.getFieldValid(finalPath)
  $: invalid = $fieldValid === 'invalid'
  $: valid = $fieldValid === 'valid'

  function setVal (v: T|((v: T) => T)) {
    if (typeof v === 'function') v = v($val)
    store.setField(finalPath, v)
    store.dirtyField(finalPath)
  }

  function onChange (e: any) {
    const resolvedVal = this.value ?? e.detail
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
  }

  onDestroy(() => {
    store.unregisterField(finalPath)
  })

  let lastConditional = true
  function handleConditionalData (..._: any) {
    if (!conditional && lastConditional) {
      store.update(v => ({ ...v, conditionalData: { ...v.conditionalData, [finalPath]: $val } }))
      store.setField(finalPath, undefined)
    } else if (conditional && !lastConditional) {
      store.setField(finalPath, $store.conditionalData[finalPath])
      store.update(v => ({ ...v, conditionalData: { ...v.conditionalData, [finalPath]: undefined } }))
    }
    lastConditional = conditional
  }

  $: handleConditionalData(conditional)
</script>

{@html '<!-- svelte-forms(' + finalPath + ') -->'}
{#if conditional !== false}
  <slot path={finalPath} value={resolvedVal} messages={$messages} {valid} {invalid} {setVal} {onChange} {onBlur} serialize={finalSerialize} deserialize={finalDeserialize} />
{/if}
