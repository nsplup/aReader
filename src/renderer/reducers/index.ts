import { GENERATE_FONTS } from '../constants'

interface State {
  fonts: Array<string>
}

interface Action {
  type: string
  payload: { [key: string]: any }
}

interface ActionMap {
  [key: string]: () => State
}

const initialState: State = {
  fonts: []
}

export default function rootReducer (state = initialState, action: Action): State {
  const actionMap: ActionMap = {
    [GENERATE_FONTS] () {
      return Object.assign({}, state, action.payload)
    },
  }

  const matchedAction = actionMap[action.type]

  return typeof matchedAction === 'function'
    ? matchedAction()
    : state
}