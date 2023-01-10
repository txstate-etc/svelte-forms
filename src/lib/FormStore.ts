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

type ValidState = 'valid' | 'invalid' | undefined

interface IFormStore<StateType> {
  data: Partial<StateType>
  conditionalData: Record<string, any>
  messages: {
    all: Feedback[]
    global: Feedback[]
    fields: Record<string, Feedback[]>
  }
  validField: Record<string, ValidState>
  valid: boolean
  invalid: boolean
  showingInlineErrors: boolean
  validating: boolean
  submitting: boolean
  saved: boolean
  width: number
}

const errorTypes = { [MessageType.ERROR]: true, [MessageType.SYSTEM]: true }
function messageIsError (m: Feedback) { return !!errorTypes[m.type] }
function setPathValid (validField: Record<string, ValidState>, path: string) {
  validField[path] = 'valid'
  return validField
}

const initialState = { data: {}, conditionalData: {}, messages: { all: [], global: [], fields: {} }, validField: {}, valid: true, invalid: false, showingInlineErrors: false, validating: false, submitting: false, saved: false, dirty: undefined, width: 800 }
export class FormStore<StateType = any> extends Store<IFormStore<StateType>> {
  validationTimer?: NodeJS.Timeout
  validateVersion: number
  fields: Map<string, number>
  finalizes: Map<string, (value: any) => any>
  dirtyFields: Map<string, boolean>
  dirtyFieldsNextTick: Map<string, boolean>
  dirtyForm: boolean
  submitPromise?: Promise<SubmitResponse<StateType>>
  mounted?: boolean
  isEmptyMap = new Map<string, (data: any) => boolean>()

  constructor (
    private submitFn: (data: Partial<StateType>) => Promise<SubmitResponse<StateType>>,
    private validateFn?: (data: Partial<StateType>) => Promise<Feedback[]>
  ) {
    super(initialState)
    this.validateVersion = 0
    this.fields = new Map()
    this.finalizes = new Map()
    this.reset()
  }

  set (state: IFormStore<StateType>) {
    const invalid = state.messages.all.some(messageIsError)
    const validField: Record<string, ValidState> = Array.from(this.fields.keys()).reduce(setPathValid, {})
    for (const m of state.messages.all) {
      if (m.path && messageIsError(m)) validField[m.path] = 'invalid'
    }
    state.messages.fields = state.messages.all.filter(m => m.path).reduce((acc, curr) => {
      if (curr.path && (this.dirtyForm || this.dirtyFields.get(curr.path))) {
        acc[curr.path] ??= []
        acc[curr.path].push(curr)
      }
      return acc
    }, {})
    state.messages.global = state.messages.all.filter(m => !m.path || !this.fields.has(m.path))
    state.validField = validField
    state.invalid = invalid
    state.valid = !invalid
    state.showingInlineErrors = Object.values(state.messages.fields).some(msgs => msgs.some(messageIsError))
    super.set(state)
  }

  reset (data?: StateType) {
    this.dirtyForm = false
    this.dirtyFields = new Map()
    this.dirtyFieldsNextTick = new Map()
    this.set({ ...initialState, data: data ?? {} })
  }

  setData (data: StateType) {
    this.dirtyForm = true
    this.update(v => ({ ...v, data, conditionalData: {} }))
    this.triggerValidation()
  }

  setField (path: string, val: any) {
    let wasDifferent = false
    this.update(v => {
      const curr = get(v.data, path)
      wasDifferent = !this.equal(curr, val)
      return { ...v, data: set(v.data, path, val) }
    })
    if (wasDifferent) this.triggerValidation()
  }

