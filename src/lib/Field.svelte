<script lang="ts">
  import { getContext } from 'svelte'
  import { isNotNull } from 'txstate-utils'
  import { Feedback, FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { FormStore } from './FormStore'

  export let path: string
  export let defaultValue: any = ''
  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const finalPath = [inheritedPath, path].filter(isNotNull).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  store.registerField(finalPath)

  type T = $$Generic
  interface $$Slots {
    default: {
      path: string
      value: T
      messages: Feedback[]
      setVal: (val: T) => void
      onChange: () => void
      onBlur: () => void
    }
  }
  const val = store.getField<T>(finalPath)
  const messages = store.getFeedback(finalPath)
  $: resolvedVal = $val ?? defaultValue

  function setVal (val: T) {
    store.setField(finalPath, val)
  }

  function onChange () {
    setVal(this.value)
  }

  function onBlur () {
    store.dirtyField(finalPath)
  }
</script>

{@html '<!-- svelte-forms(' + finalPath + ') -->'}
<slot path={finalPath} value={resolvedVal} messages={$messages} {setVal} {onChange} {onBlur} />
