import { derivedStore, Store, subStore } from '@txstate-mws/svelte-store'
import type { EventDispatcher } from 'svelte'
import { equal, get, isNotEmpty, set } from 'txstate-utils'

export enum MessageType {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  SYSTEM = 'system',
  INFO = 'info'
}

export interface Feedback {
  type: `${MessageType}`
  path?: string
  message: string
  extra?: any
}

export interface SubmitResponse<StateType> {
  success: boolean
  data?: StateType
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
  hasUnsavedChanges: boolean
}

export interface FormStoreEvents<StateType> {
  autosaved: CustomEvent<StateType>
  saved: CustomEvent<StateType>
  validationfail: CustomEvent<Feedback[]>
}

const errorTypes = { [MessageType.ERROR]: true, [MessageType.SYSTEM]: true }
function messageIsError (m: Feedback) { return !!errorTypes[m.type] }
function setPathValid (validField: Record<string, ValidState>, path: string) {
  validField[path] = 'valid'
  return validField
}

const initialState = { data: {}, conditionalData: {}, messages: { all: [], global: [], fields: {} }, validField: {}, valid: true, invalid: false, showingInlineErrors: false, validating: false, submitting: false, saved: false, dirty: undefined, width: 800, hasUnsavedChanges: false }
export class FormStore<StateType = any> extends Store<IFormStore<StateType>> {
  validationTimer?: ReturnType<typeof setTimeout>
  validateVersion: number
  preloadTimer?: ReturnType<typeof setTimeout>
  submitVersion: number
  fields: Map<string, number>
  arrayFields = new Map<string, number>()
  initialized: Set<string>
  initializes: Map<string, (value: any) => any>
  finalizes: Map<string, (value: any, isSubmit?: boolean) => any>
  dirtyFields: Set<string>
  dirtyFieldsNextTick: Set<string>
  dirtyForm = false
  preloaded = false
  submitPromise?: Promise<SubmitResponse<StateType>>
  mounted?: boolean
  needsValidation?: boolean
  isEmptyMap = new Map<string, (data: any) => boolean>()
  beforeUserChanges?: Partial<StateType>
  autoSave?: boolean
  protected dispatch?: EventDispatcher<Record<string, any>>

  constructor (
    protected submitFn: (data: Partial<StateType>) => Promise<SubmitResponse<StateType>>,
    protected validateFn?: (data: Partial<StateType>) => Promise<Feedback[]>
  ) {
    super(structuredClone(initialState))
    this.validateVersion = 0
    this.submitVersion = 0
    this.fields = new Map()
    this.initialized = new Set()
    this.initializes = new Map()
    this.finalizes = new Map()
    this.reset()
  }

  set (state: IFormStore<StateType>) {
    const statechanges: Partial<IFormStore<StateType>> = {}
    statechanges.invalid = state.messages.all.some(messageIsError)
    const validField: Record<string, ValidState> = Array.from(this.fields.keys()).reduce(setPathValid, {})
    for (const m of state.messages.all) {
      if (m.path && messageIsError(m)) validField[m.path] = 'invalid'
    }
    statechanges.messages = { ...state.messages }
    statechanges.messages.fields = state.messages.all.filter(m => m.path).reduce((acc, curr) => {
      if (curr.path && (this.dirtyForm || this.dirtyFields.has(curr.path))) {
        acc[curr.path] ??= []
        acc[curr.path].push(curr)
      }
      return acc
    }, {})
    statechanges.messages.global = state.messages.all.filter(m => !m.path || (!this.fields.has(m.path) && !this.arrayFields.has(m.path)))
    statechanges.validField = validField
    statechanges.valid = !statechanges.invalid
    statechanges.showingInlineErrors = statechanges.messages.global.some(messageIsError) || Object.values(statechanges.messages.fields).some(msgs => msgs.some(messageIsError))
    statechanges.hasUnsavedChanges = !!this.mounted && !equal(state.data, this.beforeUserChanges)
    super.set({ ...state, ...statechanges })
  }

  updateDirtyOnBlur () {
    // if we are already validating, we can just wait for that because it will
    // trigger dirtyNextTick and update the state
    if (!this.value.validating) {
      // if we are not validating, we want to show errors on fields immediately as they lose focus
      this.dirtyNextTick()
      this.set({ ...this.value })
    }
  }

  reset (data?: StateType) {
    this.dirtyForm = false
    this.preloaded = false
    this.submitVersion = 0
    this.validateVersion = 0
    this.dirtyFields = new Set()
    this.dirtyFieldsNextTick = new Set()
    this.beforeUserChanges = undefined
    clearTimeout(this.validationTimer)
    clearTimeout(this.preloadTimer)
    this.set(structuredClone(initialState))
    if (data != null) this.preload(data)
  }

