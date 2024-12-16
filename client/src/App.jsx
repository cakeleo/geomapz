import React from 'react';
import Map from './components/Map';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, setUser } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div id="map-container" style={{ width: '100%', height: '100vh' }}>
      <Map user={user} setUser={setUser} />
    </div>
  );
}

export default App;