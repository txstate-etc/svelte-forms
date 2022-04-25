<script lang="ts">
  import { getContext } from 'svelte'
  import { isNotBlank } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { FormStore } from './FormStore'
  import SubForm from './SubForm.svelte'

  type T = $$Generic
  interface $$Slots {
    above: {
      path: string
      value: T[]
      minned: boolean
      maxed: boolean
      minLength: number
      maxLength: number
      currentLength: number
    }
    default: {
      path: string
      index: number
      value: T
      minned: boolean
      maxed: boolean
      minLength: number
      maxLength: number
      currentLength: number
      onDelete: () => void
      onMoveUp: () => void
      onAdd: () => void
    }
    addbutton: {
      minned: boolean
      maxed: boolean
      minLength: number
      maxLength: number
      currentLength: number
      onClick: () => void
      onDelete: () => void
    }
    below: {
      path: string
      value: T[]
      minned: boolean
      maxed: boolean
      minLength: number
      maxLength: number
      currentLength: number
    }
  }

  export let path: string
  export let initialState: T = {} as T
  export let addMoreText: string = '+ Add'
  export let addMoreClass: string = ''
  export let minLength = 0
  export let maxedText = addMoreText
  export let maxLength = Infinity
  export let conditional: boolean|undefined = undefined

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const pathToArray = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  const arr = store.getField<T[]>(pathToArray)
  if (!$arr?.length) {
    store.setField(pathToArray, [])
    for (let i = 0; i < minLength; i++) store.push(pathToArray, initialState)
  }
  function onClick () {
    if (!maxed) store.push(pathToArray, initialState)
  }

  function remove (idx: number) {
    return () => { if (!minned) store.deleteFromArray(pathToArray, idx) }
  }

  function moveUp (idx: number) {
    return () => store.moveUp(pathToArray, idx)
  }

  $: maxed = $arr?.length >= maxLength
  $: minned = ($arr?.length ?? 0) <= minLength
  $: lastIdx = ($arr?.length ?? 0) - 1
</script>

<SubForm {path} {conditional}>
  <slot name="above" path={pathToArray} value={$arr} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length}/>
  {#each $arr as value,index}
    <SubForm path={String(index)} let:path>
      <slot {path} {index} {value} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length} onDelete={remove(index)} onMoveUp={moveUp(index)} onAdd={onClick} />
    </SubForm>
  {/each}
  <slot name="addbutton" {onClick} onDelete={remove(lastIdx)} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length}>
    <button type="button" class={addMoreClass} disabled={maxed} on:click={onClick}>{maxed ? maxedText : addMoreText}</button>
  </slot>
  <slot name="below" path={pathToArray} value={$arr} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length}/>
</SubForm>
