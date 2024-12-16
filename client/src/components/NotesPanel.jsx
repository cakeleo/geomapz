import React, { useState, useCallback, useEffect } from 'react';
import ImageOverlay from './ImageOverlay';
import { FONTS, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

const NotesPanel = ({ country, notes, onNotesChange, onClose }) => {
  if (!country) return null;

  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_IMAGES_PER_COUNTRY = 10;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Load user-specific notes for this country
    fetch(`/api/notes/${country.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.notes) {
          onNotesChange(country.id, data.notes);
        }
      })
      .catch(err => console.error('Error loading notes:', err));
  }, [country.id]);

  const saveNotes = useCallback((noteData) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`/api/notes/${country.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: noteData })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          onNotesChange(country.id, noteData);
        }
      })
      .catch(err => console.error('Error saving notes:', err));
  }, [country.id, onNotesChange]);

  const handleImageClick = useCallback((e, index) => {
    // Middle click - open in new tab
    if (e.button === 1) {
      window.open(notes[country.id].images[index], '_blank');
    } 
    // Left click - show overlay
    else if (e.button === 0) {
      setSelectedImage(index);
    }
  }, [country.id, notes]);

  const validateImage = (file, currentImageCount) => {
    if (!file) return { valid: false, error: 'No file provided' };
    
    if (currentImageCount >= MAX_IMAGES_PER_COUNTRY) {
      return { 
        valid: false, 
        error: `Maximum ${MAX_IMAGES_PER_COUNTRY} images allowed per country`
      };
    }
    
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return { 
        valid: false, 
        error: `Unsupported file type. Please use: ${SUPPORTED_FORMATS.map(f => f.split('/')[1].toUpperCase()).join(', ')}`
      };
    }
  
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE/1024/1024}MB`
      };
    }
  
    return { valid: true };
  };

  const handleAddComment = useCallback((imageIndex, comment) => {
    const updatedNotes = {
      ...notes[country.id],
      imageComments: {
        ...(notes[country.id]?.imageComments || {}),
        [imageIndex]: [
          ...(notes[country.id]?.imageComments?.[imageIndex] || []),
          comment
        ]
      }
    };
    saveNotes(updatedNotes);
  }, [country.id, notes, saveNotes]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentImageCount = notes[country.id]?.images?.length || 0;
    const remainingSlots = MAX_IMAGES_PER_COUNTRY - currentImageCount;
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_IMAGES_PER_COUNTRY} images allowed per country`);
      return;
    }
  
    // Only process up to the remaining slots
    const filesToProcess = files.slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      const validation = validateImage(file, currentImageCount);
      
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
  
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = event.target.result;
        saveNotes({
          ...notes[country.id],
          text: notes[country.id]?.text || '',
          images: [...(notes[country.id]?.images || []), newImage]
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  
    const files = [...e.dataTransfer.files];
    const currentImageCount = notes[country.id]?.images?.length || 0;
    const remainingSlots = MAX_IMAGES_PER_COUNTRY - currentImageCount;
  
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_IMAGES_PER_COUNTRY} images allowed per country`);
      return;
    }
  
    const filesToProcess = files.slice(0, remainingSlots);
    let hasErrors = false;
  
    filesToProcess.forEach(file => {
      const validation = validateImage(file, currentImageCount);
      
      if (!validation.valid) {
        alert(validation.error);
        hasErrors = true;
        return;
      }
    });
  
    if (hasErrors) return;
  
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = event.target.result;
        saveNotes({
          ...notes[country.id],
          text: notes[country.id]?.text || '',
          images: [...(notes[country.id]?.images || []), newImage]
        });
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = useCallback((indexToRemove) => {
    const updatedImages = notes[country.id]?.images?.filter((_, index) => index !== indexToRemove);
    saveNotes({
      ...notes[country.id],
      images: updatedImages
    });
  }, [country.id, notes, saveNotes]);

  return (
    <div 
      style={{
        position: 'fixed',
        right: '40px',
        top: '40px',
        maxHeight: '80vh',
        width: '380px',
        backgroundColor: '#B5B5D0',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflowY: 'auto',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{country.emoji}</span>
          <h2 style={{ 
            margin: 0,
            fontFamily: FONTS.primary,
            fontSize: FONT_SIZES.heading,
            fontWeight: FONT_WEIGHTS.normal,
            color: 'white'
          }}>{country.name}</h2>
        </div>
        <button 
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: 'white'
          }}
        >✕</button>
      </div>

      {/* Country Info */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px'
      }}>
        {country.flagUrl && (
          <img 
            src={country.flagUrl} 
            alt={`Flag of ${country.name}`}
            style={{ 
              width: '32px',
              height: 'auto',
              borderRadius: '4px'
            }}
          />
        )}
        <div>
          <p style={{ margin: '0', fontFamily: FONTS.secondary, fontSize: FONT_SIZES.medium, color: 'white' }}>
            <strong>Capital:</strong> {country.capital}
          </p>
        </div>
      </div>

      {/* Notes section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Text area */}
        <textarea
          value={notes[country.id]?.text || ''}
          onChange={(e) => saveNotes({
            ...notes[country.id],
            text: e.target.value
          })}
          placeholder="Meta, meta, meta"
          style={{
            width: '90%',
            height: '200px',
            padding: '16px',
            backgroundColor: '#FFE17D',
            border: '2px solid #FF9E7D',
            borderRadius: '8px',
            resize: 'none',
            fontSize: '15px',
            fontFamily: FONTS.secondary,
            lineHeight: '1.5',
            color: '#333',
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'block',
          }}
        />

        {/* Images Gallery */}
        {notes[country.id]?.images?.length > 0 && (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px'
          }}>
            {notes[country.id].images.map((img, index) => (
              <div 
                key={index}
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px'
                }}
              >
                <img 
                  src={img}
                  alt={`Note image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => handleImageClick(e, index)}
                  onMouseDown={(e) => {
                    if (e.button === 1) e.preventDefault();
                  }}
                />
                <button
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#FF9E7D',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontFamily: FONTS.secondary,
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image Overlay */}
        {selectedImage !== null && (
          <ImageOverlay
            image={notes[country.id].images[selectedImage]}
            images={notes[country.id].images}
            currentIndex={selectedImage}
            onClose={() => setSelectedImage(null)}
            comments={notes[country.id]?.imageComments?.[selectedImage] || []}
            onAddComment={(comment) => handleAddComment(selectedImage, comment)}
            countryName={country.name}
            onNavigate={(newIndex) => setSelectedImage(newIndex)}
          />
        )}

        {/* Drop zone and upload section */}
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            padding: '16px',
            border: `2px dashed ${isDragging ? '#FF9E7D' : 'rgba(255, 255, 255, 0.3)'}`,
            borderRadius: '8px',
            backgroundColor: isDragging ? 'rgba(255, 158, 125, 0.1)' : 'rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            type="file"
            accept={SUPPORTED_FORMATS.join(',')}
            onChange={handleImageUpload}
            id="image-upload"
            style={{ display: 'none' }}
            multiple
          />
          <label 
            htmlFor="image-upload"
            style={{
              cursor: 'pointer',
              color: 'white',
              display: 'block'
            }}
          >
            📷 Drop images here or click to upload
            <div style={{ 
              fontSize: '12px',
              fontFamily: FONTS.tertiary,
              color: 'rgba(255,255,255,0.7)',
              marginTop: '4px'
            }}>
              {`${notes[country.id]?.images?.length || 0}/${MAX_IMAGES_PER_COUNTRY} images • `}
              Max size: 5MB • Supported: JPG, PNG, GIF, WEBP
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default NotesPanel;