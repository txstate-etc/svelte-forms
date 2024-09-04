<script lang="ts" generics="T = any">
  import { getContext, setContext } from 'svelte'
  import { isNotBlank } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { FormStore } from './FormStore'

  interface $$Slots {
    default: {
      path: string
      value: Partial<T>
    }
  }

  export let path: string
  export let conditional: boolean | undefined = true

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const finalPath = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  const obj = store.getField<T>(finalPath)

  setContext(FORM_INHERITED_PATH, finalPath)
  let lastConditional: boolean | undefined = true
  function handleConditionalData (..._: any) {
    if (!conditional && lastConditional) {
      store.update(v => ({ ...v, conditionalData: { ...v.conditionalData, [finalPath]: $obj } }))
      store.setField(finalPath, undefined).catch(console.error)
    } else if (conditional && !lastConditional) {
      store.setField(finalPath, $store.conditionalData[finalPath]).catch(console.error)
      store.update(v => ({ ...v, conditionalData: { ...v.conditionalData, [finalPath]: undefined } }))
    }
    lastConditional = conditional
  }

  $: handleConditionalData(conditional)
</script>
{#if conditional}
  <slot value={$obj} path={finalPath} />
{/if}
