import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from "./components/Home/Home"
import Register from "./components/Register/Register"
import Login from "./components/Login/Login"
import Dashboard from "./components/Dashboard/Dashboard"
import Chat from "./components/Chat/Chat"
import GroupChat from "./components/Chat/GroupChat"
import ProtectedRoute from "./components/Dashboard/ProtectedRoute"
import WrongPath from './components/WrongPath/WrongPath'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/Register' element={<Register />} />
        <Route path='/Login' element={<Login />} />
        <Route  path='/Dashboard'  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route  path='/Chat/:chatId'  element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route  path='/GroupChat/:chatId' element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
        <Route path='/*' element={<WrongPath />} />
      </Routes> 
    </BrowserRouter>
  )
}

export default App