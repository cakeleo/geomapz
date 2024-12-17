import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Handle preflight requests for upload endpoint
router.options('/api/upload', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).send();
});

router.post('/api/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Convert buffer to base64 for Cloudinary
    const base64Image = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `geomap/${req.user._id}`,
      resource_type: 'auto'
    });

    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    
    res.json({ 
      success: true, 
      imageUrl: result.secure_url 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Handle preflight requests for delete endpoint
router.options('/api/upload/:countryId/:imageIndex', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).send();
});

router.delete('/api/upload/:countryId/:imageIndex', auth, async (req, res) => {
  try {
    const { countryId, imageIndex } = req.params;
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    
    // Here you would delete from Cloudinary and update your database
    // For now, just return success
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;