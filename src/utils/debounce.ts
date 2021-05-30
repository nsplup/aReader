export function debounce (fn: Function, delay: number) {
  let timer: number = null
  return function() {
      if(timer){
          clearTimeout(timer)
          timer = setTimeout(fn,delay) 
      }else{
          timer = setTimeout(fn,delay)
      }
  }
}