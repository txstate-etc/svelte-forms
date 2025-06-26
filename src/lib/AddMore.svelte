<script lang="ts" generics="T = any">
  import { getContext, onMount } from 'svelte'
  import { isNotBlank, isPracticallyEmpty } from 'txstate-utils'
  import { FORM_CONTEXT, FORM_INHERITED_PATH } from './FormStore'
  import type { Feedback, FormStore } from './FormStore'
  import SubForm from './SubForm.svelte'

  interface $$Slots {
    above: {
      path: string
      index: undefined
      value: T[]
      messages: Feedback[]
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
      messages: Feedback[]
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
      messages: Feedback[]
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
      messages: Feedback[]
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
  export let startingLength = minLength
  export let maxedText = addMoreText
  export let maxLength = Infinity
  export let conditional: boolean | undefined = undefined
  export let isEmpty = isPracticallyEmpty
  /** Bind this prop to get the list of validation messages. Also available as a slot prop. */
  export let messages: Feedback[] = []

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const pathToArray = [inheritedPath, path].filter(isNotBlank).join('.')

  const store = getContext<FormStore>(FORM_CONTEXT)
  const arr = store.getField<T[]>(pathToArray)
  let registered = false
  const reactToArr = (..._: any) => {
    if (registered) store.enforceArrayMin(pathToArray, minLength, initialState)
  }
  $: reactToArr($arr)
  const feedback = store.getFeedback(pathToArray)
  $: messages = $feedback ?? []

  function onClick () {
    const state = (initialState instanceof Function) ? initialState($arr.length) : initialState
    if (!maxed) store.push(pathToArray, state)
  }

  function remove (idx: number) {
    return () => { if (!minned) store.deleteFromArray(pathToArray, idx) }
  }

  function moveUp (idx: number) {
    return () => { store.moveUp(pathToArray, idx) }
  }

  onMount(() => {
    store.registerArray(pathToArray, initialState, minLength, startingLength, isEmpty)
    registered = true
    return () => store.unregisterArray(pathToArray)
  })

  $: maxed = $arr?.length >= maxLength
  $: minned = ($arr?.length ?? 0) <= minLength
  $: lastIdx = ($arr?.length ?? 0) - 1
</script>

<SubForm {path} {conditional}>
  <slot name="above" path={pathToArray} value={$arr ?? []} {messages} {minned} {maxed} {minLength} {maxLength} currentLength={$arr?.length ?? 0} index={undefined} onClick={undefined} onAdd={undefined} onMoveUp={undefined} onMoveDown={undefined} onDelete={undefined} />
  {#each ($arr ?? []) as value,index}
    <SubForm path={String(index)} let:path>
      <slot {path} {index} {value} {messages} {minned} {maxed} {minLength} {maxLength} currentLength={$arr?.length ?? 0} onDelete={remove(index)} onMoveUp={moveUp(index)} onMoveDown={moveUp(index + 1)} onAdd={onClick} onClick={undefined} />
    </SubForm>
  {/each}
  <slot name="addbutton" {onClick} onAdd={onClick} onDelete={remove(lastIdx)} {messages} {minned} {maxed} {minLength} {maxLength} currentLength={$arr?.length ?? 0} index={undefined} path={undefined} value={undefined} onMoveUp={undefined} onMoveDown={undefined}>
    {#if !maxed || isNotBlank(maxedText)}
      <button type="button" class={addMoreClass} disabled={maxed} on:click={onClick}>{maxed ? maxedText : addMoreText}</button>
    {/if}
  </slot>
  <slot name="below" path={pathToArray} value={$arr ?? []} {messages} {minned} {maxed} {minLength} {maxLength} currentLength={$arr?.length ?? 0} index={undefined} onClick={undefined} onAdd={undefined} onMoveUp={undefined} onMoveDown={undefined} onDelete={undefined} />
</SubForm>
{@html '<!-- svelte-forms-array(' + pathToArray + ') -->'}
