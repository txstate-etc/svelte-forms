# Overview
The idea of this library is to help form creators express a potentially complex JSON payload as a series of form fields. `SubForm` and `AddMore` components are provided to support nested objects and arrays.

This is meant for state management only. It does not have any tools for drawing inputs or other form elements. Nor does it display error messages. It merely supports all of those things by providing clean state management for all of it. It is best used as a building block when building a design library. Such a library can roll everything up to create an extremely simple `FieldText` component, for instance, that provides all the HTML and CSS for the input, its label, its error messages (if any), and its validation state (valid/invalid/neutral). An example of this kind of library can be found at https://github.com/txstate-etc/dosgato-dialog

# 2.0 breaking changes
* Calling `FormStore.submit()` will now fire the `saved`, `autosaved`, and `validationfail` events. Previously, these events were fired by the `<form on:submit>` handler. This caused issues for downstream libraries that tried to trigger form submission outside the standard mechanisms of `<input type="submit">` or `<button type="submit">`. Some downstream libraries were firing their own `saved` events after calling `FormStore.submit()`. That behavior may need to be eliminated or adjusted to avoid the event being fired twice.
* `FormStore.setField()` now dirties the field by default. This makes it equivalent to the `setVal` slot prop, so components that wrapped `Field` can use it now instead of trying to extract `setVal` from the slot.
* Downstream libraries will need to forward the new `on:autosaved` event in addition to the new `autoSave` prop on the `Form` component.
* The `AddMore` component now receives messages based on its path (e.g. "You have exceeded the maximum array size.") and provides them both as a slot prop and as a bindable prop for wrappers. The applicable messages are removed from the `Form`'s messages (in `FormStore.value.messages.all`). Wrappers that were solving this problem another way should update, those that weren't should start showing the messages.

## 2.0 notable changes
* `finalSerialize` and `finalDeserialize` are now bindable props on `Field`, so that you don't have to try to extract them from the slot props when you wrap `Field`.
* The `submit` function on a `Form` now may return a `SubmitResponse` without the `data` property. You were able to return `data` in case you needed to manipulate the data after a successful submission, but it was rarely used, so you were expected to return the `data` that you had received as a parameter. Now you can just leave it out and svelte-forms will use the same data that was passed in.

# Components

