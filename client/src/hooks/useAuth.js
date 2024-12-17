import { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get token from different sources
        const tokenFromStorage = localStorage.getItem('token');
        const tokenFromCookie = document.cookie.includes('authToken');

        console.log('Authentication check details:', {
          tokenFromStorage: !!tokenFromStorage,
          tokenFromCookie: tokenFromCookie,
          cookies: document.cookie
        });

        // If no token is found, immediately set loading to false
        if (!tokenFromStorage && !tokenFromCookie) {
          setUser(null);
          setLoading(false);
          return;
        }

        const response = await fetch(getApiUrl('/api/auth/check'), {
          method: 'GET',
          credentials: 'include', // Critical for cookie-based authentication
          headers: {
            'Accept': 'application/json',
            ...(tokenFromStorage && { 
              'Authorization': `Bearer ${tokenFromStorage}` 
            })
          }
        });

        console.log('Auth check response:', {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.username);
        } else {
          // Parse error response
          const errorData = await response.json().catch(() => ({}));
          console.error('Auth check failed:', errorData);

          // Clear tokens
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', {
          message: error.message,
          stack: error.stack
        });
        
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const handleLogout = () => {
      localStorage.removeItem('token');
      setUser(null);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return { user, setUser, loading };
}

export default useAuth;