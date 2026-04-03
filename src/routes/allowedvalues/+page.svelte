<script lang="ts">
  import { equal, sleep } from 'txstate-utils'
  import { Field, Form } from '$lib'

  async function submit (data: any) {
    await sleep(500)
    return {
      success: true,
      data,
      messages: []
    }
  }

  const colors = ['red', 'green', 'blue']
  const limitedColors = ['red', 'green']
  let useFullList = true

  const sizes = ['S', 'M', 'L', 'XL']
  const limitedSizes = ['M', 'L']
  let useFullSizes = true

  let showFlavor = true
  const flavors = ['vanilla', 'chocolate', 'strawberry']
  const limitedFlavors = ['vanilla', 'chocolate']
  let useFullFlavors = true

  const pets = [
    { id: 1, name: 'Dog' },
    { id: 2, name: 'Cat' },
    { id: 3, name: 'Parrot' }
  ]
  const limitedPets = [
    { id: 1, name: 'Dog' },
    { id: 2, name: 'Cat' }
  ]
  let useFullPets = true
  let showPet = true

  const toppings = [
    { id: 'cheese', label: 'Cheese' },
    { id: 'pepperoni', label: 'Pepperoni' },
    { id: 'mushrooms', label: 'Mushrooms' },
    { id: 'olives', label: 'Olives' }
  ]
  const limitedToppings = [
    { id: 'cheese', label: 'Cheese' },
    { id: 'pepperoni', label: 'Pepperoni' }
  ]
  let useFullToppings = true
  let showToppings = true
</script>

<h1>AllowedValues + Conditional Test</h1>