## Form
Use this component to start a new form. Each form has a goal of constructing a particular JSON object to submit to the API server. You provide your own validation and submission functions, which are required to return a very specific format. It's designed/recommended to work with GraphQL mutations, but it's generic enough to support anything. Typescript types are provided to help you return correctly formatted information.
### Props
* `submit` - Your function that will be run when the user submits. It should contact the server and return a promise with a SubmitResponse in it (see below)
* `validate` - Your function that will be run when the user changes any form data. It is recommended that it contact the server but it can also be locally implemented. Should return an array of messages (see below for format).
* `success` - (optional) Your function that will be run when the form submission returns success. You can also handle submission success in your submit function but this may be cleaner.
* `class` - (optional) CSS class to add to the form element (this component does create the actual DOM element, unlike the rest)
* `autocomplete` - (optional) Value to pass to the form element's `autocomplete` attribute
* `name` - (optional) Value to pass to the form element's `name` attribute
* `store` - (optional, bindable) The `FormStore` object that manages all the state. You may pass in your own subclass of `FormStore` (or maybe just to retain state when the `Form` component unmounts/remounts). You can also bind this prop to receive the instance that is automatically created for you. Once you have the store instance, you can call its many mutation functions like `store.setData(newPayload)`.
* `preload` - (optional) If the user is editing an existing object, use this prop to pass in the existing object. Properties not present in the form will be left alone while the user is editing. Only works once, when the form mounts in the browser. Alternatively, you can bind the store and call `setData` at any time. Validation will immediately kick off after the preload or any `setData` call.
*  `autoSave` - (optional) Shift the form into autosave mode. The `validate` function will be ignored. Instead, every change to the form will call the `submit` function. Successful auto-saves will fire the `on:autosaved` event __instead of__ `on:saved`. Regular submissions via submit button or calling `FormStore.submit()` are still possible. Those will fire `on:saved`. This allows you to differentiate between successful autosaves and successful saves that resulted from the user intentiionally submitting - now you can automatically close a modal or something like that.
### Events
* `on:saved` - Fires after the user submits the form and the submission is successful.
* `on:autosaved` - Fires after a successful save that was automatically triggered instead of requested by the user. Only happens in `autoSave` mode.
* `on:validationfail` - A little bit of a misnomer, this event only fires after an unsuccessful user-requested submission. It does not fire after an unsuccessful background-validation. You can safely use it to do something mildly disruptive like throw up a "do better" toast or focus the first invalid field, etc.
### Default Slot Props
* `data` - The current data being managed by the form. This will update as the user interacts with the form, so it provides an easy way to do conditional logic or show informational messages.
* `messages` - Array of global messages to show the user at the bottom of the form. Messages that had a `path` are NOT included in this list. If you fail to show these to the user they will be lost.
* `allMessages` - Array of all the messages returned by the last validation/submission. You would only need this if you have decided to show all validation errors in one place instead of inline with the failed inputs.
* `saved` - `true` if the JSON payload has not changed since the last successful submission
* `validating` - `true` if the JSON payload is currently being validated
* `submitting` - `true` if the form is currently being submitted; use to disable the submit button or show a loading indicator. Note that simultaneous submissions are disallowed no matter what you show to the user. Submission attempts while a submission is in flight are ignored.
* `valid` - `true` if the last validation/submission did not return any `error` or `system` messages
* `invalid` - `true` if the last validation/submission returned at least one `error` or `system` message
* `showingInlineErrors` - `true` if there are any fields with visible errors (not warning or success messages). Use this to show a final message at the bottom of the form, near the submit button, informing the user that the form is invalid. Preferably also use aria-live="polite" on this message. If you do not do this and your form is longer than the user's screen, it's possible a field above their current view will be marked invalid and they will be confused why the submit button does not work. Further, without doing this and giving it the aria-live attribute, screen reader users may not have any feedback that their form submission is invalid. You may set aria-live on individual inline messages, but that can get noisy.

