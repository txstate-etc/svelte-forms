<script lang="ts">
  import { isNotBlank, sleep } from 'txstate-utils'
  import { Field, Form, MessageType, nullableSerialize, nullableDeserialize } from '$lib'

  async function submit (data: any) {
    await sleep(3000)
    return {
      success: true,
      data,
      messages: []
    }
  }

  async function validate (data: any) {
    await sleep(500)
    return [{
      type: MessageType.ERROR,
      message: 'Nope',
      path: 'multi.0.name'
    }]
  }
</script>

<h1>Svelte Forms</h1>

<Form {submit} {validate} let:saved let:submitting let:invalid let:data let:hasUnsavedChanges preload={{}}>
  This is an example form.<br>
  <Field path="first" serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:onChange>
    <input type="text" name={path} value={value} on:change={onChange}>
  </Field>
  <Field path="last" defaultValue='Connor' serialize={nullableSerialize} deserialize={nullableDeserialize} conditional={isNotBlank(data.first)} let:path let:value let:onChange>
    <input type="text" name={path} value={value} on:change={onChange}>
  </Field>
  <br>
  <button disabled={submitting || invalid || !hasUnsavedChanges}>Submit</button>

  <pre>{JSON.stringify(data, null, 2)}</pre>
</Form>
