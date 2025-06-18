import { useState, useContext } from 'react';
import axios from 'axios';
import { UserContext } from './UserContext';

export default function AuthForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = mode === 'register' ? '/register' : '/login';
      const { data } = await axios.post(url, { username, password }, { withCredentials: true });

      setLoggedInUsername(data.user.username);
      setId(data.user.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          type="text"
          placeholder="Username"
          className="block w-full p-2 mb-2 border"
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="block w-full p-2 mb-2 border"
        />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
          {mode === 'register' ? 'Register' : 'Login'}
        </button>
        <div className="text-center mt-2">
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-blue-600">Login</button>
            </>
          ) : (
            <>
              Don’t have an account?{' '}
              <button type="button" onClick={() => setMode('register')} className="text-blue-600">Register</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
