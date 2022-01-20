<script lang="ts">
  import { getContext, setContext } from 'svelte'
  import { isNotNull } from 'txstate-utils'
  import { FORM_INHERITED_PATH } from './FormStore'

  export let path: string

  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const finalPath = [inheritedPath, path].filter(isNotNull).join('.')

  setContext(FORM_INHERITED_PATH, finalPath)
</script>

<slot />
