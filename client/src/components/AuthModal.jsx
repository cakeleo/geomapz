import React, { useState } from 'react';
import { getApiUrl } from '../config/api';
import { FONTS, FONT_SIZES } from '../utils/theme';

const AuthModal = ({ onClose, onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const url = getApiUrl(endpoint);
      
      console.log('Auth attempt:', {
        endpoint,
        fullUrl: url,
        isLogin,
        username
      });
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
  
      console.log('Auth response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });
  
      // Log the raw response text first
      const responseText = await response.text();
      console.log('Raw response:', responseText);
  
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response format from server');
      }
  
      console.log('Parsed response data:', data);
  
      // Adjust the success check based on the actual response structure
      if (response.ok && data.username) {
        // Store token in localStorage
        const token = response.headers.get('Authorization') || 
                      data.token || 
                      localStorage.getItem('token');
        
        if (token) {
          localStorage.setItem('token', token);
        }
  
        // Call onAuth with the username
        onAuth(data.username);
      } else {
        // Set error from the response
        setError(data.message || data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      setError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{
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
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '400px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            margin: 0,
            fontFamily: FONTS.primary,
            fontSize: FONT_SIZES.large
          }}>
            {isLogin ? 'Login' : 'Register'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontFamily: FONTS.secondary
              }}
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontFamily: FONTS.secondary
              }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
              minLength={8}
            />
          </div>

          {error && (
            <div style={{
              color: 'red',
              marginBottom: '1rem',
              fontFamily: FONTS.secondary,
              fontSize: FONT_SIZES.small
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#B5E6D8',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: FONTS.secondary,
                fontSize: FONT_SIZES.small
              }}
            >
              {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;