## Field
This is the basic building block that represents the state of a single input field. It provides all the slot props you need to build an `<input>` inside it.
### Props
* `path` - The path to this input's data in the JSON payload. If the Field is inside an `AddMore`, `SubForm`, or `SubArray` component, this path should be relative to the nearest one. For instance, the Field in `<SubForm path="nested"><Field path="name"></Field></SubForm>` maps to `payload.nested.name`.
* `defaultValue` - (optional) If desired, you may set an initial value to be loaded into an empty form payload. Provide the data type expected in the payload; if you are using serialize/deserialize functions there may be a type mismatch between the input element's value attribute and the payload data. Note that setting a `preload` will override any default values, even if the preload has an undefined or null value. This is because `preload` assumes that the user is editing a form that had previously been validly filled out in its entirety.
* `serialize` - (optional) Provide a function that accepts data of the type expected in the JSON payload and converts it to the type expected by your slot content. This will frequently be used to convert a Date or number in the payload into a string for an `<input>` element. This library provides some, see documentation below.
* `deserialize` - (optional) The reverse of serialize. Accept data from your slot and convert it to what you need in the payload. This will frequently be used to convert the string from an `<input>` element into something like a Date or number. This only has an effect if you use the `onChange` slot prop. If you use `setVal` instead, you are expected to do the type conversion before calling `setVal`.
* `number`, `notNull`, `date`, `datetime`, `json` - These are all convenience booleans that set `serialize` and `deserialize` to reasonable defaults for your situation. They have no effect if you set `serialize` and `deserialize`. Use one of `number`, `date`, `datetime`, or `json` (using none of these implies you're working with `string`). `json` means that your value should be treated as an object (or array). If you're working with number or string, you can set the `notNull` prop and null/undefined will be serialized to `0` and `''` respectively. `notNull` is ignored for `date` and `datetime`, which are always treated as nullable since there is no obvious empty/zero value for an unset date. `notNull` is also ignored for `json`.
* `conditional` - (optional) see "Conditional vs Remove from DOM" below
### Default Slot Props
* `path` - The full absolute path to this field in the JSON payload. In the example above (for the `path` prop), it would be `nested.name`. It is recommended to pass this into the input's name attribute so it's easy to track which inputs map where when inspecting the DOM.
* `value` - The value to be passed into the input. If you skip this it will be an uncontrolled input and updates to the form's store will not be reflected back to the user, including if you set a `preload`.
* `messages` - An array of validation messages from the server pertaining to this specific input. You should display them to the user as close to the input as possible so they can see where they messed up. The non-recommended alternative is to place all messaging at the top or bottom of the form.
* `valid` - `true` when you would want to show the user that a field passed validation (e.g. by giving it a green border).
* `invalid` - `true` when you would want to show the user that a field failed validation (e.g. by giving it a red border). Note that if the form has never been validated or the user hasn't advanced this far down the form, `valid` and `invalid` can both be false (likely leaving the field with a neutral color).
* `setVal` - Use this function to send data changes back to the form state. Send the type expected in the JSON payload.
  * If you need to know the current state to make your change, you can give `setVal` a function that receives the current value as its first argument. Do NOT mutate the input. For example: `setVal(arr => [...arr, 'new value'])` will push `new value` onto the existing array.
* `onChange` - A convenient alternative to `setVal` that can be passed directly into an input's `on:change`. It depends on `this.value` or `e.detail` to contain the updated data. The deserialize function will be run on it to convert it to the type expected in the JSON payload. Recommended to also pass this to `on:keydown` for quicker feedback. If you have a complicated field to build, you may not have a suitable `input` element for `onChange` and you should call `setVal` instead.
* `onBlur` - Pass this to your input's `on:blur` so that moving focus out of it will dirty it and show error messages (like one that says it's required). Without this the user would have to change the field (or a field below it) to dirty it.

## SubForm
Use this component to start a new sub-object in your JSON payload. Any `Field` components inside it will have their path prepended with its path. For instance:
```svelte
<Form name="profile">
  <Field path="fullname"> ... </Field>
  <SubForm path="address">
    <Field path="city"> ... </Field>
    <Field path="state"> ... </Field>
    <Field path="zip"> ... </Field>
  </SubForm>
</Form>
```
would create a payload with the following interface
```typescript
interface Profile {
  fullname: string
  address: {
    city: string
    state: string
    zip: string
  }
}
```
### Props
* `path` - The path to the array in the payload JSON. If inside another `SubForm`, `SubArray`, or `AddMore`, this path must be relative to that.
* `conditional` - (optional) see "Conditional vs Remove from DOM" below
### Default Slot Props
* `path` - The full absolute path to this object in the payload, including the path of any `SubForm`, `SubArray`, or `AddMore` parents it might have.
* `value` - The part of the JSON payload that pertains to this. This will NOT have any serialization applied so be careful not to feed it directly to an input element. It's unlikely you will need this often.

