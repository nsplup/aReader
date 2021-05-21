import { createStore, applyMiddleware } from 'redux'
import createSagaMiddleware from 'redux-saga'
import rootReducer from '@renderer/reducers'

// import { persistedStateMiddleware } from '@renderer/middleware'

const initialSagaMiddleware = createSagaMiddleware()
const store = createStore(
  rootReducer,
  applyMiddleware(
    initialSagaMiddleware,
    // persistedStateMiddleware,
  )
)

initialSagaMiddleware.run(function* () {})

export default store