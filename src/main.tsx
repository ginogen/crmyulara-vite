import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true }}>
      <ReactQueryProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ReactQueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
