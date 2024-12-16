// AuthModal.jsx
import React, { useState } from 'react';
import { FONTS, FONT_SIZES } from '../utils/theme';

function AuthModal({ onClose, onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Get the API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isLogin ? 'login' : 'register';
      console.log(`Attempting ${endpoint} at: ${API_URL}/api/${endpoint}`);

      const response = await fetch(`${API_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `${endpoint} failed`);
      }

      console.log(`${endpoint} successful:`, data);
      localStorage.setItem('token', data.token);
      onAuth(username);
      onClose();
      
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message || 'Authentication failed');
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h2 style={{
          fontFamily: FONTS.primary,
          fontSize: FONT_SIZES.large,
          marginBottom: '1rem'
        }}>
          {isLogin ? 'Login' : 'Register'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          {error && (
            <div style={{ color: 'red', marginTop: '0.5rem' }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#007AFF',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          {isLogin ? 'Need to register?' : 'Already have an account?'}
        </button>
        
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default AuthModal;