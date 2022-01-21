import { derivedStore, Store, subStore } from '@txstate-mws/svelte-store'
import { get, set } from 'txstate-utils'

export interface Feedback {
  type: 'error'|'warning'|'success'|'system'
  path?: string
  message: string
}

export interface SubmitResponse<StateType> {
  success: boolean
  data: StateType
  messages: Feedback[]
}

type ValidState = 'valid'|'invalid'|undefined

interface IFormStore<StateType> {
  data: Partial<StateType>
  messages: {
    all: Feedback[]
    global: Feedback[]
    fields: Record<string, Feedback[]>
  }
  validField: Record<string, ValidState>
  valid: boolean
  invalid: boolean
  validating: boolean
  submitting: boolean
  saved: boolean
}

const errorTypes = { error: true, system: true }

const initialState = { data: {}, messages: { all: [], global: [], fields: {} }, validField: {}, valid: true, invalid: false, validating: false, submitting: false, saved: false, dirty: undefined }
export class FormStore<StateType = any> extends Store<IFormStore<StateType>> {
  validationTimer?: NodeJS.Timeout
  validateVersion: number
  fields: Map<string, number>
  dirtyIndex: number = -1
  submitPromise?: Promise<SubmitResponse<StateType>>

  constructor (
    private submitFn: (data: Partial<StateType>) => Promise<SubmitResponse<StateType>>,
    private validateFn?: (data: Partial<StateType>) => Promise<Feedback[]>
  ) {
    super(initialState)
    this.validateVersion = 0
    this.fields = new Map()
  }

  reset (data?: StateType) {
    this.dirtyIndex = -1
    this.set({ ...initialState, data: data ?? {} })
  }

  setData (data: StateType) {
    this.update(v => ({ ...v, data }))
    this.triggerValidation()
  }

  setField (path: string, val: any) {
    this.update(v => ({ ...v, data: set(v.data, path, val) }))
    this.dirtyField(path)
    this.triggerValidation()
  }

  dirtyField (path: string) {
    if (this.fields.has(path)) {
      const dirtyIndex = this.fields.get(path)
      if (dirtyIndex > this.dirtyIndex) {
        this.dirtyIndex = dirtyIndex
      }
    }
  }

  push (path: string, initialState: any) {
    this.update(v => {
      const arr = get(v.data, path)
      return { ...v, data: set(v.data, path, [...(Array.isArray(arr) ? arr : []), initialState]) }
    })
    this.triggerValidation()
  }

  /**
   * Returns a store representing the field's value
   */
  getField <T> (path: string) {
    return subStore<T>(this, ['data', path].join('.'))
  }

  getFeedback (path: string) {
    return derivedStore(this, state => (state.messages.fields[path] ?? []))
  }

  getFieldValid (path: string) {
    return derivedStore(this, state => state.validField[path])
  }

  registerField (path: string) {
    this.fields.set(path, this.fields.size)
  }

  reorderFields (form: HTMLFormElement) {
    const nodeIterator = document.createNodeIterator(
      form,
      NodeFilter.SHOW_COMMENT
    )
    let i = 0
    while (nodeIterator.nextNode()) {
      const comment = nodeIterator.referenceNode.nodeValue
      const m = comment.match(/svelte-forms\((.*?)\)/i)
      if (m?.[1]) {
        const path = m[1]
        // if we see a new input before we reach the dirty input, we have to increment
        // dirtyIndex so that it continues to point at the dirty input
        if (!this.fields.has(path) && i < this.dirtyIndex) this.dirtyIndex++
        this.fields.set(path, i++)
      }
    }
  }

  private triggerValidation () {
    this.update(v => ({ ...v, saved: false, validating: true }))
    clearTimeout(this.validationTimer)
    this.validationTimer = setTimeout(() => {
      this.validate().catch(console.error)
    }, 200)
  }

  private async validate () {
    if (this.dirtyIndex === -1) return
    const saveVersion = ++this.validateVersion
    const newMessages = (await this.validateFn?.(this.value.data)) ?? []
    if (this.validateVersion === saveVersion) {
      this.setErrors(newMessages)
      this.update(v => ({ ...v, validating: false }))
    }
  }

  async submit () {
    this.submitPromise ??= this.submitFn(this.value.data)
    try {
      this.update(v => ({ ...v, submitting: true }))
      const resp = await this.submitPromise
      this.update(v => ({ ...v, data: resp.data, saved: resp.success }))
      this.setErrors(resp.messages)
      return resp
    } catch (e) {
      const messages: Feedback[] = [{
        type: 'system',
        message: e.message
      }]
      this.setErrors(messages)
      return {
        success: false,
        data: this.value.data,
        messages
      }
    } finally {
      this.submitPromise = undefined
      this.update(v => ({ ...v, submitting: false }))
    }
  }

  private setErrors (newMessages: Feedback[]) {
    this.update(v => {
      const invalid = newMessages.some(m => errorTypes[m.type])
      const validField: Record<string, ValidState> = Array.from(this.fields.keys()).reduce((validField, path) => ({ ...validField, [path]: 'valid' }), {})
      for (const m of newMessages) {
        if (m.path && errorTypes[m.type]) validField[m.path] = 'invalid'
      }
      return {
        ...v,
        messages: {
          all: newMessages,
          fields: newMessages.filter(m => m.path).reduce((acc, curr) => ({ ...acc, [curr.path]: this.fields.get(curr.path) <= this.dirtyIndex ? [...(acc[curr.path] ?? []), curr] : [] }), {}),
          global: newMessages.filter(m => !m.path)
        },
        validField,
        invalid,
        valid: !invalid
      }
    })
  }
}

export const FORM_CONTEXT = {}
export const FORM_INHERITED_PATH = {}
