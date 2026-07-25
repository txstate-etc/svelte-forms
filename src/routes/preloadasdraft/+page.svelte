<script lang="ts">
  import { isNotBlank, sleep } from 'txstate-utils'
  import { Field, Form, MessageType, nullableSerialize, nullableDeserialize, type Feedback } from '$lib'

  async function validate (data: any) {
    await sleep(300)
    const messages: Feedback[] = []
    if (!isNotBlank(data.first)) messages.push({ path: 'first', message: 'First name is required.', type: MessageType.ERROR })
    if (!isNotBlank(data.last)) messages.push({ path: 'last', message: 'Last name is required.', type: MessageType.ERROR })
    if (!isNotBlank(data.email)) messages.push({ path: 'email', message: 'Email is required.', type: MessageType.ERROR })
    if (!isNotBlank(data.phone)) messages.push({ path: 'phone', message: 'Phone is required.', type: MessageType.ERROR })
    if (!isNotBlank(data.address)) messages.push({ path: 'address', message: 'Address is required.', type: MessageType.ERROR })
    if (!isNotBlank(data.city)) messages.push({ path: 'city', message: 'City is required.', type: MessageType.ERROR })
    // A required checkbox whose default value is boolean `false`. This exercises the
    // setDirtyForm boolean-false case: an untouched checkbox must NOT show this error on
    // first load just because its value is `false`.
    if (data.agree !== true) messages.push({ path: 'agree', message: 'You must agree.', type: MessageType.ERROR })
    return messages
  }

  async function submit (data: any) {
    await sleep(500)
    return { success: true, data, messages: await validate(data) }
  }

  // Simulates partial information gathered from a third-party system: only the
  // email field (halfway down the form) is preloaded. The user is expected to
  // continue filling out the rest.
  const preload = {
    email: 'jane.doe@example.com'
  }
</script>

<h1>preloadAsDraft</h1>
<p>
  Only <code>email</code> (halfway down the form) is preloaded. Because
  <code>preloadAsDraft</code> is set, required-field errors should only appear
  for fields at or above <code>email</code> &mdash; fields below it should stay
  quiet until the user blurs them.
</p>

<Form {submit} {validate} preloadAsDraft {preload} let:saved let:submitting let:invalid let:data let:hasUnsavedChanges>
  <Field path="first" serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:messages let:onBlur let:onChange>
    <label for={path}>First name: </label>
    <input id={path} type="text" name={path} {value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg (msg.path, msg.type, msg.message)}<div style="color: red">{msg.message}</div>{/each}
  </Field>
  <br>
  <Field path="last" serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:messages let:onBlur let:onChange>
    <label for={path}>Last name: </label>
    <input id={path} type="text" name={path} {value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg (msg.path, msg.type, msg.message)}<div style="color: red">{msg.message}</div>{/each}
  </Field>
  <br>
  <Field path="email" serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:messages let:onBlur let:onChange>
    <label for={path}>Email (preloaded): </label>
    <input id={path} type="text" name={path} {value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg (msg.path, msg.type, msg.message)}<div style="color: red">{msg.message}</div>{/each}
  </Field>
  <br>
  <Field path="phone" serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:messages let:onBlur let:onChange>
    <label for={path}>Phone: </label>
    <input id={path} type="text" name={path} {value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg (msg.path, msg.type, msg.message)}<div style="color: red">{msg.message}</div>{/each}
  </Field>
  <br>
  <Field path="address" serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:messages let:onBlur let:onChange>
    <label for={path}>Address: </label>
    <input id={path} type="text" name={path} {value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg (msg.path, msg.type, msg.message)}<div style="color: red">{msg.message}</div>{/each}
  </Field>
  <br>
  <Field path="city" serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:messages let:onBlur let:onChange>
    <label for={path}>City: </label>
    <input id={path} type="text" name={path} {value} on:input={onChange} on:blur={onBlur}>
    {#each messages as msg (msg.path, msg.type, msg.message)}<div style="color: red">{msg.message}</div>{/each}
  </Field>
  <br>
  <Field path="agree" defaultValue={false} let:path let:value let:messages let:onBlur let:setVal>
    <label for={path}>
      <input id={path} type="checkbox" name={path} checked={value} on:change={e => { setVal(e.currentTarget.checked) }} on:blur={onBlur}>
      I agree (required) &mdash; not preloaded, defaults to false. Must stay quiet until touched.
    </label>
    {#each messages as msg (msg.path, msg.type, msg.message)}<div style="color: red">{msg.message}</div>{/each}
  </Field>
  <br>
  <button disabled={submitting || invalid || !hasUnsavedChanges}>Submit</button>
  {#if saved}Save successful!{/if}

  <pre>{JSON.stringify(data, null, 2)}</pre>
</Form>
