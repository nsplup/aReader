import {
  GENERATE_FONTS,
  UPDATE_LIBRARY,
  UPDATE_USERCONFIG,
} from '../constants'
import { ipcRenderer } from 'electron'
import { SAVE_LIBRARY, SAVE_USERCONFIG } from '@constants'

interface State {
  fonts: Array<string>
  library: Library
  userconfig: UserConfig
}

interface Action {
  type: string
  payload: { [key: string]: any }
  shouldSave?: boolean
}

interface ActionMap {
  [key: string]: () => State
}

const initialState: State = {
  fonts: [],
  library: {
    shelf: [],
    data: {}
  },
  userconfig: {
    renderMode: 'page',
    fontStyle: {
      fontFamily: '微软雅黑',
      fontSize: 18,
      textIndent: 0,
      lineHeight: 50
    },
    colorPlan: {
      current: 0,
      custom: ['#b7a1ff', '#2e003e']
    }
  },
}

export default function rootReducer (state = initialState, action: Action): State {
  const actionMap: ActionMap = {
    [GENERATE_FONTS] () {
      return Object.assign({}, state, action.payload)
    },
    [UPDATE_LIBRARY] () {
      const newState = Object.assign({}, state, action.payload)
      ipcRenderer.send(SAVE_LIBRARY, newState.library)

      return newState
    },
    [UPDATE_USERCONFIG] () {
      const newState = Object.assign({}, state, action.payload)

      if (action.shouldSave) {
        ipcRenderer.send(SAVE_USERCONFIG, newState.userconfig)
      }
      return newState
    },
  }

  const matchedAction = actionMap[action.type]

  return typeof matchedAction === 'function'
    ? matchedAction()
    : state
}