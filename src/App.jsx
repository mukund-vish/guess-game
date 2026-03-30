import { useState, useEffect } from 'react';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import { api } from './lib/api';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initial ping to backend
    api('/')
      .then(data => console.log('Backend status:', data))
      .catch(err => console.error('Backend connection issue:', err));

    // Check for existing session
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const { user, expiresAt } = JSON.parse(savedSession);
        if (expiresAt > Date.now()) {
          setUser(user);
        } else {
          localStorage.removeItem('auth_session');
        }
      } catch (err) {
        console.error('Failed to parse session:', err);
        localStorage.removeItem('auth_session');
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_session');
  };

  return (
    <div className="App">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;