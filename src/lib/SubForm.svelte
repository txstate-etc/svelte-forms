<script lang="ts">
  import { getContext, setContext } from 'svelte'
  import { isNotBlank } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { FormStore } from './FormStore'

  export let path: string
  export let conditional: boolean|undefined = undefined

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const finalPath = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  const obj = store.getField(path)

  setContext(FORM_INHERITED_PATH, finalPath)
  $: if (conditional === false) store.setField(finalPath, undefined)
</script>
{#if conditional !== false}
  <slot value={$obj} path={finalPath} />
{/if}
