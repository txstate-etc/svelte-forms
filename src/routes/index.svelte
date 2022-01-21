<script lang="ts">
  import Form from '$lib/Form.svelte'
  import Field from '$lib/Field.svelte'
  import AddMore from '$lib/AddMore.svelte'
  import type { Feedback } from '$lib/FormStore'
  import { sleep } from 'txstate-utils'

  async function submit (data) {
    await sleep(3000)
    return {
      success: true,
      data,
      messages: []
    }
  }

  async function validate (data): Promise<Feedback[]> {
    await sleep(500)
    return [{
      type: 'error',
      message: 'Nope',
      path: 'multi.0.name'
    }]
  }
</script>

<h1>Svelte Forms</h1>

<Form {submit} {validate} let:saved let:submitting let:invalid>
  This is an example form.
  <Field path="test" let:path let:value let:onChange>
    <input type="text" name={path} value={value} on:change={onChange}>
  </Field>
  <fieldset>
    <AddMore path="multi" initialState={{ name: 'Barney' }}>
      <Field path="name" let:path let:value let:onChange let:onBlur let:messages let:invalid>
        <input type="text" name={path} {value} class:invalid on:change={onChange} on:keyup={onChange} on:blur={onBlur}><br>
        {#each messages as msg}
          <div style='background-color: pink'>{msg.message}</div>
        {/each}
      </Field>
    </AddMore>
  </fieldset>
  {#if saved}Save successful!{/if}
  <button disabled={submitting || invalid}>Submit</button>
</Form>
