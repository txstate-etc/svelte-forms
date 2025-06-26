<script lang="ts">
  import { AddMore, Field, Form, type Feedback } from '$lib'

  interface FormState {
    more: { showtextinput?: boolean, textinput?: string }[]
  }

  async function validate (state: FormState) {
    const messages: Feedback[] = []
    if ((state.more?.length ?? 0) < 3) {
      messages.push({ message: 'You must have at least 3 items.', type: 'error', path: 'more' })
    }
    return messages
  }

  async function onSubmit (state: FormState) {
    const messages = await validate(state)
    return {
      success: messages.length === 0,
      messages,
      data: state
    }
  }

  const initialState: FormState['more'][0] = {}
</script>

<Form submit={onSubmit} {validate} let:data let:messages>
  This should always be 0: {messages.length}
  <br>
  <AddMore path="more" {initialState} let:value>
    {JSON.stringify(value, null, 2)}
    <Field path="showtextinput" let:onChange>
      <input type="checkbox" name="showtextinput" id="showtextinput" on:change={onChange}><label for="showtextinput">Show Text Field</label>
    </Field>
    <Field path="textinput" conditional={!!value.showtextinput} let:onChange>
      <input type="text" name="textinput" id="textinput" on:input={onChange}>
    </Field>
    <br>
    <svelte:fragment slot="below" let:messages>
      {#each messages as msg}
        <div style="background-color: pink">{msg.message}</div>
      {/each}
      <br>
    </svelte:fragment>
  </AddMore>
  {JSON.stringify(data, null, 2)}
  <br>
  <input type="submit" value="Submit">
</Form>
