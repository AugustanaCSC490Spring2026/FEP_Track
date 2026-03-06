import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {Route,Routes} from "react-router-dom"
import Dashboard from './Dashboard'
import Login from './Login'

function App() {
  const [count, setCount] = useState(0)


  return (

        <Routes>
          <Route path = "/login" element = {<Login />}/>
          <Route path = "/dashboard" element = {<Dashboard />}/>
        </Routes>
  )
}

export default App
