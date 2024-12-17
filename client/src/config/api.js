const useLocalServer = import.meta.env.VITE_USE_LOCAL_SERVER === 'true';
const API_URL = useLocalServer 
  ? 'http://localhost:3001'
  : 'https://geomapz-api.onrender.com';

export const getApiUrl = (endpoint) => `${API_URL}${endpoint}`;