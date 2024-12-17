import React, { useState, useCallback, useEffect } from 'react';
import ImageOverlay from './ImageOverlay';
import { FONTS, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';
import { getApiUrl } from '../config/api';

const NotesPanel = ({ country, notes, onNotesChange, onClose }) => {
  if (!country) return null;

  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_IMAGES_PER_COUNTRY = 10;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Fixed: Added missing slash in API path
    fetch(getApiUrl(`/api/notes/${country.id}`), {  // Changed from notes${country.id}
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          // Note: You'll need to pass setUser as a prop if you want to clear the user state
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data?.notes) {
          onNotesChange(data.notes);
        }
      })
      .catch(err => console.error('Error loading notes:', err));
  }, [country.id]);
  
  const saveNotes = useCallback(async (noteData) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(getApiUrl(`/notes/${country.id}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: noteData })
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          return;
        }
        throw new Error(`Failed to save notes: ${response.status}`);
      }

      const data = await response.json();
      if (data?.success) {
        onNotesChange(noteData);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }, [country.id, onNotesChange]);
  
  const uploadImage = async (file) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
  
    const formData = new FormData();
    formData.append('image', file);
    formData.append('countryId', country.id);
  
    try {
      // Now using /api/upload/image path
      const uploadUrl = getApiUrl('/api/upload/image');
      console.log('Attempting upload to:', uploadUrl);
  
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'  // Important for cookie-based auth
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(errorText || `Upload failed with status ${response.status}`);
      }
  
      const data = await response.json();
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }
  
      return data.imageUrl;
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  };
          
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

  const handleImageUpload = async (e) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to upload images');
      return;
    }
  
    const files = Array.from(e.target.files);
    const currentImageCount = notes[country.id]?.images?.length || 0;
    const remainingSlots = MAX_IMAGES_PER_COUNTRY - currentImageCount;
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_IMAGES_PER_COUNTRY} images allowed per country`);
      return;
    }
  
    const filesToProcess = files.slice(0, remainingSlots);
    setIsUploading(true);
  
    try {
      for (const file of filesToProcess) {
        const validation = validateImage(file, currentImageCount);
        if (!validation.valid) {
          alert(validation.error);
          continue;
        }
  
        try {
          const imageUrl = await uploadImage(file);
          if (!imageUrl) {
            throw new Error('Failed to get image URL from server');
          }
          
          const updatedNotes = {
            ...notes[country.id],
            text: notes[country.id]?.text || '',
            images: [...(notes[country.id]?.images || []), imageUrl]
          };
  
          // Save notes with new image
          await saveNotes(updatedNotes);
          
        } catch (error) {
          if (error.message.includes('401')) {
            alert('Your session has expired. Please log in again.');
            return;
          }
          throw error;
        }
      }
    } catch (error) {
      alert('Error uploading image: ' + error.message);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
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

  const handleDrop = async (e) => {
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
    setIsUploading(true);

    try {
      for (const file of filesToProcess) {
        const validation = validateImage(file, currentImageCount);
        if (!validation.valid) {
          alert(validation.error);
          continue;
        }

        const imageUrl = await uploadImage(file);
        
        const updatedNotes = {
          ...notes[country.id],
          text: notes[country.id]?.text || '',
          images: [...(notes[country.id]?.images || []), imageUrl]
        };
        
        onNotesChange(updatedNotes);
      }
    } catch (error) {
      alert('Error uploading image. Please try again.');
      console.error('Drop error:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const fetchCountryNotes = async (countryId) => {
    try {
      const response = await fetch(getApiUrl(`/api/notes/${countryId}`), {
        credentials: 'include'
      });
  
      if (response.status === 401) {
        // Handle unauthorized - maybe redirect to login
        return;
      }
  
      if (response.ok) {
        const data = await response.json();
        onNotesChange(data.notes);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };
    

  const removeImage = useCallback(async (indexToRemove) => {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    try {
      const imageUrl = notes[country.id]?.images[indexToRemove];
      if (!imageUrl) return;
  
      // Fixed: Added missing slash in API path
      const response = await fetch(getApiUrl(`/api/notes/${country.id}/${indexToRemove}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (response.status === 401) {
        localStorage.removeItem('token');
        return;
      }
  
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
  
      const updatedImages = notes[country.id]?.images?.filter((_, index) => index !== indexToRemove);
      const updatedNotes = {
        ...notes[country.id],
        images: updatedImages
      };
      onNotesChange(updatedNotes);
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Failed to remove image. Please try again.');
    }
  }, [country.id, notes, onNotesChange]);
  
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
            borderRadius: '8px',
            position: 'relative'
          }}>
            {notes[country.id].images.map((imageUrl, index) => (
              <div 
                key={index}
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px'
                }}
              >
                <img 
                  src={imageUrl}
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
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {isUploading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}>
                Uploading...
              </div>
            )}
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