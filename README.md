# svelte-forms

This is meant to be a simple, generic library that helps you manage form state as a store.

## Overview
The idea of this library is to help form creators express a potentially complex JSON payload as a series of form fields. `SubForm` and `AddMore` components are provided to support nested objects and arrays.

This is meant for state management only. It does not have any tools for drawing inputs or other form elements. Nor does it display error messages. It merely supports all of those things by providing clean state management for all of it. It is best used as a building block when building a design library. Such a library can roll everything up to create an extremely simple `TextField` component, for instance, that provides all the HTML and CSS for the input, its label, its error messages (if any), and its validation state (valid/invalid/neutral). An example of this kind of library can be found at https://github.com/txstate-etc/dosgato-dialog

## Components

## Field
This is the basic building block. It represents the state of a single input field. It provides all the slot props you need to build an `<input>` inside it.
* Props
  * path - The path to this input's data in the JSON payload. If the Field is inside an `AddMore` or `SubForm` component, this path should be relative to the nearest one. For instance, the Field in `<SubForm path="nested"><Field path="name"></Field></SubForm>` maps to `payload.nested.name`.
  * defaultValue - If desired, you may set an initial value to be loaded into an empty form payload. Provide the data type expected in the payload; if you are using serialize/deserialize functions there may be a type mismatch between the input element's value attribute and the payload data.
  * serialize: Provide a function that accepts data of the type expected in the JSON payload and converts it to the type expected by your slot content. This will frequently be used to convert a Date or number in the payload into a string for an `<input>` element. This library provides some, see documentation below.
  * deserialize: The reverse of serialize. Accept data from your slot and convert it to what you need in the payload. This will frequently be used to convert the string from an `<input>` element into something like a Date or number. This only has an effect if you use the `onChange` slot prop. If you use `setVal` instead, you are expected to do the type conversion before calling `setVal`.
  * conditional: see "Conditional vs Remove from DOM" below
* Slots
  * path - The fully resolved path. In the example above, it would be `nested.name`. Recommended to pass this into input's name attribute so it's easy to track which inputs map where when inspecting the DOM.
  * value - The value to be passed into the input. If you skip this it will be an uncontrolled input and updates to the form's store will not be reflected back to the user.
  * messages - An array of validation messages from the server pertaining to this specific input. You should display them to the user as close to the input as possible so they can see where they messed up. The non-recommended alternative is to place all messaging at the top or bottom of the form.
  * valid - `true` when the form has been validated at least once, this field has been dirtied (see below), the value is truthy, and this field has no error messages. Use it to mark valid fields green.
  * invalid - `true` when the form has been validated at least once, this field has been dirtied (see below), and this field has error messages. Use it to mark invalid fields red. Note that if the form has never been validated or the user hasn't advanced this far down the form, `valid` and `invalid` can both be false (likely leaving the field with a neutral color).
  * setVal - Use this function to send data changes back to the form state. Send the type expected in the JSON payload.
  * onChange - A convenience function that can be passed transparently into an input's `on:change`. It depends on `this.value` or `e.detail` to contain the data. The deserialize function will be run on it to convert it to the type expected in the JSON payload. Recommended to also pass this to `on:keydown` for quicker feedback.
  * onBlur - Pass this to your input's `on:blur` so that moving focus out of it will dirty it and show error messages (like one that says it's required). Without this the user would have to change the field to dirty it.

### Conditional vs Remove from DOM
When a field disappears from the DOM, there could be two reasons:
1. The field is no longer an intended part of the form. Perhaps it is an obsolete field due to the way another field is filled out. In this case the data at its path should be deleted so that it doesn't accidentally appear in the final JSON payload.
2. The field is inside a tabbed or paged form and it's on a non-current tab or page. In this case the data at its path should NOT be deleted as it is only hidden, but still good data.

To help form creators distinguish these two cases from one another, there is a `conditional` prop on `Field`, `SubForm`, and `AddMore`. When you want to hide the form element because its data is irrelevant (e.g. if the user does not upload an image, I don't need to collect alt text), use this prop instead of using svelte `{#if}` blocks. It will remove the field from the DOM and also set the field value to undefined, effectively deleting it from the form data.

### Dirtying Fields

### Serialize/Deserialize functions

## Developing

This is a component library with no UI of its own, but there is a demo available:

```bash
npm run dev -- --open
```
