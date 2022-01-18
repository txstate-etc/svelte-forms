<script lang="ts">
  import { getContext } from 'svelte'
  import { FORM_CONTEXT } from './FormStore'
  import type { FormStore } from './FormStore'
  import SubForm from './SubForm.svelte'

  export let path: string
  export let initialState: any = {}
  export let startEmpty: boolean = false
  export let addMoreText: string = '+ Add'
  export let addMoreClass: string = ''

  const store = getContext<FormStore>(FORM_CONTEXT)
  const arr = store.getField<any[]>(path)
  if (!$arr?.length) {
    if (startEmpty) store.setField(path, [])
    else store.push(path, initialState)
  }
  function onClick () {
    store.push(path, initialState)
  }
</script>

<SubForm {path}>
  {#each $arr as value,index}
    <slot {path} {index} {value} />
  {/each}
  <slot name="addmore" {onClick} {addMoreText}>
    <button type="button" class={addMoreClass} on:click={onClick}>{addMoreText}</button>
  </slot>
</SubForm>
