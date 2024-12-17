import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js';

const uploadRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

uploadRouter.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `geomap/${req.user._id}`,
      resource_type: 'auto'
    });
    
    res.json({ 
      success: true, 
      imageUrl: result.secure_url 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

uploadRouter.delete('/:countryId/:imageIndex', auth, async (req, res) => {
  try {
    const { countryId, imageIndex } = req.params;
    // Implementation for deleting from Cloudinary and updating database
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default uploadRouter;