<Form {submit} let:data let:submitting let:hasUnsavedChanges>

  <!-- Section 1: Basic allowedValues reactivity -->
  <fieldset>
    <legend>1. Basic allowedValues (nullable)</legend>
    <p>Select a color, then toggle to limited list. If your selection is "blue", it should become undefined (nullable field).</p>
    <label>
      <input type="checkbox" bind:checked={useFullList}>
      Use full color list (includes blue)
    </label>
    <br>
    <Field path="color" allowedValues={useFullList ? colors : limitedColors} let:value let:setVal let:path>
      <select name={path} value={value} on:change={e => setVal(e.currentTarget.value || undefined)}>
        <option value="">-- none --</option>
        {#each (useFullList ? colors : limitedColors) as c (c)}
          <option value={c}>{c}</option>
        {/each}
      </select>
      <span>Store value: <code>{JSON.stringify(data.color)}</code></span>
    </Field>
  </fieldset>

  <!-- Section 2: allowedValues with notNull -->
  <fieldset>
    <legend>2. allowedValues + notNull</legend>
    <p>Select a size, then toggle to limited list. If your selection is removed, it should snap to the first allowed value ("M"), not undefined.</p>
    <label>
      <input type="checkbox" bind:checked={useFullSizes}>
      Use full size list (includes S, XL)
    </label>
    <br>
    <Field path="size" notNull allowedValues={useFullSizes ? sizes : limitedSizes} let:value let:setVal let:path>
      <select name={path} value={value} on:change={e => setVal(e.currentTarget.value)}>
        {#each (useFullSizes ? sizes : limitedSizes) as s (s)}
          <option value={s}>{s}</option>
        {/each}
      </select>
      <span>Store value: <code>{JSON.stringify(data.size)}</code></span>
    </Field>
  </fieldset>

  <!-- Section 3: allowedValues + conditional -->
  <fieldset>
    <legend>3. allowedValues + conditional</legend>
    <p>
      This tests the interaction between allowedValues and conditional.<br>
      1. Select a flavor (e.g. "strawberry").<br>
      2. Hide the field (conditional=false) — value moves to conditionalData.<br>
      3. While hidden, toggle to limited flavors (removes "strawberry").<br>
      4. Show the field again — the restored value should be corrected since "strawberry" is no longer allowed.
    </p>
    <label>
      <input type="checkbox" bind:checked={showFlavor}>
      Show flavor field (conditional)
    </label>
    <br>
    <label>
      <input type="checkbox" bind:checked={useFullFlavors}>
      Use full flavor list (includes strawberry)
    </label>
    <br>
    <Field path="flavor" conditional={showFlavor} allowedValues={useFullFlavors ? flavors : limitedFlavors} let:value let:setVal let:path>
      <select name={path} value={value} on:change={e => setVal(e.currentTarget.value || undefined)}>
        <option value="">-- none --</option>
        {#each (useFullFlavors ? flavors : limitedFlavors) as f (f)}
          <option value={f}>{f}</option>
        {/each}
      </select>
      <span>Store value: <code>{JSON.stringify(data.flavor)}</code></span>
    </Field>
    {#if !showFlavor}
      <p><em>Flavor field is hidden (conditional=false). Its data is in conditionalData.</em></p>
    {/if}
  </fieldset>

  <!-- Section 4: allowedValues + conditional + notNull -->
  <fieldset>
    <legend>4. allowedValues + conditional + notNull</legend>
    <p>Same as above but notNull. When restored with a disallowed value, it should snap to the first allowed value instead of undefined.</p>
    <label>
      <input type="checkbox" bind:checked={showFlavor}>
      Show field (shared toggle with section 3)
    </label>
    <br>
    <Field path="flavorRequired" notNull conditional={showFlavor} allowedValues={useFullFlavors ? flavors : limitedFlavors} let:value let:setVal let:path>
      <select name={path} value={value} on:change={e => setVal(e.currentTarget.value)}>
        {#each (useFullFlavors ? flavors : limitedFlavors) as f (f)}
          <option value={f}>{f}</option>
        {/each}
      </select>
      <span>Store value: <code>{JSON.stringify(data.flavorRequired)}</code></span>
    </Field>
  </fieldset>

  <!-- Section 5: allowedValues with json objects -->
  <fieldset>
    <legend>5. allowedValues + json (objects)</legend>
    <p>Values are serialized JSON objects. Select "Parrot", then toggle to limited list. Should become undefined since Parrot is removed and field is nullable.</p>
    <label>
      <input type="checkbox" bind:checked={useFullPets}>
      Use full pet list (includes Parrot)
    </label>
    <br>
    <Field path="pet" json allowedValues={useFullPets ? pets : limitedPets} let:value let:onChange let:path>
      <select name={path} value={value} on:change={onChange}>
        <option value="">-- none --</option>
        {#each (useFullPets ? pets : limitedPets) as p (p.id)}
          <option value={JSON.stringify(p)}>{p.name}</option>
        {/each}
      </select>
      <span>Store value: <code>{JSON.stringify(data.pet)}</code></span>
    </Field>
  </fieldset>

  <!-- Section 6: allowedValues + json + conditional -->
  <fieldset>
    <legend>6. allowedValues + json + conditional</legend>
    <p>
      1. Select "Parrot".<br>
      2. Hide the field.<br>
      3. While hidden, toggle to limited pets (removes Parrot).<br>
      4. Show the field — restored value should be corrected.
    </p>
    <label>
      <input type="checkbox" bind:checked={showPet}>
      Show pet field (conditional)
    </label>
    <br>
    <label>
      <input type="checkbox" bind:checked={useFullPets}>
      Use full pet list (shared toggle with section 5)
    </label>
    <br>
    <Field path="conditionalPet" json conditional={showPet} allowedValues={useFullPets ? pets : limitedPets} let:value let:setVal let:path let:deserialize>
      <select name={path} value={value} on:change={e => setVal(deserialize(e.currentTarget.value))}>
        <option value="">-- none --</option>
        {#each (useFullPets ? pets : limitedPets) as p (p.id)}
          <option value={JSON.stringify(p)}>{p.name}</option>
        {/each}
      </select>
      <span>Store value: <code>{JSON.stringify(data.conditionalPet)}</code></span>
    </Field>
    {#if !showPet}
      <p><em>Pet field is hidden (conditional=false). Its data is in conditionalData.</em></p>
    {/if}
  </fieldset>

  <!-- Section 7: allowedValues + json + conditional + notNull -->
  <fieldset>
    <legend>7. allowedValues + json + conditional + notNull</legend>
    <p>Same as above but notNull. Should snap to first allowed object instead of undefined.</p>
    <label>
      <input type="checkbox" bind:checked={showPet}>
      Show field (shared toggle with section 6)
    </label>
    <br>
    <Field path="requiredPet" json notNull conditional={showPet} allowedValues={useFullPets ? pets : limitedPets} let:value let:setVal let:path let:deserialize>
      <select name={path} value={value} on:change={e => setVal(deserialize(e.currentTarget.value))}>
        {#each (useFullPets ? pets : limitedPets) as p (p.id)}
          <option value={JSON.stringify(p)}>{p.name}</option>
        {/each}
      </select>
      <span>Store value: <code>{JSON.stringify(data.requiredPet)}</code></span>
    </Field>
  </fieldset>

  <!-- Section 8: allowedValuesMultiple with json objects -->
  <fieldset>
    <legend>8. allowedValuesMultiple + json (checkboxes)</legend>
    <p>Check some toppings, then toggle to limited list. Any checked toppings not in the limited list should be removed from the array.</p>
    <label>
      <input type="checkbox" bind:checked={useFullToppings}>
      Use full toppings list (includes Mushrooms, Olives)
    </label>
    <br>
    <Field path="toppings" json defaultValue={[]} allowedValues={useFullToppings ? toppings : limitedToppings} allowedValuesMultiple let:rawValue let:setVal let:path>
      {#each (useFullToppings ? toppings : limitedToppings) as t (t.id)}
        <label>
          <input type="checkbox" checked={Array.isArray(rawValue) && rawValue.some(v => equal(v, t))}
            on:change={e => {
              const arr = Array.isArray(rawValue) ? rawValue : []
              if (e.currentTarget.checked) setVal([...arr, t])
              else setVal(arr.filter(v => !equal(v, t)))
            }}>
          {t.label}
        </label>
      {/each}
      <span>Store value: <code>{JSON.stringify(data.toppings)}</code></span>
    </Field>
  </fieldset>

  <!-- Section 9: allowedValuesMultiple + json + conditional -->
  <fieldset>
    <legend>9. allowedValuesMultiple + json + conditional</legend>
    <p>
      1. Check "Mushrooms" and "Olives".<br>
      2. Hide the field (conditional=false).<br>
      3. Toggle to limited toppings (removes Mushrooms, Olives).<br>
      4. Show the field — the restored array should have those items removed.
    </p>
    <label>
      <input type="checkbox" bind:checked={showToppings}>
      Show toppings field (conditional)
    </label>
    <br>
    <label>
      <input type="checkbox" bind:checked={useFullToppings}>
      Use full toppings list (shared toggle with section 8)
    </label>
    <br>
    <Field path="conditionalToppings" json defaultValue={[]} conditional={showToppings} allowedValues={useFullToppings ? toppings : limitedToppings} allowedValuesMultiple let:rawValue let:setVal let:path>
      {#each (useFullToppings ? toppings : limitedToppings) as t (t.id)}
        <label>
          <input type="checkbox" checked={Array.isArray(rawValue) && rawValue.some(v => equal(v, t))}
            on:change={e => {
              const arr = Array.isArray(rawValue) ? rawValue : []
              if (e.currentTarget.checked) setVal([...arr, t])
              else setVal(arr.filter(v => !equal(v, t)))
            }}>
          {t.label}
        </label>
      {/each}
      <span>Store value: <code>{JSON.stringify(data.conditionalToppings)}</code></span>
    </Field>
    {#if !showToppings}
      <p><em>Toppings field is hidden (conditional=false). Its data is in conditionalData.</em></p>
    {/if}
  </fieldset>

  <br>
  <button disabled={submitting || !hasUnsavedChanges}>Submit</button>

  <h3>Full form data:</h3>
  <pre>{JSON.stringify(data, null, 2)}</pre>
</Form>

<style>
  fieldset { margin-bottom: 1rem; padding: 1rem; }
  code { background: #eee; padding: 2px 4px; }
  p { margin: 0.5rem 0; }
</style>
