import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, expect, it } from 'vitest'
import FormDemo from '../src/routes/+page.svelte'

async function settle (ms = 0) {
  await new Promise(resolve => setTimeout(resolve, ms))
  flushSync()
}

function setInput (input, value) {
  input.value = value
  // svelte 5 delegates change events to the mount root, so the event must bubble
  input.dispatchEvent(new Event('change', { bubbles: true }))
  flushSync()
}

let target, component
beforeEach(async () => {
  target = document.createElement('div')
  document.body.appendChild(target)
  component = mount(FormDemo, { target })
  flushSync()
  // fields register with the store asynchronously before rendering
  for (let i = 0; i < 3; i++) await settle(10)
})

afterEach(() => {
  unmount(component)
  target.remove()
})

const dataJson = () => target.querySelector('pre').textContent

it('renders a Field with its defaultValue in both the input and the form data', () => {
  const input = target.querySelector('input[name="test"]')
  expect(input).toBeDefined()
  expect(input.value).toBe('Sara')
  expect(dataJson()).toContain('"test": "Sara"')
})

it('updates the form data when the user changes a text input', async () => {
  setInput(target.querySelector('input[name="test"]'), 'Robin')
  await settle(10)
  expect(dataJson()).toContain('"test": "Robin"')
})

it('coerces invalid input to 0 through numberDeserialize but leaves the nullable number undefined', async () => {
  setInput(target.querySelector('input[name="number"]'), 'abc')
  await settle(10)
  expect(dataJson()).toContain('"number": 0')
  expect(dataJson()).not.toContain('"numbernull"')
})

it('hides a conditional field until its condition is met, then renders it with its defaultValue', async () => {
  expect(target.querySelector('input[name="conditional"]')).toBeNull()

  setInput(target.querySelector('input[name="numbernull"]'), '5')
  await settle(10)

  const conditional = target.querySelector('input[name="conditional"]')
  expect(conditional).not.toBeNull()
  expect(conditional.value).toBe('default value')
  expect(dataJson()).toContain('"conditional": "default value"')
})

it('AddMore with minLength 3 renders three inputs seeded by the initialState function', () => {
  const tasks = target.querySelectorAll('input[name^="tasks."]')
  expect(tasks.length).toBe(3)
  expect(tasks[0].value).toBe('Eat 1 cookie!')
  expect(tasks[2].value).toBe('Eat 3 cookies!')
})
