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
  export let maxedText = addMoreText
  export let maxLength = Infinity
  export let conditional: boolean|undefined = undefined

  const store = getContext<FormStore>(FORM_CONTEXT)
  const arr = store.getField<any[]>(path)
  if (!$arr?.length) {
    if (startEmpty) store.setField(path, [])
    else store.push(path, initialState)
  }
  function onClick () {
    store.push(path, initialState)
  }
  $: maxed = $arr?.length >= maxLength
</script>

<SubForm {path} {conditional}>
  {#each $arr as value,index}
    <SubForm path={String(index)}>
      <slot {path} {index} {value} {maxed} {maxLength} />
    </SubForm>
  {/each}
  <slot name="addbutton" {onClick} {addMoreText} {maxed} {maxLength}>
    <button type="button" class={addMoreClass} disabled={maxed} on:click={onClick}>{maxed ? maxedText : addMoreText}</button>
  </slot>
</SubForm>