  async preload (data: Partial<StateType> | undefined) {
    console.log('Preloading', data)
    if (equal(data, this.value.data)) return
    this.preloaded = true
    this.initialized.clear()
    const initialized = await this.initialize(data ?? {})
    this.beforeUserChanges = structuredClone(initialized)
    await this.setData(initialized, false, data == null)
    this.preloadTimer = setTimeout(() => {
      if (data != null) this.setDirtyForm() // on autosave forms, we need to do this again after fields are registered
    }, 10)
  }

  /**
   * skipInitialize is meant for when the data was extracted from state instead
   * of coming from the database/API
   */
  async setData (data: Partial<StateType>, skipInitialize?: boolean, skipDirtyForm?: boolean) {
    this.preloaded = true
    const dataToSet = skipInitialize ? data : await this.initialize(data)
    if (!skipDirtyForm) this.setDirtyForm(dataToSet)
    this.update(v => ({ ...v, data: dataToSet, conditionalData: {} }))
    this.triggerValidation()
  }

  setDirtyForm (data: Partial<StateType> = this.value.data) {
    if (this.autoSave) {
      // normally when we preload or save a form, we assume we are editing an
      // existing object, so we set the whole form dirty and show all errors
      // but when a user preloads an auto-saving form, it's possible that they
      // never progressed to the end of the form
      // we only want to show errors up to the point where they probably stopped
      // working
      // our best guess is going to be that they stopped working at the last field
      // that has non-empty data in it
      let lastDirtyOrder = -1
      let lastDirtyKey: string | undefined
      for (const [key, order] of this.fields.entries()) {
        const val = get(data, key)
        if (isNotEmpty(val) && order > lastDirtyOrder) {
          lastDirtyOrder = order
          lastDirtyKey = key
        }
      }
      if (lastDirtyOrder > -1) {
        this.dirtyField(lastDirtyKey!)
      }
    } else {
      this.dirtyForm = true
    }
  }

