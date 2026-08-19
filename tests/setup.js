// jsdom does not implement ResizeObserver, used by @txstate-mws/svelte-components actions
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe () {}
    unobserve () {}
    disconnect () {}
  }
}

// jsdom only implements requestAnimationFrame in pretendToBeVisual mode
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 0)
  globalThis.cancelAnimationFrame = id => { clearTimeout(id) }
}
