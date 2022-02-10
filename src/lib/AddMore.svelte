<script lang="ts">
  import { getContext } from 'svelte'
  import { isNotBlank } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
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

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const pathToArray = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  const arr = store.getField<any[]>(pathToArray)
  if (!$arr?.length) {
    if (startEmpty) store.setField(pathToArray, [])
    else store.push(pathToArray, initialState)
  }
  function onClick () {
    if (!maxed) store.push(pathToArray, initialState)
  }

  function remove (idx: number) {
    return () => store.deleteFromArray(pathToArray, idx)
  }

  $: maxed = $arr?.length >= maxLength
</script>

<SubForm {path} {conditional}>
  <slot name="above" path={pathToArray} value={$arr} {maxed} {maxLength} currentLength={$arr.length}/>
  {#each $arr as value,index}
    <SubForm path={String(index)} let:path>
      <slot {path} {index} {value} {maxed} {maxLength} currentLength={$arr.length} onDelete={remove(index)} />
    </SubForm>
  {/each}
  <slot name="addbutton" {onClick} {maxed} {maxLength} currentLength={$arr.length}>
    <button type="button" class={addMoreClass} disabled={maxed} on:click={onClick}>{maxed ? maxedText : addMoreText}</button>
  </slot>
  <slot name="below" path={pathToArray} value={$arr} {maxed} {maxLength} currentLength={$arr.length}/>
</SubForm>
