import React, { useState, useEffect, useMemo, useRef } from 'react';
import { geoPath, geoMercator } from 'd3-geo';
import { zoom } from 'd3-zoom';
import { select } from 'd3-selection';
import InfoBox from './InfoBox';
import { countriesData } from './countries.js';
import './Map.css';
import flagEmojis from '../data/flagemojis.json';
import capitals from '../data/capitals.json';
import NotesPanel from './NotesPanel';
import { FONTS, FONT_SIZES } from '../utils/theme';
import AuthModal from './AuthModal';
import { getApiUrl } from '../config/api';
import { fetchWithAuth } from '../config/api';


function Map({ user, setUser }) {
  // State declarations
  const [mapData, setMapData] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryNotes, setCountryNotes] = useState({});
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAuth = (token, username) => {
    localStorage.setItem('token', token); // Store the token
    setUser(username);
    setShowAuthModal(false);
  };

  // Refs
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);

  // Constants
  const WIDTH = 1000;
  const HEIGHT = 500;
  const ZOOM_LEVELS = [1, 5, 8, 11, 15];

  // Helper functions
  const getCountryEmoji = (countryCode) => {
    const country = flagEmojis.find(c => c.code === countryCode);
    return country ? country.emoji : '';
  };

  const getCapital = (countryName) => {
    const country = capitals.find(c => c.country === countryName);
    return country?.city || '';
  };

  // Fetch notes for a specific country
  const fetchCountryNotes = async (countryId) => {
    if (!user) return;

  try {
    const response = await fetch(getApiUrl(`/api/notes/${countryId}`), {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

      if (response.ok) {
        const data = await response.json();
        setCountryNotes(prev => ({
          ...prev,
          [countryId]: data.notes
        }));
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const saveCountryNotes = async (countryId, noteData) => {
    if (!user) {
      // Store locally if no user is logged in
      const updatedNotes = {
        ...countryNotes,
        [countryId]: noteData
      };
      setCountryNotes(updatedNotes);
      localStorage.setItem('geoguessrNotes', JSON.stringify(updatedNotes));
      return;
    }

    try {
      const response = await fetch(`/api/notes/${countryId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes: noteData })
      });

      if (!response.ok) throw new Error('Failed to save notes');
      
      setCountryNotes(prev => ({
        ...prev,
        [countryId]: noteData
      }));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchWithAuth('/auth/logout', {
        method: 'POST'
      });
      setUser(null);
      setCountryNotes({});
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the user state even if the server request fails
      setUser(null);
      setCountryNotes({});
    }
  };
        
  // Effects
  useEffect(() => {
    if (!user) {
      // Load notes from localStorage when no user is logged in
      const savedNotes = localStorage.getItem('geoguessrNotes');
      if (savedNotes) {
        try {
          setCountryNotes(JSON.parse(savedNotes));
        } catch (error) {
          console.error('Error parsing saved notes:', error);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    fetch('/data/world-map.json')
    .then((response) => response.json())
      .then((data) => {
        const processedData = {
          ...data,
          features: data.features.map((feature, index) => ({
            ...feature,
            id: `${feature.properties.iso_a3}-${index}`,
            properties: {
              ...feature.properties,
              coverage: countriesData.fullyCovered.has(feature.properties.name)
                ? 'full'
                : countriesData.limitedCoverage.has(feature.properties.name)
                ? 'limited'
                : 'none',
            },
          })),
        };
        setMapData(processedData);
      })
      .catch((error) => console.error('Error loading map:', error));
  }, []);

  // Memos
  const { projection, pathGenerator } = useMemo(() => {
    if (!mapData) return { projection: null, pathGenerator: null };
    
    const proj = geoMercator()
      .scale((WIDTH * 0.12))
      .center([0, 20])
      .translate([WIDTH * 0.38, HEIGHT * 0.5]);
      
    return {
      projection: proj,
      pathGenerator: geoPath().projection(proj),
    };
  }, [mapData]);

  const pathData = useMemo(() => {
    if (!mapData || !pathGenerator) return [];
    return mapData.features.map((feature) => {
      const countryCode = feature.properties.iso_a2;
      const flagInfo = flagEmojis.find(c => c.code === countryCode);
      const countryName = feature.properties.name;
      
      return {
        id: feature.id,
        name: countryName,
        iso: countryCode,
        coverage: feature.properties.coverage,
        path: pathGenerator(feature),
        emoji: flagInfo?.emoji || '',
        flagUrl: flagInfo?.image || '',
        capital: getCapital(countryName)
      };
    });
  }, [mapData, pathGenerator]);

  // Zoom effect
  useEffect(() => {
    if (!svgRef.current || !gRef.current || !mapData) return;
  
    const svg = select(svgRef.current);
    const g = select(gRef.current);
  
    const zoomBehavior = zoom()
      .scaleExtent([1, 15])
      .translateExtent([
        [-WIDTH, -HEIGHT],
        [WIDTH * 2, HEIGHT * 2]
      ])
      .on('zoom', (event) => {
        // Safely handle the zoom event
        if (!event) return;
        
        g.attr('transform', event.transform);
  
        // Reset position if zoomed out completely
        if (event.transform.k === 1) {
          event.transform.x = 0;
          event.transform.y = 0;
          g.attr('transform', event.transform);
        }
      });
  
    // Apply zoom behavior to SVG
    svg.call(zoomBehavior);
  
    // Prevent default zoom on doubleclick
    svg.on('dblclick.zoom', null);
  
    // Add grab cursor
    svg
      .style("cursor", "grab")
      .on("mousedown", () => svg.style("cursor", "grabbing"))
      .on("mouseup", () => svg.style("cursor", "grab"));
  
    // Cleanup
    return () => {
      svg.on('.zoom', null);
    };
  }, [mapData]);

  if (!mapData || !pathGenerator) return <div>Loading map...</div>;

  return (
    <div
      ref={containerRef}
      className="map-container"
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{
          width: '100%',
          height: '100%',
          background: '#9ED2E4',
          cursor: 'grab',
        }}
      >
        <g ref={gRef}>
          {pathData.map(({ id, path, coverage, name }) => (
            <path
              key={id}
              className={`map-path ${hoveredCountry === id ? 'hovered' : ''}`}
              d={path}
              fill={
                coverage === 'none'
                  ? '#B5B5D0'
                  : hoveredCountry === id
                  ? '#FFE17D'
                  : coverage === 'full'
                  ? '#B5E6D8'
                  : '#E6B5C4'
              }
              style={{
                pointerEvents: coverage === 'none' ? 'none' : 'auto',
                cursor: coverage === 'none' ? 'default' : 'pointer',
              }}
              onMouseEnter={(e) => {
                setHoveredCountry(id);
                setMousePosition({ x: e.pageX, y: e.pageY });
              }}
              onClick={() => {
                if (coverage !== 'none') {
                  setSelectedCountry(id);
                  fetchCountryNotes(id);
                }
              }}
              onMouseMove={(e) => {
                setMousePosition({ x: e.pageX, y: e.pageY });
              }}
              onMouseLeave={
                coverage !== 'none' ? () => setHoveredCountry(null) : undefined
              }
            />
          ))}
        </g>

        <text
          x={WIDTH - 20}
          y={HEIGHT - 20}
          style={{
            fill: 'rgba(0, 0, 0, 0.3)',
            fontFamily: FONTS.primary,
            fontSize: FONT_SIZES.small,
            textAnchor: 'end',
            userSelect: 'none',
          }}
        >
          2024, cakeboy69 ©
        </text>
      </svg>

      {hoveredCountry && (
        <InfoBox
          country={pathData.find((d) => d.id === hoveredCountry)}
          position={mousePosition}
          style={{
            position: 'fixed',
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
      )}

      {selectedCountry && (
        <NotesPanel
          country={pathData.find((d) => d.id === selectedCountry)}
          notes={countryNotes[selectedCountry] || {}}
          onNotesChange={(noteData) => saveCountryNotes(selectedCountry, noteData)}
          onClose={() => setSelectedCountry(null)}
        />
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'white',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              fontFamily: FONTS.secondary,
              fontSize: FONT_SIZES.small,
              backgroundColor: '#B5E6D8',
              marginRight: '10px',
            }}
          ></span>
          Full Coverage
        </div>
        <div>
          <span
            style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              fontFamily: FONTS.secondary,
              fontSize: FONT_SIZES.small,
              backgroundColor: '#E6B5C4',
              marginRight: '10px',
            }}
          ></span>
          Limited Coverage
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
      }}>
        {user ? (
          <div>
            <span>Welcome, {user}!</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <button onClick={() => setShowAuthModal(true)}>Login/Register</button>
        )}
      </div>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onAuth={handleAuth}
        />
      )}
    </div>
  );
}

export default Map;