<script lang="ts">
  import { eq } from '@txstate-mws/svelte-components'
  import { onMount, setContext } from 'svelte'
  import { FormStore, FORM_CONTEXT } from '$lib/FormStore'
  import type { Feedback, SubmitResponse } from '$lib/FormStore'

  let className = ''
  export { className as class }
  export let submit: (state: any) => Promise<SubmitResponse<any>> = undefined
  export let validate: (state: any) => Promise<Feedback[]> = undefined
  export let success: () => void|Promise<void> = undefined
  export let autocomplete: string|undefined = undefined
  export let name: string|undefined = undefined
  export let store = new FormStore(submit, validate)
  export let preload: any = undefined
  setContext(FORM_CONTEXT, store)

  async function onSubmit () {
    const resp = await store.submit()
    if (resp.success) await success?.()
  }

  let form
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
