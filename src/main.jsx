import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { addCollection } from '@iconify/react';
import lineMd from '@iconify-json/line-md/icons.json';
import solar  from '@iconify-json/solar/icons.json';
addCollection(lineMd);
addCollection(solar);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
