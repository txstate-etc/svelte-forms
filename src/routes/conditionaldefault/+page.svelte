<script lang="ts">
  import { isNotBlank, sleep } from 'txstate-utils'
  import { Field, Form, nullableSerialize, nullableDeserialize, type Feedback } from '$lib'

  async function submit (data: any) {
    await sleep(500)
    const messages: Feedback[] = []
    if (data.age == null) {
      messages.push({ path: 'age', message: 'Age is required.', type: 'error' })
    } else if (data.age > 42) {
      messages.push({ path: 'age', message: 'Too old.', type: 'error' })
    }
    return {
      success: true,
      data,
      messages
    }
  }
  const preload = {
    first: 'John',
    last: 'Doe',
    age: 30
  }
  let lastautosave: Date | undefined
  let lastsave: Date | undefined
</script>

<h1>Svelte Forms</h1>

<Form {submit} autoSave {preload} on:autosaved={data => { console.info('on:autosaved', data); lastautosave = new Date() }} on:saved={data => { console.info('on:saved', data); lastsave = new Date() }} let:saved let:messages let:submitting let:invalid let:data let:hasUnsavedChanges>
  This is an example form.<br>
  <Field path="first" serialize={nullableSerialize} deserialize={nullableDeserialize} let:messages let:onBlur let:path let:value let:onChange>
    <input type="text" name={path} value={value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg}{msg.message}<br>{/each}
  </Field>
  <Field path="last" defaultValue='Connor' serialize={nullableSerialize} deserialize={nullableDeserialize} conditional={isNotBlank(data.first)} let:path let:value let:messages let:onBlur let:onChange>
    <input type="text" name={path} value={value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg}{msg.message}<br>{/each}
  </Field>
  <br>
  <Field path="age" defaultValue={0} number let:path let:value let:messages let:onBlur let:onChange conditional={isNotBlank(data.last)}>
    <input type="number" name={path} value={value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg}{msg.message}<br>{/each}
  </Field>
  <button disabled={submitting || invalid}>Submit</button>
  {#if lastautosave != null}
    <p>Last autosaved: {lastautosave.toLocaleTimeString()}</p>
  {/if}
  {#if lastsave != null}
    <p>Last saved: {lastsave.toLocaleTimeString()}</p>
  {/if}

  <pre>{JSON.stringify(data, null, 2)}</pre>
</Form>
