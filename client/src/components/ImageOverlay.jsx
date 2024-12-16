import React, { useState, useEffect } from 'react';
import { FONTS, FONT_SIZES } from '../utils/theme';


const ImageOverlay = ({ 
  image,
  images, // Add this prop to access all images
  currentIndex, // Rename from index to currentIndex for clarity
  onClose, 
  comments = [], 
  onAddComment,
  countryName,
  onNavigate // New prop for handling navigation
}) => {
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(true);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    const handleKeyNav = (e) => {
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleEsc);
    window.addEventListener('keydown', handleKeyNav);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('keydown', handleKeyNav);
    };
  }, [onClose, currentIndex, images.length, onNavigate]);

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          fontFamily: FONTS.secondary,
          cursor: 'pointer',
          zIndex: 2001,
        }}
      >
        ✕
      </button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            fontFamily: FONTS.secondary,
            cursor: 'pointer',
            padding: '20px',
            zIndex: 2001,
          }}
        >
          ←
        </button>
      )}
      
      {currentIndex < images.length - 1 && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            fontFamily: FONTS.secondary,
            cursor: 'pointer',
            padding: '20px',
            zIndex: 2001,
          }}
        >
          →
        </button>
      )}

      {/* Main content container */}
      <div style={{
        display: 'flex',
        maxWidth: '90vw',
        maxHeight: '90vh',
        position: 'relative',
        gap: '20px',
      }}>
        {/* Image wrapper */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'transparent',
          height: 'fit-content',
        }}>
          <img
            src={image}
            alt={`${countryName} photo ${currentIndex + 1}`}
            style={{
              maxHeight: '90vh',
              maxWidth: '70vw',
              objectFit: 'contain',
              background: 'transparent',
              display: 'block',
            }}
          />
        </div>

        {/* Comments section - always visible now */}
        <div style={{
  width: '300px',
  backgroundColor: '#1f1f1f',
  padding: '20px',
  overflowY: 'auto',
  maxHeight: '90vh',
  borderRadius: '8px',
}}>
  <h3 style={{ 
    color: 'white', 
    marginTop: 0,
    textAlign: 'center' // Center the Comments title
  }}>Comments</h3>
  
  {/* Comments list */}
  <div style={{ 
    marginBottom: '20px',
    width: '90%',     // Make narrower than container
    margin: '0 auto'  // Center in container
  }}>
    {comments.length === 0 ? (
      <p style={{ 
        color: '#888',
        textAlign: 'center' // Center the "No comments" text
      }}>No comments yet</p>
    ) : (
      comments.map((comment, i) => (
        <div 
          key={i} 
          style={{
            backgroundColor: '#2f2f2f',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '10px',
            color: 'white',
          }}
        >
          <p style={{ margin: '0' }}>{comment}</p>
          <small style={{ color: '#888' }}>
            {new Date().toLocaleDateString()}
          </small>
        </div>
      ))
    )}
  </div>

  {/* Comment form - centered with proper width */}
  <form 
    onSubmit={handleSubmitComment}
    style={{
      width: '90%',
      margin: '0 auto'  // Center the form
    }}
  >
    <textarea
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
      placeholder="Add a comment..."
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: '#2f2f2f',
        border: '1px solid #444',
        borderRadius: '4px',
        color: 'white',
        resize: 'vertical',
        minHeight: '80px',
        marginBottom: '10px', // Add spacing between textarea and button
        fontFamily: FONTS.secondary,
    }}
    />
    <button
      type="submit"
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: '#4f4f4f',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        marginTop: '10px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        ':hover': {  // Add hover effect
          backgroundColor: '#5f5f5f'
        }
      }}
    >
      Add Comment
    </button>
  </form>
</div>
      </div>
    </div>
  );
};

export default ImageOverlay;