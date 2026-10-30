import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import OtpVerification from "./pages/VerifyOtp";
import { ToastContainer } from 'react-toastify';
import { AppData } from './context/AppContext';

export const baseUrl = "http://localhost:8080/api/v1"

function App() {
  const { loading, isAuth } = AppData();

  console.log(isAuth);


  return (
    <>

      {loading ? (<div>Loading...</div>) : (<BrowserRouter>
        <Routes>
          <Route path="/" element={isAuth ? <Home /> : <Login />} />
          <Route path="/login" element={isAuth ? <Home /> : <Login />} />
          <Route path="/verifyOtp" element={isAuth ? <Home /> : <OtpVerification />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>)}

    </>
  )
}

export default App