## AddMore
Use this component to add an array to your payload. Its default slot will be repeated for each iteration of the array. For example:
```svelte
<Form name="profile">
  <Field path="fullname"> ... </Field>
  <AddMore path="addresses">
    <Field path="city"> ... </Field>
    <Field path="state"> ... </Field>
    <Field path="zip"> ... </Field>
  </SubForm>
</Form>
```
would create a payload with the following interface
```typescript
interface Profile {
  fullname: string
  addresses: {
    city: string
    state: string
    zip: string
  }[]
}
```
### Props
* `path` - The path to the array in the payload JSON. If inside another `AddMore`, `SubForm`, or `SubArray`, this path must be relative to that.
* `initialState` - (optional) The initial state of each new element in the array. Each time a new array element is added, it will be initialized with this JSON. You may also provide a function that accepts the index and outputs the desired array item.
* `minLength` - (default = 0) Enforce a minimum array length. The form will start with at least this many array items, regardless of whether the form is preloaded. The `onDelete` slot prop will do nothing when the array is less than or equal to this length. Additionally, any change inside the array will re-enforce the minimum and potentially add new array items, initialized using `initialState`.
* `startingLength` - (default = minLength) If you just want empty forms to start out with some initial array items, you may set this greater than minLength. There is no enforcement of this length. Preloaded forms will ignore the startingLength, to avoid auto-mutating when editing data that has already been created.
* `addMoreText` (optional) The text for the "Add More" button, if you'd like to customize it. Ignored if you overwrite the "addbutton" slot.
* `addMoreClass` (optional) A CSS class for the "Add More" button, if you'd like to customize it. Alternatively, you can overwrite the "addbutton" slot and write all the HTML yourself.
* `maxedText` (optional) Text to use for the "Add More" button after the array length maximum has been reached, if you'd like it to say something different. If you set this to the empty string, the default add more button will disappear when the array is maxed out. Ignored if you overwrite the "addbutton" slot.
* `maxLength` (optional) Set this to limit the array length the user is able to create. The "Add More" button will be disabled when this limit is reached. The `onClick` slot prop also enforces this limit, but the `FormStore` will NOT enforce this limit if you use `formStore.push` elsewhere in your code. If this limit is important, you should also enforce it server-side.
* `conditional` - (optional) see "Conditional vs Remove from DOM" below.
### Default Slot Props
* `path` - The full absolute path to the object in the payload. This is the path for each of the array elements, so it will end in a number.
* `value` - The part of the JSON payload that pertains to this array item. This will NOT have any serialization applied so be careful not to feed it directly to an input element. The input element should be wrapped in a `Field` providing it with a serialized value. It's unlikely you will need this often.
* `index` - The index of the current array element being rendered.
* `minned` - `true` if the current array length is equal to the minLength.
* `maxed` - `true` if the current array length is greater than or equal to the maxLength.
* `minLength` - Repeated from the prop
* `maxLength` - Repeated from the prop; presumably you already know this, but it might be cleaner to have it repeated here if you are trying to show the user something about how much they have left.
* `currentLength` - In case you are reporting to the user how much they have left.
* `onDelete` - A function to delete the current element. If you are making a button to remove array elements, you can pass this to its `on:click`. It will not work if it would violate `minLength`
* `onMoveUp` - A function to move the current element earlier in the array. If you are making a button to move array elements, you can pass this to its `on:click`.
* `onMoveDown` - A function to move the current element later in the array. If you are making a button to move array elements, you can pass this to its `on:click`.
* `onAdd` - (rarely needed) A function to add a new element to the array. Normally you'd do this in the `addbutton` slot, but if you want to trigger it automatically based on something that happens inside one of the subforms, you can use this.
### "addbutton" Slot Props
This component presents another slot where you can customize the button that adds a new element to the array.
* `onClick` - A function to push a new element on the end of the array. Pass it to the "Add More" button's `on:click`.
* `onDelete` - Pops the last item off the end of the array.
* `minned` - Same as for the default slot.
* `maxed` - Same as for the default slot.
* `minLength` - Same as for the default slot.
* `maxLength` - Same as for the default slot.
* `currentLength` - Same as for the default slot.
### "above" and "below" Slot Props
These slots are provided so you can add content above and below the array. The "below" slot will appear below the "addbutton" slot.
* `path` - The full absolute path to the array in the payload.
* `value` - The full array data from the payload.
* `minned` - Same as for the default slot.
* `maxed` - Same as for the default slot.
* `minLength` - Same as for the default slot.
* `maxLength` - Same as for the default slot.
* `currentLength` - Same as for the default slot.

