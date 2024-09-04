<script lang="ts">
  import { AddMore, Field, Form } from '$lib'

  interface FormState {
    more: { showtextinput?: boolean, textinput?: string }[]
  }

  async function onSubmit (state: FormState) {
    return {
      success: true,
      messages: [],
      data: state
    }
  }

  const initialState: FormState['more'][0] = {}
</script>

<Form submit={onSubmit} let:data>
  <AddMore path="more" let:value>
    <Field path="showtextinput">
      <input type="checkbox" name="showtextinput" id="showtextinput"><label for="showtextinput">Show Text Field</label>
    </Field>
    <Field path="textinput" conditional={value.showtextinput}>
      <input type="text" name="textinput" id="textinput">
    </Field>
  </AddMore>
</Form>
