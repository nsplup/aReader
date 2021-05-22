import React from 'react'
import { Provider } from 'react-redux'
import store from './store/index'

import './App.scss'
import Lunch from '@renderer/pages/Launch'

export default function App (): JSX.Element {
  return (
    <Provider store={store}>
      <Lunch/>
    </Provider>
  )
}