<script lang="ts">
  import { sleep } from 'txstate-utils'
  import { AddMore, Field, Form, MessageType, type Feedback } from '$lib'

  async function submit (data: any) {
    await sleep(3000)
    return {
      success: true,
      data,
      messages: []
    }
  }

  async function validate (data: any) {
    const feedback: Feedback[] = []
    const list = data.multi
    for (const item of list) {
      if (item.name.length < 1) {
        feedback.push({
          path: `multi.${list.indexOf(item)}.name`,
          type: MessageType.ERROR,
          message: 'Name is required'
        })
      }
      if (data.addmiddle && !item.middlename) {
        feedback.push({
          path: `multi.${list.indexOf(item)}.middlename`,
          type: MessageType.ERROR,
          message: 'Middle name is required'
        })
      }
    }
    return feedback
  }
</script>

<h1>A Form with a Conditional Field in an AddMore</h1>

<Form {submit} {validate} let:saved let:submitting let:invalid let:data let:hasUnsavedChanges>
  <p>The minLength in the AddMore is causing the problem.</p>
  <Field path="addmiddle" let:path let:value let:onChange let:onBlur>
    <label>
      <input type="checkbox" name={path} {value} on:change={onChange} on:blur={onBlur}>
      Add middle name
    </label><br>
  </Field>
  <br>
  <fieldset>
    <legend>Multiple People</legend>
    <AddMore path="multi" maxLength={3} minLength={1}>
      <Field path="name" let:path let:value let:onChange let:onBlur let:messages let:invalid>
        <label>
          Name *
          <input type="text" name={path} {value} class:invalid on:change={onChange} on:keyup={onChange} on:blur={onBlur}>
        </label><br>
        {#each messages as msg}
          <div style='background-color: pink'>{msg.message}</div>
        {/each}
      </Field>
      <Field path="middlename" let:path let:value let:onChange let:onBlur let:messages let:invalid conditional={!!data?.addmiddle}>
        <label>
          Middle name *
          <input type="text" name={path} {value} class:invalid on:change={onChange} on:keyup={onChange} on:blur={onBlur}>
        </label><br>
        {#each messages as msg}
          <div style='background-color: pink'>{msg.message}</div>
        {/each}
      </Field>
    </AddMore>
  </fieldset>
  <br>
  {#if saved}Save successful!{/if}
  <br>
  <button disabled={submitting || invalid || !hasUnsavedChanges}>Submit</button>

  <pre>{JSON.stringify(data, null, 2)}</pre>
</Form>

<style>
  fieldset {
    width: 50%;
  }
  .invalid { border: 1px solid red; }
</style>
