import { dateToISOWithTZ } from 'txstate-utils'

function dtToJSON () {
  return dateToISOWithTZ(this)
}

export function dateSerialize (dt: Date|string) {
  if (typeof dt === 'string' && dt) dt = new Date(dt)
  return dt instanceof Date ? `${String(dt.getFullYear()).padStart(4, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : ''
}

export function dateDeserialize (v: string) {
  if (!v) return undefined
  const [year, month, day] = v.split('-').map(Number)
  const dt = new Date(year, month - 1, day, 12, 0, 0, 0)
  dt.setFullYear(year)
  dt.toJSON = dtToJSON
  return dt
}

export function datetimeSerialize (dt: Date) {
  if (typeof dt === 'string' && dt) dt = new Date(dt)
  return dt instanceof Date ? `${String(dt.getFullYear()).padStart(4, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}` : ''
}

export function datetimeDeserialize (v: string) {
  if (!v) return undefined
  const [year, month, day, hour, minute] = v.split(/[T:-]/).map(Number)
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0)
  dt.setFullYear(year)
  dt.toJSON = dtToJSON
  return dt
}

export function nullableSerialize (v: string) {
  return v == null ? '' : v
}

export function nullableDeserialize (v: string) {
  return v === '' ? undefined : v
}

export function numberSerialize (n?: number) {
  return n == null ? '' : String(n)
}

export function numberDeserialize (v: string) {
  if (v === '') return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

export function numberNullableDeserialize (v?: string) {
  if (v === '') return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}
