// // import { INIT_FROM_PERSISTED } from '@renderer/constants'

// const STATE_KEY: string[] = []
// const PERSISTED_STATE = 'PERSISTED_STATE'

// export function persistedStateMiddleware (store: any) {
//   let cache: string

//   window.addEventListener('load', () => {
//     const stringifyState = sessionStorage.getItem(PERSISTED_STATE)
//     if (stringifyState) {
//       store.dispatch({ type: INIT_FROM_PERSISTED, payload: JSON.parse(stringifyState) })
//     }
//   }, { once: true })
//   return (next: any) => (action: any) => {
//     const result = next(action)
//     const newState = store.getState()
//     const needToPersist = STATE_KEY.reduce((prev: any, current: string) => {
//       prev[current] = newState[current]
//       return prev
//     }, {})
//     const stringifyState = STATE_KEY.length
//       ? JSON.stringify(needToPersist)
//       : JSON.stringify(newState)

//     if (stringifyState !== cache) {
//       cache = stringifyState
//       sessionStorage.setItem(PERSISTED_STATE, stringifyState)
//     }

//     return result
//   }
// }