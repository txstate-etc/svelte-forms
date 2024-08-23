<script lang="ts">
  import { Field, Form, FormStore } from '$lib'
  let shown = false
  let store: FormStore
</script>
<button type="button" on:click={() => { shown = !shown }}>Toggle Form</button>
{#if shown}
  <Form bind:store>
    <Field path="test" defaultValue="bear" let:value>
      <select name="test">
        <option value="" selected={!value}>Select</option>
        <option value="bear" selected={value === 'bear'}>Bear</option>
        <option value="lion" selected={value === 'lion'}>Lion</option>
      </select>
    </Field>
  </Form>
{/if}
{JSON.stringify($store?.data)}
