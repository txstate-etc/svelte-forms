<script lang="ts">
  import { eq } from '@txstate-mws/svelte-components'
  import { createEventDispatcher, onMount, setContext } from 'svelte'
  import { FormStore, FORM_CONTEXT } from '$lib/FormStore'
  import type { Feedback, SubmitResponse } from '$lib/FormStore'

  type T = $$Generic<Record<string, any>>

  interface $$Events {
    saved: CustomEvent<T>
    validationfail: CustomEvent
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
    }
  }

  let className = ''
  export { className as class }
  export let submit: ((state: T) => Promise<SubmitResponse<T>>) | undefined = undefined
  export let validate: ((state: T) => Promise<Feedback[]>) | undefined = undefined
  export let autocomplete: string | undefined = undefined
  export let name: string | undefined = undefined
  export let store = new FormStore<T>(submit!, validate)
  export let preload: T | undefined = undefined
  if (preload != null) {
    store.initialized.clear()
    store.setData(preload, true).catch(console.error)
  }
  setContext(FORM_CONTEXT, store)

  const dispatch = createEventDispatcher()

  async function onSubmit () {
    const resp = await store.submit()
    if (resp.success) dispatch('saved', resp.data)
    else dispatch('validationfail')
  }

  let form: HTMLFormElement
  onMount(() => {
    store.mount()
    const mutationobserver = new MutationObserver(() => { store.reorderFields(form) })
    mutationobserver.observe(form, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: false
    })
    return () => { mutationobserver.disconnect() }
  })
</script>

<form bind:this={form} {name} class={className} on:submit|preventDefault={onSubmit} use:eq={{ store }} {autocomplete}>
  <slot messages={$store.messages.global} allMessages={$store.messages.all} saved={$store.saved} validating={$store.validating} submitting={$store.submitting} valid={$store.valid} invalid={$store.invalid} showingInlineErrors={$store.showingInlineErrors} data={$store.data} />
</form>
