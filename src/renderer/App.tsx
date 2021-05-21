import React from 'react'
import { Provider } from 'react-redux'
import { BrowserRouter as Router } from 'react-router-dom'
import store from './store/index'

import Lunch from '@renderer/pages/Launch'

export default function App (): JSX.Element {
  return (
    <Router>
      <Provider store={store}>
        <Lunch/>
      </Provider>
    </Router>
  )
}