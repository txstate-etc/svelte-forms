<script lang="ts">
  import { sleep } from 'txstate-utils'
  import { AddMore, Field, Form, MessageType, SubForm, nullableSerialize, nullableDeserialize, dateDeserialize, dateSerialize, datetimeDeserialize, datetimeSerialize, numberDeserialize, numberNullableDeserialize, numberSerialize } from '$lib'

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

<Form {submit} {validate} let:saved let:submitting let:invalid let:data>
  This is an example form.<br>
  <Field path="test" defaultValue='Sara' serialize={nullableSerialize} deserialize={nullableDeserialize} let:path let:value let:onChange>
    <input type="text" name={path} value={value} on:change={onChange}>
  </Field>
  <fieldset>
    <AddMore path="multi" initialState={{ name: 'Barney' }} maxLength={3}>
      <Field path="name" let:path let:value let:onChange let:onBlur let:messages let:invalid>
        <input type="text" name={path} {value} class:invalid on:change={onChange} on:keyup={onChange} on:blur={onBlur}><br>
        {#each messages as msg}
          <div style='background-color: pink'>{msg.message}</div>
        {/each}
      </Field>
    </AddMore>
  </fieldset>
  <br>
  <Field path="mydate" let:path let:value let:onChange date>
    <label for="mydate">Date with no time: </label>
    <input id="mydate" type="date" name={path} {value} on:change={onChange} on:keyup={onChange}>
    <div>Should place a Date object into store, noon on the specified date in the browser's time zone.</div>
  </Field>
  <br>
  <Field path="mydatetime" let:path let:value let:onChange serialize={datetimeSerialize} deserialize={datetimeDeserialize}>
    <label for="mydatetime">Date with time: </label>
    <input id="mydatetime" type="datetime-local" name={path} {value} on:change={onChange} on:keyup={onChange}>
    <div>Should place a Date object into store, only when completely filled out.</div>
  </Field>
  <br>
  <Field path="number" let:path let:value let:onChange serialize={numberSerialize} deserialize={numberDeserialize}>
    <label for="number">Non-Nullable Number: </label>
    <input id="number" type="text" name={path} {value} on:change={onChange} on:keyup={onChange}>
    <div>Any invalid input should be converted to 0.</div>
  </Field>
  <br>
  <Field path="numbernull" let:path let:value let:onChange serialize={numberSerialize} deserialize={numberNullableDeserialize}>
    <label for="numbernull">Nullable Number: </label>
    <input id="numbernull" type="text" name={path} {value} on:change={onChange} on:keyup={onChange}>
    <div>When left empty this field in the store will be undefined.</div>
  </Field>
  <br>
  <Field path="conditional" conditional={data?.numbernull != null} defaultValue="default value" let:path let:value let:onChange serialize={nullableSerialize} deserialize={nullableDeserialize}>
    <label for="conditional">Conditional Field: </label>
    <input id="conditional" type="text" name={path} {value} on:change={onChange} on:keyup={onChange}>
    <div>When the above field is null, this field should be hidden but its state should be saved.</div>
  </Field>
  <SubForm path="multicond" conditional={data?.numbernull != null}>
    <fieldset>
      <AddMore path="" initialState={{ name: 'Barney' }} maxLength={3} minLength={2}>
        <Field path="name" let:path let:value let:onChange let:onBlur let:messages let:invalid>
          <input type="text" name={path} {value} class:invalid on:change={onChange} on:keyup={onChange} on:blur={onBlur}><br>
          {#each messages as msg}
            <div style='background-color: pink'>{msg.message}</div>
          {/each}
        </Field>
      </AddMore>
    </fieldset>
  </SubForm>
  <fieldset>
    <legend>Tasks:</legend>
    <AddMore path="tasks" initialState={ (index) => { return { task: `Eat ${index + 1} cookie${index > 1 ? 's' : ''}!` } } } minLength={3}>
      <Field path="task" let:path let:value let:onChange let:onBlur let:messages let:invalid>
        <input type="text" name={path} {value} class:invalid on:change={onChange} on:keyup={onChange} on:blur={onBlur}><br>
      </Field>
    </AddMore>
  </fieldset>
  {#if saved}Save successful!{/if}
  <br>
  <button disabled={submitting || invalid}>Submit</button>

  <pre>{JSON.stringify(data, null, 2)}</pre>
</Form>

<style>
  .invalid { border: 1px solid red; }
</style>
