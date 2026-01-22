import React, { useState, useEffect } from "react";
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import DailyTodo from "./pages/todolist";
import Login from "./pages/Login";



import { jwtDecode } from "jwt-decode";  // ✅ use named import

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const access = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");

      if (access) {
        try {
          const decoded = jwtDecode(access);
          const isExpired = decoded.exp * 1000 < Date.now();

          if (!isExpired) {
            setIsAuthenticated(true);
          } else if (refresh) {
            // Try refreshing automatically
            const res = await fetch("https://admin.mcscglobal.org/api/auth/token/refresh/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh }),
            });
            const data = await res.json();
            if (data.access) {
              localStorage.setItem("access", data.access);
              setIsAuthenticated(true);
            } else {
              localStorage.clear();
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.error("Invalid token:", err);
          setIsAuthenticated(false);
          localStorage.clear();
        }
      } else {
        setIsAuthenticated(false);
      }

      setLoading(false); // ✅ done checking
    };

    checkAuth();
  }, []);

  const location = useLocation(); // still here if you need it

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div>Loading...</div>; // ✅ prevents redirect flicker
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <main
          className="min-h-screen antialiased"
          style={{ backgroundColor: '#F9F9F9', color: '#222222' }}
        >
          <Routes>
       
            {/* <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} /> */}

            {/* Login route */}
            <Route path="/login" element={<Login onLogin={handleLogin} />} />

       

            <Route path="/" element={<DailyTodo  /> } />
            
            
            <Route path="/task-manager" element= {<DailyTodo /> } />
          

            {/* Catch-all: redirect to login  <Route path="*" element={<Navigate to="/login" />} /> */}
            
          </Routes>
        </main>
      </div>
    </div>
  );
};

const MainApp = () => (
  <Router>
    <App />
  </Router>
);

export default MainApp;
