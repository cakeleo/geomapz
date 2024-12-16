// src/components/InfoBox.jsx
import React from 'react';
import './InfoBox.css';
import { FONTS, FONT_SIZES } from '../utils/theme';


function InfoBox({ country, position }) {
  if (!country) return null;

  return (
    <div 
      className="info-box"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(15px, -50%)',
        pointerEvents: 'none',
        background: '#B5B5D0',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'flex-start'
      }}
    >
      <div>
        <h3 style={{ margin: '0 0 8px 0' }}>
          {country.emoji} {country.name}
        </h3>
        <p style={{ margin: '4px 0' }}><strong>Capital:</strong> {country.capital}</p>
      </div>
      
      {country.flagUrl && (
        <img 
          src={country.flagUrl} 
          alt={`Flag of ${country.name}`}
          style={{ 
            width: '30%',
            height: 'auto',
            marginLeft: 'auto'
          }}
        />
      )}
    </div>
  );
}

export default InfoBox;
