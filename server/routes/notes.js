import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';
import rateLimit from 'express-rate-limit';

const uploadRouter = express.Router();

// Rate limiting for uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // limit each IP to 30 uploads per hour
  message: { error: 'Upload limit reached, please try again later' }
});

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    
    // Allow specific image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Allowed types: JPG, PNG, GIF, WEBP'));
      return;
    }
    
    cb(null, true);
  }
});

// Error handler for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }
    return res.status(400).json({ error: error.message });
  }
  next(error);
};

// Upload endpoint
uploadRouter.post('/', authMiddleware, uploadLimiter, upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user has reached image limit for the country
    const { countryId } = req.body;
    if (!countryId) {
      return res.status(400).json({ error: 'Country ID is required' });
    }

    const user = await User.findById(req.user._id);
    const countryNotes = user.notes.get(countryId) || {};
    const currentImages = countryNotes.images || [];

    if (currentImages.length >= 10) {
      return res.status(400).json({ error: 'Maximum number of images (10) reached for this country' });
    }

    // Convert file to base64
    const base64Image = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

    // Upload to Cloudinary with retry logic
    let result;
    try {
      result = await cloudinary.uploader.upload(dataURI, {
        folder: `geomap/${req.user._id}/${countryId}`,
        resource_type: 'auto',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Limit maximum dimensions
          { quality: 'auto:good' } // Optimize quality
        ]
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Update user's notes with new image
    currentImages.push({
      cloudinaryId: result.public_id,
      url: result.secure_url,
      thumbnailUrl: cloudinary.url(result.public_id, {
        width: 200,
        height: 200,
        crop: 'fill'
      })
    });

    countryNotes.images = currentImages;
    user.notes.set(countryId, countryNotes);
    await user.save();

    res.json({ 
      success: true, 
      imageUrl: result.secure_url,
      thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill/')
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete image endpoint
uploadRouter.delete('/:countryId/:imageIndex', authMiddleware, async (req, res) => {
  try {
    const { countryId, imageIndex } = req.params;
    const index = parseInt(imageIndex, 10);

    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    const user = await User.findById(req.user._id);
    const countryNotes = user.notes.get(countryId);

    if (!countryNotes || !countryNotes.images || !countryNotes.images[index]) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from Cloudinary
    const imageToDelete = countryNotes.images[index];
    try {
      await cloudinary.uploader.destroy(imageToDelete.cloudinaryId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      // Continue with database update even if Cloudinary delete fails
    }

    // Update database
    countryNotes.images.splice(index, 1);
    user.notes.set(countryId, countryNotes);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default uploadRouter;