  /**
   * We make fields dirty when they blur or start getting data, but if we are
   * naive about it we end up with this scenario:
   * 1. user fills in field #1
   * 2. validation is sent to server and says field #2 is required
   * 3. we do not show the error on field #2 because user hasn't gotten there yet
   * 4. user starts typing in field #2
   * 5. we mark field #2 dirty and show the required error
   * 6. validation is sent to server and server reponds that field #2 is fine because the user just put a character in it
   * 7. we hide the required error after a brief flash
   *
   * We'd rather avoid that flash, so we have a "dirty on next tick" concept where
   * the field will be dirty after the next validation completes or there is a
   * major screen redraw.
   */
  dirtyField (path: string) {
    if (this.fields.has(path)) {
      const dirtyIndex = this.fields.get(path)
      if (!dirtyIndex) return
      for (const [key, idx] of this.fields) {
        if (idx <= dirtyIndex) this.dirtyFieldsNextTick.set(key, true)
      }
    }
  }

  dirtyNextTick (path?: string) {
    for (const [key, val] of this.dirtyFieldsNextTick.entries()) {
      if (path !== key) {
        this.dirtyFields.set(key, val)
        this.dirtyFieldsNextTick.delete(key)
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
      if (idx < 0 || idx > arr.length - 1) return v
      const newArr = [...arr]
      newArr.splice(idx, 1)
      return { ...v, data: set(v.data, path, newArr) }
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
    return derivedStore(this, state => (!!this.dirtyFields.get(path) || this.dirtyForm) ? state.validField[path] : undefined)
  }

  registerField (path: string, initialValue: any, conditional?: boolean, finalize?: (value: any) => any) {
    if (typeof initialValue !== 'undefined') {
      this.update(v => {
        if ((!this.dirtyForm || !!this.mounted || !conditional) && get(v.data, path) == null) return { ...v, data: set(v.data, path, initialValue) }
        return v
      })
    }
    this.fields.set(path, this.fields.size)
    if (finalize) this.finalizes.set(path, finalize)
  }

  unregisterField (path: string) {
    const deletedidx = this.fields.get(path)
    if (!deletedidx) return
    this.fields.delete(path)
    this.finalizes.delete(path)
    for (const [key, idx] of this.fields) {
      if (idx > deletedidx) this.fields.set(key, idx - 1)
    }
  }

  registerArray (path: string, initialState: any, minLength: number, isEmpty: (data: any) => boolean) {
    this.isEmptyMap.set(path, isEmpty)
    this.update(v => {
      const val = [...(get<any[]>(v.data, path) ?? [])]
      for (let i = val.length; i < minLength; i++) val.push(initialState)
      return { ...v, data: set(v.data, path, val) }
    })
  }

  reorderFields (form: HTMLFormElement) {
    const nodeIterator = document.createNodeIterator(
      form,
      NodeFilter.SHOW_COMMENT
    )
    this.fields = new Map()
    while (nodeIterator.nextNode()) {
      const comment = nodeIterator.referenceNode.nodeValue
      const m = comment?.match(/svelte-forms\((.*?)\)/i)
      if (m?.[1]) {
        const path = m[1]
        this.fields.set(path, this.fields.size)
      }
    }
    this.dirtyNextTick()
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
    }, 300)
  }

  private prepForSubmit (data: Partial<StateType>) {
    for (const [path, isEmpty] of this.isEmptyMap.entries()) {
      const v = get(data, path)
      data = set(data, path, Array.isArray(v) ? v.filter(itm => !isEmpty(itm)) : v)
    }
    return data
  }

  private async validate () {
    if (!this.validateFn) return
    const saveVersion = ++this.validateVersion
    const data = await this.finalize(this.value.data)
    const newMessages = await this.validateFn(this.prepForSubmit(data))
    if (this.validateVersion === saveVersion) {
      this.dirtyNextTick()
      this.update(v => ({ ...v, validating: false, messages: { ...v.messages, all: newMessages } }))
    }
  }

  private async finalize (data: any) {
    await Promise.all(Array.from(this.finalizes.entries()).map(async ([path, cb]) => {
      data = set(data, path, await cb(get(data, path)))
    }))
    return data
  }

  async submit () {
    try {
      const data = await this.finalize(this.value.data)
      this.submitPromise ??= this.submitFn(this.prepForSubmit(data))
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
        data: this.value.data as StateType,
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
