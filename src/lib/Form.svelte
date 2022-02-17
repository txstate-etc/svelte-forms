<script lang="ts">
  import { resize } from '@txstate-mws/svelte-components'
  import type { ElementSize } from '@txstate-mws/svelte-components'
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

  const breakpoints = [1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]
  let dataeq = ''
  function onResize (e: UIEvent & { currentTarget: EventTarget & HTMLFormElement, detail: ElementSize }) {
    const rounded = Math.floor(e.detail.clientWidth / 100) * 100
    dataeq = breakpoints.filter(b => b > rounded).map(b => b + 'px').join(' ')
    if ($store.width !== rounded) store.update(v => ({ ...v, width: rounded }))
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
    onResize({ detail: { clientWidth: form.clientWidth } } as any)
    return () => mutationobserver.disconnect()
  })
</script>

<form bind:this={form} {name} class={className} on:submit|preventDefault={onSubmit} use:resize on:resize={onResize} data-eq={dataeq} {autocomplete}>
  <slot messages={$store.messages.global} allMessages={$store.messages.all} saved={$store.saved} validating={$store.validating} submitting={$store.submitting} valid={$store.valid} invalid={$store.invalid} />
</form>
