<script lang="ts">
  import { setContext } from 'svelte'
  import { FORM_INHERITED_PATH } from './FormStore'

  export let path: string
  setContext(FORM_INHERITED_PATH, path)
</script>

<slot />
