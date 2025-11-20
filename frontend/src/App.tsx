import { Route, Routes } from "react-router-dom"

import { DashboardLayout } from "./components/Layout"
import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { ChatPage } from "./pages/ChatPage"
import { LoginPage } from "./pages/LoginPage"
import { RegisterPage } from "./pages/RegisterPage"
import { GuestRoute } from "./routes/GuestRoute"
import { ProtectedRoute } from "./routes/ProtectedRoute"

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ChatPage />} />
          </Route>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
