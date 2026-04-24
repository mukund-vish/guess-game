import { useState, useEffect } from 'react';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import { api } from './lib/api';

import { usePresence } from './hooks/usePresence';

function App() {
  const [user, setUser] = useState(null);

  // Track player presence (runs at App level so it's independent of any page/component)
  usePresence(user?.playerid);

  useEffect(() => {
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

  const handleUserUpdate = (updatedUserData) => {
    const newUser = { ...user, ...updatedUserData };
    setUser(newUser);

    // Update saved session
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        session.user = newUser;
        localStorage.setItem('auth_session', JSON.stringify(session));
      } catch (err) {
        console.error('Failed to update session:', err);
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_session');
  };

  return (
    <div className="App">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
      ) : (
        <Login onSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;