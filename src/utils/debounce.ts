export function debounce (fn: Function, delay: number) {
  let timer: any = null
  return function(...props: any[]) {
      clearTimeout(timer)
      timer = setTimeout(() => fn.apply(null, props), delay) 
  }
}