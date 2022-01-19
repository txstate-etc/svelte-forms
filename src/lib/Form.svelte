<script lang="ts">
  import { onMount, setContext } from 'svelte'
  import { derivedStore } from '@txstate-mws/svelte-store'
  import { Feedback, FormStore, FORM_CONTEXT, SubmitResponse } from '$lib/FormStore'

  export let submit: (state: any) => Promise<SubmitResponse<any>> = undefined
  export let validate: (state: any) => Promise<Feedback[]> = undefined
  export let success: () => void|Promise<void> = undefined
  export let store = new FormStore(submit, validate)
  setContext(FORM_CONTEXT, store)
  const globalMessages = derivedStore(store, 'globalMessages')
  const saved = derivedStore(store, 'saved')

  async function onSubmit () {
    const resp = await store.submit()
    if (resp.success) await success?.()
  }

  let form
  onMount(() => {
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

<form bind:this={form} on:submit|preventDefault={onSubmit}>
  <slot messages={$globalMessages} saved={$saved} />
</form>
