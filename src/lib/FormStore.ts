import { derivedStore, Store, subStore } from '@txstate-mws/svelte-store'
import { get, set } from 'txstate-utils'

export enum MessageType {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  SYSTEM = 'system'
}

export interface Feedback {
  type: `${MessageType}`
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
  width: number
}

const errorTypes = { [MessageType.ERROR]: true, [MessageType.SYSTEM]: true }

const initialState = { data: {}, messages: { all: [], global: [], fields: {} }, validField: {}, valid: true, invalid: false, validating: false, submitting: false, saved: false, dirty: undefined, width: 800 }
export class FormStore<StateType = any> extends Store<IFormStore<StateType>> {
  validationTimer?: NodeJS.Timeout
  validateVersion: number
  fields: Map<string, number>
  dirtyFields: Map<string, boolean>
  dirtyForm: boolean
  submitPromise?: Promise<SubmitResponse<StateType>>

  constructor (
    private submitFn: (data: Partial<StateType>) => Promise<SubmitResponse<StateType>>,
    private validateFn?: (data: Partial<StateType>) => Promise<Feedback[]>
  ) {
    super(initialState)
    this.validateVersion = 0
    this.fields = new Map()
    this.dirtyFields = new Map()
    this.dirtyForm = false
  }

  set (state: IFormStore<StateType>) {
    const invalid = state.messages.all.some(m => errorTypes[m.type])
    const validField: Record<string, ValidState> = Array.from(this.fields.keys()).reduce((validField, path) => ({ ...validField, [path]: 'valid' }), {})
    for (const m of state.messages.all) {
      if (m.path && errorTypes[m.type]) validField[m.path] = 'invalid'
    }
    state.messages.fields = state.messages.all.filter(m => m.path).reduce((acc, curr) => ({ ...acc, [curr.path]: (this.dirtyForm || this.dirtyFields.get(curr.path)) ? [...(acc[curr.path] ?? []), curr] : [] }), {})
    state.messages.global = state.messages.all.filter(m => !m.path)
    state.validField = validField
    state.invalid = invalid
    state.valid = !invalid
    super.set(state)
  }

  reset (data?: StateType) {
    this.dirtyForm = false
    this.dirtyFields = new Map()
    this.set({ ...initialState, data: data ?? {} })
  }

  setData (data: StateType) {
    this.dirtyForm = true
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
      for (const [key, idx] of this.fields) {
        if (idx <= dirtyIndex) this.dirtyFields.set(key, true)
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

  deleteFromArray (path: string, idx: number) {
    this.update(v => {
      const arr = get(v.data, path)
      return { ...v, data: set(v.data, path, [...arr].splice(idx, 1)) }
    })
    this.triggerValidation()
  }

  moveUp (path: string, idx: number) {
    if (idx === 0) return
    this.update(v => {
      const arr = [...get(v.data, path)]
      const swap = arr[idx - 1]
      arr[idx - 1] = arr[idx]
      arr[idx] = swap
      return { ...v, data: set(v.data, path, arr) }
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
    return derivedStore(this, state => (this.dirtyFields.get(path) || this.dirtyForm) ? state.validField[path] : undefined)
  }

  registerField (path: string, initialValue: any) {
    if (typeof initialValue !== 'undefined') {
      this.update(v => {
        if (typeof get(v.data, path) === 'undefined') return { ...v, data: set(v.data, path, initialValue) }
        return v
      })
    }
    this.fields.set(path, this.fields.size)
  }

  unregisterField (path: string) {
    const deletedidx = this.fields.get(path)
    this.fields.delete(path)
    for (const [key, idx] of this.fields) {
      if (idx > deletedidx) this.fields.set(key, idx - 1)
    }
  }

  reorderFields (form: HTMLFormElement) {
    const nodeIterator = document.createNodeIterator(
      form,
      NodeFilter.SHOW_COMMENT
    )
    this.fields = new Map()
    while (nodeIterator.nextNode()) {
      const comment = nodeIterator.referenceNode.nodeValue
      const m = comment.match(/svelte-forms\((.*?)\)/i)
      if (m?.[1]) {
        const path = m[1]
        this.fields.set(path, this.fields.size)
      }
    }
    let dirtyStarted = false
    for (const [key] of Array.from(this.fields).reverse()) {
      if (this.dirtyFields.get(key)) dirtyStarted = true
      if (dirtyStarted) this.dirtyFields.set(key, true)
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
    const saveVersion = ++this.validateVersion
    const newMessages = await this.validateFn?.(this.value.data)
    if (this.validateVersion === saveVersion) {
      this.update(v => ({ ...v, validating: false, messages: { ...v.messages, all: newMessages } }))
    }
  }

  async submit () {
    this.submitPromise ??= this.submitFn(this.value.data)
    try {
      this.update(v => ({ ...v, submitting: true }))
      const resp = await this.submitPromise
      this.dirtyForm = true
      this.update(v => ({ ...v, data: resp.data, saved: resp.success, messages: { ...v.messages, all: resp.messages } }))
      return resp
    } catch (e) {
      const messages: Feedback[] = [{
        type: MessageType.SYSTEM,
        message: e.message
      }]
      this.update(v => ({ ...v, messages: { ...v.messages, all: messages } }))
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
}

export const FORM_CONTEXT = {}
export const FORM_INHERITED_PATH = {}
