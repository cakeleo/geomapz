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

CountryNoteSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export const User = mongoose.model('User', UserSchema);
