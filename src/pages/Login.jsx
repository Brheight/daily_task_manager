import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode"; // yarn add jwt-decode
import dayjs from "dayjs"; // yarn add dayjs


const API_URL = "https://admin.mcscglobal.org/api";

// Create axios instance with interceptor
const axiosInstance = axios.create({ baseURL: API_URL });

axiosInstance.interceptors.request.use(async (req) => {
  let access = localStorage.getItem("access");
  let refresh = localStorage.getItem("refresh");

  if (!access) return req;

  const decoded = jwtDecode(access);
  const isExpired = dayjs.unix(decoded.exp).diff(dayjs()) < 1;

  if (!isExpired) {
    req.headers.Authorization = `Bearer ${access}`;
    return req;
  }

  // Refresh access token if expired
  try {
    const res = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh });
    localStorage.setItem("access", res.data.access);
    req.headers.Authorization = `Bearer ${res.data.access}`;
  } catch (err) {
    localStorage.clear();
    window.location.href = "/login";
  }

  return req;
});

export default function Login({ onLogin }) {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      
     const res = await axiosInstance.post("/auth/login/", {
        username: email,
        password: password,
        });
      const accessToken = res.data.access;
      const refreshToken = res.data.refresh;

      localStorage.setItem("access", accessToken);
      localStorage.setItem("refresh", refreshToken);
      localStorage.setItem("newname", email);
      const newname = localStorage.getItem("newname");
      console.log('display name')
      console.log(newname)
      // decode token → get username
      const decoded = jwtDecode(accessToken);
      localStorage.setItem("username", decoded.username || decoded.sub);

      onLogin();
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-[#0A3A67] mb-6">
          Login to Task Manager
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <input
            type="text"
            name="email"
            placeholder="Username"
            required
            className="w-full border rounded-md px-3 py-2"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="w-full border rounded-md px-3 py-2"
          />
          <button className="w-full bg-[#0A3A67] text-white py-2 rounded-md shadow">
            Login
          </button>
        </form>
      </div>
    </main>
  );
}

export { axiosInstance };
