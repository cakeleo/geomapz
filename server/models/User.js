// server/models/User.js
import mongoose from 'mongoose';

const NoteImageSchema = new mongoose.Schema({
  cloudinaryId: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  addedAt: {
    type: Date,
    default: Date.now
  },
  comments: [{
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

const CountryNoteSchema = new mongoose.Schema({
  countryCode: {
    type: String,
    required: true
  },
  text: String,
  images: [NoteImageSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true
  },
  notes: [CountryNoteSchema],
  preferences: {
    showAllCountries: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
});

// Middleware to update lastUpdated
CountryNoteSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export const User = mongoose.model('User', UserSchema);

// server/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;

// server/controllers/notesController.js
import { User } from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

export const saveNote = async (req, res) => {
  try {
    const { countryCode, text, image } = req.body;
    const userId = req.user.id;

    let imageData = null;
    if (image) {
      // Upload image to Cloudinary
      const result = await cloudinary.uploader.upload(image, {
        folder: `geoguessr-notes/${userId}`,
        transformation: [
          // Create a thumbnail version
          { width: 200, height: 200, crop: "fill", quality: "auto" }
        ]
      });

      imageData = {
        cloudinaryId: result.public_id,
        url: result.secure_url,
        thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill/')
      };
    }

    // Find user and update/create note
    const user = await User.findById(userId);
    const noteIndex = user.notes.findIndex(note => note.countryCode === countryCode);

    if (noteIndex > -1) {
      // Update existing note
      if (text) user.notes[noteIndex].text = text;
      if (imageData) user.notes[noteIndex].images.push(imageData);
    } else {
      // Create new note
      user.notes.push({
        countryCode,
        text,
        images: imageData ? [imageData] : []
      });
    }

    await user.save();
    res.json({ success: true, note: user.notes.find(note => note.countryCode === countryCode) });

  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { countryCode, imageId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const note = user.notes.find(note => note.countryCode === countryCode);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const image = note.images.find(img => img.cloudinaryId === imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(image.cloudinaryId);

    // Remove from database
    note.images = note.images.filter(img => img.cloudinaryId !== imageId);
    await user.save();

    res.json({ success: true });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};