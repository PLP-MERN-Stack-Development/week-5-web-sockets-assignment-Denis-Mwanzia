import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

function App() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-6">
          <Register />
          <hr className="border-gray-200" />
          <Login />
        </div>
      </div>
    );
  }

  return <Chat />;
}

export default App;
