import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './components/App'
import { createTodoStore } from './store'
import { sendWithFetch } from './todo-api/fetchTransport'
import 'todomvc-app-css/index.css'

const store = createTodoStore(sendWithFetch)

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
