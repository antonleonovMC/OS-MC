import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { addCollection } from '@iconify/react';
import lineMd from '@iconify-json/line-md/icons.json';
addCollection(lineMd);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
