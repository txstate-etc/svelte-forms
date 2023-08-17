<script lang="ts">
  import { getContext } from 'svelte'
  import { isNotBlank, isPracticallyEmpty } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { FormStore } from './FormStore'
  import SubForm from './SubForm.svelte'

  type T = $$Generic
  interface $$Slots {
    above: {
      path: string
      index: undefined
      value: T[]
      minned: boolean
      maxed: boolean
      minLength: number
      maxLength: number
      currentLength: number
      onClick: undefined
      onDelete: undefined
      onMoveDown: undefined
      onMoveUp: undefined
      onAdd: undefined
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
      onClick: undefined
      onDelete: () => void
      onMoveDown: () => void
      onMoveUp: () => void
      onAdd: () => void
    }
    addbutton: {
      path: undefined
      index: undefined
      value: undefined
      minned: boolean
      maxed: boolean
      minLength: number
      maxLength: number
      currentLength: number
      onClick: () => void
      onDelete: () => void
      onMoveDown: undefined
      onMoveUp: undefined
      onAdd: () => void
    }
    below: {
      path: string
      index: undefined
      value: T[]
      minned: boolean
      maxed: boolean
      minLength: number
      maxLength: number
      currentLength: number
      onClick: undefined
      onDelete: undefined
      onMoveDown: undefined
      onMoveUp: undefined
      onAdd: undefined
    }
  }

  export let path: string
  export let initialState: T | ((index: number) => T) | undefined = undefined
  export let addMoreText: string = '+ Add'
  export let addMoreClass: string = ''
  export let minLength = 0
  export let maxedText = addMoreText
  export let maxLength = Infinity
  export let conditional: boolean|undefined = undefined
  export let isEmpty = isPracticallyEmpty

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const pathToArray = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  store.registerArray(pathToArray, initialState, minLength, isEmpty)
  const arr = store.getField<T[]>(pathToArray)
  const reactToArr = (..._: any) => { if ($arr == null) store.setField(pathToArray, []) }
  $: reactToArr($arr)

  function onClick () {
    const state = (initialState instanceof Function) ? initialState($arr.length) : initialState
    if (!maxed) store.push(pathToArray, state)
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
  <slot name="above" path={pathToArray} value={$arr} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length} index={undefined} onClick={undefined} onAdd={undefined} onMoveUp={undefined} onMoveDown={undefined} onDelete={undefined} />
  {#each $arr as value,index}
    <SubForm path={String(index)} let:path>
      <slot {path} {index} {value} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length} onDelete={remove(index)} onMoveUp={moveUp(index)} onMoveDown={moveUp(index + 1)} onAdd={onClick} onClick={undefined} />
    </SubForm>
  {/each}
  <slot name="addbutton" {onClick} onAdd={onClick} onDelete={remove(lastIdx)} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length} index={undefined} path={undefined} value={undefined} onMoveUp={undefined} onMoveDown={undefined}>
    <button type="button" class={addMoreClass} disabled={maxed} on:click={onClick}>{maxed ? maxedText : addMoreText}</button>
  </slot>
  <slot name="below" path={pathToArray} value={$arr} {minned} {maxed} {minLength} {maxLength} currentLength={$arr.length} index={undefined} onClick={undefined} onAdd={undefined} onMoveUp={undefined} onMoveDown={undefined} onDelete={undefined} />
</SubForm>
