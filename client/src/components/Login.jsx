import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          username,
          password,
        }
      );
      login(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Login</h2>
      <input
        type="text"
        placeholder="Username"
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition"
      >
        Log In
      </button>
    </form>
  );
};

export default Login;
