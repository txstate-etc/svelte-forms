<script lang="ts">
  import { getContext } from 'svelte'
  import { isNotBlank } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { FormStore } from './FormStore'
  import SubForm from './SubForm.svelte'

  export let path: string
  export let conditional: boolean | undefined = undefined

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const pathToArray = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  store.registerArray(pathToArray, undefined, 0, () => false)
  const arr = store.getField<any[]>(pathToArray)
  const reactToArr = (..._: any) => {
    if ($arr == null) store.setField(pathToArray, []).catch(console.error)
  }
  $: reactToArr($arr)
</script>

<SubForm {path} {conditional}>
  <slot />
</SubForm>
