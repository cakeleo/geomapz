/**
 * API configuration and utility functions for cookie-based authentication
 */

// Constants
const API_ENDPOINTS = {
    DEVELOPMENT: 'http://localhost:3001',
    PRODUCTION: 'https://geomapz-api.onrender.com'
  };
  
  /**
   * Determines the appropriate API URL and concatenates the path
   * @param {string} path - The API endpoint path
   * @returns {string} The complete API URL
   */
  const getApiUrl = (path = '') => {
    const isDevelopment = import.meta.env.MODE === 'development';
    const useLocalServer = import.meta.env.VITE_USE_LOCAL_SERVER === 'true';
    
    const baseUrl = isDevelopment && useLocalServer 
      ? API_ENDPOINTS.DEVELOPMENT 
      : API_ENDPOINTS.PRODUCTION;
  
    // Ensure path starts with /api/
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const apiPath = normalizedPath.startsWith('/api/') ? normalizedPath : `/api${normalizedPath}`;
    
    return `${baseUrl}${apiPath}`;
  };
  
  /**
   * Makes an authenticated request to the API using cookies
   */
  const fetchWithAuth = async (endpoint, options = {}) => {
    const url = getApiUrl(endpoint);
  
    // Default options with credentials for cookie-based auth
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'  // Important for cookie-based auth
    };
  
    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
  
    try {
      const response = await fetch(url, finalOptions);
      
      // Handle unauthorized responses (expired/invalid cookie)
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('Authentication expired');
      }
  
      // Parse response
      let data;
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
  
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
  
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };
  
  export {
    getApiUrl,
    fetchWithAuth
  };