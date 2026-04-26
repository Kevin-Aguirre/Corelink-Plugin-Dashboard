import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"

function RequireAuth({ children }) {
  const token = sessionStorage.getItem("cl_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<Navigate to="/login"/>}></Route>
        <Route path="/login"      element={<Login/>}></Route>
        <Route path="/dashboard"  element={
          <RequireAuth><Dashboard/></RequireAuth>
        }></Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