  async setField (path: string, val: any, opts?: { initialize?: boolean, notDirty?: boolean }) {
    if (opts?.initialize && this.initializes.has(path) && !this.initialized.has(path)) {
      this.initialized.add(path)
      val = await this.initializes.get(path)!(val)
    }
    let wasDifferent = false
    this.update(v => {
      const curr = get(v.data, path)
      wasDifferent = !this.equal(curr, val)
      return { ...v, data: set(v.data, path, val) }
    })
    if (wasDifferent) {
      if (!opts?.notDirty) this.dirtyField(path)
      this.triggerValidation()
    }
    return wasDifferent
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
      if (dirtyIndex == null) return
      for (const [key, idx] of this.fields) {
        if (idx <= dirtyIndex) this.dirtyFieldsNextTick.add(key)
      }
      for (const [key, idx] of this.arrayFields) {
        if (idx <= dirtyIndex) this.dirtyFieldsNextTick.add(key)
      }
    }
  }

  dirtyNextTick (path?: string) {
    for (const [key, val] of this.dirtyFieldsNextTick.entries()) {
      if (path !== key) {
        this.dirtyFields.add(key)
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
    return derivedStore(this, state => (!!this.dirtyFields.has(path) || this.dirtyForm) ? state.validField[path] : undefined)
  }

  async registerField (path: string, initialValue: any, initialize?: (value: any) => any, finalize?: (value: any, isSubmit: boolean) => any) {
    this.fields.set(path, this.fields.size + this.arrayFields.size)
    if (initialize) this.initializes.set(path, initialize)
    if (finalize) this.finalizes.set(path, finalize)
    if (initialValue != null && !this.preloaded && get(this.value.data, path) == null) {
      const initialized = await initialize?.(initialValue) ?? initialValue
      this.update(v => {
        if (initialized != null && !this.preloaded && get(v.data, path) == null) {
          this.initialized.add(path)
          return { ...v, data: set(v.data, path, initialized) }
        }
        return v
      })
    } else if (this.preloaded && initialize && !this.initialized.has(path)) {
      await this.setField(path, get(this.value.data, path), { initialize: true, notDirty: true })
    }
  }

  unregisterField (path: string) {
    const deletedidx = this.fields.get(path)
    if (!deletedidx) return
    this.fields.delete(path)
    this.dirtyFields.delete(path)
    this.dirtyFieldsNextTick.delete(path)
    this.initialized.delete(path)
    this.finalizes.delete(path)
    this.initializes.delete(path)
    for (const [key, idx] of this.fields) {
      if (idx > deletedidx) this.fields.set(key, idx - 1)
    }
  }

  registerArray (path: string, initialState: any, minLength: number, startingLength: number, isEmpty: (data: any) => boolean) {
    this.isEmptyMap.set(path, isEmpty)
    this.arrayFields.set(path, this.arrayFields.size + this.fields.size)
    const resolvedMinLength = Math.max(minLength, !this.preloaded ? startingLength : 0)
    this.enforceArrayMin(path, resolvedMinLength, initialState)
  }

  unregisterArray (path: string) {
    this.arrayFields.delete(path)
    this.isEmptyMap.delete(path)
    this.dirtyFields.delete(path)
    this.dirtyFieldsNextTick.delete(path)
  }

  enforceArrayMin (path: string, minLength: number, initialState: any) {
    this.update(v => {
      const val = [...(get<any[]>(v.data, path) ?? [])]
      for (let i = val.length; i < minLength; i++) {
        val.push(typeof initialState === 'function' ? initialState(i) : structuredClone(initialState))
      }
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
      let m = comment?.match(/svelte-forms\((.*?)\)/i)
      if (m?.[1]) {
        const path = m[1]
        this.fields.set(path, this.fields.size + this.arrayFields.size)
      }
      m = comment?.match(/svelte-forms-array\((.*?)\)/i)
      if (m?.[1]) {
        const path = m[1]
        this.arrayFields.set(path, this.arrayFields.size + this.fields.size)
      }
    }
    const maxDirty = Math.max(...[...this.fields.entries(), ...this.arrayFields.entries()].map(([key, order]) => this.dirtyFields.has(key) || this.dirtyFieldsNextTick.has(key) ? order : -1))
    for (const [key, order] of this.arrayFields) {
      if (order <= maxDirty) this.dirtyFieldsNextTick.add(key)
    }
    for (const [key, order] of this.fields) {
      if (order <= maxDirty) this.dirtyFieldsNextTick.add(key)
    }
    if (!this.value.validating) this.dirtyNextTick()
  }

  public unmount () {
    this.reset()
    this.fields.clear()
    this.arrayFields.clear()
    this.initializes.clear()
    this.finalizes.clear()
    this.isEmptyMap.clear()
    this.mounted = false
  }

  public mount () {
    this.mounted = true
    if (this.needsValidation) this.triggerValidation()
  }

  protected triggerValidation () {
    if (!this.mounted) {
      this.needsValidation = true
      return
    }
    this.update(v => ({ ...v, saved: false, validating: !this.autoSave, submitting: !!this.autoSave || v.submitting }))
    clearTimeout(this.validationTimer)
    this.validationTimer = setTimeout(() => {
      if (this.autoSave) this.submit({ autoSave: true }).catch(console.error)
      else this.validate().catch(console.error)
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
    const data = await this.finalize(this.value.data, false)
    const newMessages = await this.validateFn(this.prepForSubmit(data))
    if (this.validateVersion === saveVersion) {
      this.dirtyNextTick()
      this.update(v => ({ ...v, validating: false, messages: { ...v.messages, all: newMessages } }))
    }
  }

  private async initialize (data: any) {
    this.initialized.clear()
    for (const [path] of Array.from(this.initializes.keys())) this.initialized.add(path)
    await Promise.all(Array.from(this.initializes.entries()).map(async ([path, cb]) => {
      data = set(data, path, await cb(get(data, path)))
    }))
    return data
  }

  private async finalize (data: any, isSubmit: boolean) {
    await Promise.all(Array.from(this.finalizes.entries()).map(async ([path, cb]) => {
      data = set(data, path, await cb(get(data, path), isSubmit))
    }))
    return data
  }

  async submit (opts?: { autoSave?: boolean }) {
    try {
      clearTimeout(this.validationTimer)
      const saveVersion = ++this.submitVersion
      ++this.validateVersion
      this.update(v => ({ ...v, submitting: true }))
      const saveData = this.value.data
      const data = await this.finalize(saveData, true)
      const dataToSubmit = this.prepForSubmit(data)
      this.submitPromise ??= this.submitFn(dataToSubmit)
      const resp = await this.submitPromise
      resp.data ??= dataToSubmit as StateType
      if (saveVersion === this.submitVersion) {
        // if this is a regular submission -> dirty the whole form, even if it's an autoSave form
        if (!opts?.autoSave) this.dirtyForm = true
        else this.dirtyNextTick()
        if (resp.success) this.beforeUserChanges = saveData
        this.update(v => ({ ...v, saved: resp.success, messages: { global: [], fields: {}, all: resp.messages } }))
        if (resp.success) {
          if (!opts?.autoSave) {
            await this.preload(resp.data)
            clearTimeout(this.validationTimer)
          }
          this.dispatch?.(opts?.autoSave ? 'autosaved' : 'saved', resp.data)
        } else {
          if (!opts?.autoSave) this.dispatch?.('validationfail', resp.messages)
        }
      }
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