## SubArray
Rarely, when you have a simple array of predetermined length, and you don't want users to be able to add and remove elements from the array, you can use the SubArray component. For example:
```svelte
<Form name="profile">
  <Field path="fullname"> ... </Field>
  <SubArray path="aliases">
    Provide two aliases.
    <Field path="0"><label>First Alias</label> ... </Field>
    <Field path="1"><label>Second Alias</label> ... </Field>
  </SubForm>
</Form>
```
would create a payload with the following interface
```typescript
interface Profile {
  fullname: string
  aliases: [string, string]
}
```
If you are constructing something more complicated and you don't want to prefix everything with '0' or '1', etc, consider using an `AddMore` with the min and max length both set to the size you want, and `maxedText=""` so the add more button disappears.
### Props
* `path` - The path to the array in the payload JSON. If inside another `SubArray`, `SubForm`, or `AddMore`, this path must be relative to that.
* `conditional` - (optional) see "Conditional vs Remove from DOM" below

# Other Notes
## How to write submit/validate functions
Your `submit` and `validate` functions have the following requirements:
* `submit` should do its own validations and return a `SubmitResponse`, i.e. `{ success: true, messages: [...] }`
  * Optionally, you may return a `data` property as well. This property will be fed back into the form state. It's useful for situations where you expect your API to make automatic corrections, like for spelling or capitalization, and you want those corrections to be immediately reflected in the form.
* `validate` should return `Feedback[]`. This is the same as `SubmitResponse['messages']`. The `Feedback` messages will be split by path and fed to the appropriate `Field` components in your form so they can each display their own inline.
* Neither `submit` nor `validate` should trigger client-side side effects, like dismissing the modal the `Form` lives inside, triggering a page reload, using sveltekit's `invalidate()` functionality, or trying to manipulate the `FormStore` state. There is still state management to be done before any of those things should happen. Instead, place side effects in the `on:saved` or `on:autosaved` events.
### Server-side vs client-side validation
This library doesn't enforce any particular validation strategy, it just asks you for a `validate` function. It expects `validate` to return a Promise, allowing you to ask your API/database about certain things like whether a username is already taken and therefore invalid.

However, it is highly recommended that you move all or most of your validation to the API. This protects you from situations where the API is not enforcing a validation but all your testers think everything is fine because the client-side is enforcing. This leaves your API vulnerable to bugs and attacks.

The best pattern is to have your API respond with an array of `Feedback` messages exactly as this library expects. This way your `submit` and `validate` functions can be very simple passthroughs to your API. If you use some of the other @txstate-mws libraries like @txstate-mws/graphql-server, you will see this pattern in action.

The only drawback to this style is it will hit your API with a request after each user interaction. This library mitigates the impact somewhat by debouncing its validation queries, but if you have performance issues when validating an operation, you may need to deal with it with some sort of caching, client-side logic to avoid unnecessary requests, or by checking simple validations in `validate` and complex validations in `submit`.

## Serialize/Deserialize functions
This library provides a bunch of serialize/deserialize functions to help you work with numbers, dates, etc, and control how your payload handles `undefined` vs `''` empty string. Pass these functions into the `Field` component's `serialize` and `deserialize` props, or write your own custom conversions.
* `dateSerialize` - Use with input type="date"
* `dateDeserialize` - Use with input type="date". You will get a `Date` set to noon on the day the user picked, in the user's local time zone.
* `datetimeSerialize` - Use with input type="datetime-local"
* `datetimeDeserialize` - Use with input type="datetime-local". You will get a `Date` in the user's local time zone. Write your own if you were instructing the user to give you a datetime in some other time zone (like the one the server lives in).
* `nullableSerialize` - Use with input type="text" and the JSON payload will get `undefined` instead of `''` when the user leaves the input blank.
* `nullableDeserialize` - Use with input type="text" and the JSON payload will get `undefined` instead of `''` when the user leaves the input blank.
* `numberSerialize` - Use with input type="number" or type="text". The input will be coerced into a number and you will get a Number object in the JSON payload.
* `numberDeserialize` - Use with input type="number" or type="text". The input will be coerced into a number and you will get a Number object in the JSON payload. The field will never be blank, it will fill with `0` when the user empties it.
* `numberNullableDeserialize` - Same as `numberDeserialize` except you'll get undefined instead of 0 when the user leaves the field blank.

