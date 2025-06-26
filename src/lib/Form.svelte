<script lang="ts" generics="T = Record<string, any>">
  import { eq } from '@txstate-mws/svelte-components'
  import { createEventDispatcher, onMount, setContext } from 'svelte'
  import type { HTMLFormAttributes } from 'svelte/elements'
  import { FormStore, FORM_CONTEXT } from '$lib/FormStore'
  import type { Feedback, FormStoreEvents, SubmitResponse } from '$lib/FormStore'

  type $$Events = FormStoreEvents<T>

  interface $$Props extends HTMLFormAttributes {
    submit?: (state: T) => Promise<SubmitResponse<T>>
    validate?: (state: T) => Promise<Feedback[]>
    autoSave?: boolean
    preload?: T
    store?: FormStore<T>
    formelement?: HTMLFormElement
  }

  interface $$Slots {
    default: {
      messages: Feedback[]
      allMessages: Feedback[]
      saved: boolean
      validating: boolean
      submitting: boolean
      valid: boolean
      invalid: boolean
      showingInlineErrors: boolean
      data: Partial<T>
      hasUnsavedChanges: boolean
    }
  }

  export let submit: $$Props['submit'] | undefined = undefined
  export let validate: $$Props['validate'] = undefined
  export let autoSave = false
  export let preload: T | undefined = undefined
  export let store = new FormStore<T>(submit!, validate)
  export let formelement: HTMLFormElement | undefined = undefined

  const dispatch = createEventDispatcher()
  function reactToSubmitAndValidate (..._: any[]) {
    if (submit) (store as any).submitFn = submit
    if (validate) (store as any).validateFn = validate
    if (dispatch) (store as any).dispatch = dispatch
    store.autoSave = autoSave
  }
  $: reactToSubmitAndValidate(submit, validate, autoSave, dispatch)

  let firstrun = true
  function reactToPreload (..._: any[]) {
    if (firstrun) {
      firstrun = false
      if (preload == null) return
    }
    if (!$store.hasUnsavedChanges) {
      store.preload(preload).catch(console.error)
    }
  }
  $: reactToPreload(preload)
  setContext(FORM_CONTEXT, store)

  onMount(() => {
    store.mount()
    const mutationobserver = new MutationObserver(() => { store.reorderFields(formelement!) })
    mutationobserver.observe(formelement!, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: false
    })
    return () => {
      store.unmount()
      mutationobserver.disconnect()
    }
  })
</script>

<form bind:this={formelement} {...$$restProps} on:submit|preventDefault={() => store.submit()} use:eq={{ store }}>
  <slot messages={$store.messages.global} allMessages={$store.messages.all} saved={$store.saved} validating={$store.validating} submitting={$store.submitting} valid={$store.valid} invalid={$store.invalid} showingInlineErrors={$store.showingInlineErrors} data={$store.data} hasUnsavedChanges={$store.hasUnsavedChanges} />
</form>
