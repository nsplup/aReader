import { createStore } from 'redux'
import rootReducer from '@renderer/reducers'


const store = createStore(rootReducer)

export default store