## Conditional vs Remove from DOM
When a field disappears from the DOM, there could be two reasons:
1. The field is no longer an intended part of the form. Perhaps it is an obsolete field due to the way another field is filled out. In this case the data at its path should be deleted so that it doesn't accidentally appear in the final JSON payload.
2. The field is inside a tabbed or paged form and it's on a non-current tab or page. In this case the data at its path should NOT be deleted as it is only hidden, but still good data.

To help form creators distinguish these two cases from one another, there is a `conditional` prop on `Field`, `SubForm`, `SubArray`, and `AddMore`. When you want to hide the form element because its data is irrelevant (e.g. if the user does not upload an image, I don't need to collect alt text), use this prop instead of using svelte `{#if}` blocks. It will remove the field from the DOM and also set the field value to undefined, effectively deleting it from the form data.

When a conditional field is removed from the form, its data is deleted from the payload, but the data is automatically saved elsewhere in the FormStore. When the conditional field returns to the form, the data also returns as it was before removal. For instance, an image is added to a form, which activates the alt text field. The user adds alt text but then deletes the image. The alt text field disappears and the alt text is removed from the payload. Then the user changes their mind and re-uploads the image. The alt text field will re-appear and will contain the previously entered alt text.

## Message Types
In order to automate a lot of work around showing validation messages, this library has a fairly strict structure for them. Each validation or submission should generate an array of messages with the following properties:
* `type` - May be one of the following four values:
  * `error` - for messages that indicate validation error that prevent successful form submission, i.e. the user did something wrong and should correct it
  * `warning` - for messages that the user should see, but will still be accepted if submitted
  * `success` - for messages that positively indicate a successful validation... these are unusual but for example, "Hooray! That username is available!"
  * `system` - for messages that indicate a system failure instead of a validation error. For instance, the server returned a 503 Unavailable. You probably only want to return these from your `submit` function and not your `validate` function, but that's up to you.
* `message` - the message you want the user to see
* `path` - (optional) the full path to the field the message is aimed at. For instance, `nested.name` if you are telling them the name inside the `nested` sub-form is not valid.

## Dirtying Fields
Showing validation errors too early can be disruptive for users, so this library helps make sure errors only display for fields _above_ the user's current location in the form. It does this by making fields "dirty" when the user interacts with one of them. There's a little bit of work going on under the hood to keep track of the DOM order of elements so that "above" and "below" are stable concepts, but you shouldn't have to worry much about it.

Generally you should not have to keep track of input dirtying at all. The validation messages and statuses you receive will already have taken it into account. If you are wondering why an error message returned by your `validate` function is not visible, it is probably this feature.

## AddMore with non-objects
Usually the `AddMore` component is for adding array items that are full objects. Something like a multiselect combo box is usually more appropriate for collecting an array of strings. But if you really want to use `AddMore` with a single `Field` and not have it create an object, you can do `<Field path="">`.

Similarly, it is possible to nest `AddMore` components to create an array of arrays. Use `<AddMore path="">` for the inner array.

In a rare circumstance, you might want to surround an `AddMore` component with a div that provides a border, but the `AddMore` itself is conditional on some other field. If you just set the conditional, you'll end up with an empty wrapping div when the condition is not met. Ugly.

In this case you can create a `SubForm` with the path and conditional, create your wrapping div inside it, then create the `AddMore` inside that, with `path=""`.

# Developing

This is a state management library with no real UI of its own, but there is an extremely minimal demo available:

```bash
npm run dev -- --open
```
