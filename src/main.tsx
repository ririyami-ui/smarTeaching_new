import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'moment/locale/id'
import moment from 'moment'
moment.locale('id')
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

