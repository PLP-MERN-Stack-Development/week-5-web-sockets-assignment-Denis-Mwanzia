import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        {
          username,
          password,
        }
      );
      login(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Register</h2>
      <input
        type="text"
        placeholder="Username"
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition"
      >
        Register
      </button>
    </form>
  );
};

export default Register;
