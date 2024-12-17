import React, { useState } from 'react';
import { FONTS, FONT_SIZES } from '../utils/theme';

function AuthModal({ onClose, onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic API URL based on environment
  const useLocalServer = import.meta.env.VITE_USE_LOCAL_SERVER === 'true';
  const API_URL = useLocalServer 
    ? 'http://localhost:3001'
    : 'https://geomapz-api.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const endpoint = isLogin ? 'login' : 'register';
      const url = `${API_URL}/api/auth/${endpoint}`;
      
      console.log(`Making ${endpoint} request to:`, url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        })
      });

      // Log response status and headers for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));

      // Get response as text first
      const responseText = await response.text();
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || `${endpoint} failed`);
      }

      console.log(`${endpoint} successful:`, data);
      
      // Check if we got back the expected data
      if (!data.username) {
        throw new Error('Server response missing username');
      }

      onAuth(data.username);
      onClose();
      
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
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
        width: '90%',
        position: 'relative'
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
              disabled={isLoading}
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
              disabled={isLoading}
              required
              style={{ padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          {error && (
            <div style={{ 
              color: 'red', 
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#ffebee',
              borderRadius: '4px'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '1rem',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          disabled={isLoading}
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
          disabled={isLoading}
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