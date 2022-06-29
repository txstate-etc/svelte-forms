<script lang="ts">
  import { eq } from '@txstate-mws/svelte-components'
  import { createEventDispatcher, onMount, setContext } from 'svelte'
  import { FormStore, FORM_CONTEXT } from '$lib/FormStore'
  import type { Feedback, SubmitResponse } from '$lib/FormStore'

  type T = $$Generic

  interface $$Events {
    saved: CustomEvent<T>
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
    }
  }

  let className = ''
  export { className as class }
  export let submit: (state: T) => Promise<SubmitResponse<T>> = undefined
  export let validate: (state: T) => Promise<Feedback[]> = undefined
  export let autocomplete: string|undefined = undefined
  export let name: string|undefined = undefined
  export let store = new FormStore<T>(submit, validate)
  export let preload: T = undefined
  setContext(FORM_CONTEXT, store)

  const dispatch = createEventDispatcher()

  async function onSubmit () {
    const resp = await store.submit()
    if (resp.success) dispatch('saved', resp.data)
  }

  let form: HTMLFormElement
  onMount(() => {
    if (preload != null) store.setData(preload)
    const mutationobserver = new MutationObserver(() => store.reorderFields(form))
    mutationobserver.observe(form, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: false
    })
    return () => mutationobserver.disconnect()
  })
</script>

<form bind:this={form} {name} class={className} on:submit|preventDefault={onSubmit} use:eq={{ store }} {autocomplete}>
  <slot messages={$store.messages.global} allMessages={$store.messages.all} saved={$store.saved} validating={$store.validating} submitting={$store.submitting} valid={$store.valid} invalid={$store.invalid} />
</form>
