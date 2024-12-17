import express from 'express';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';

const notesRouter = express.Router();

notesRouter.get('/:countryId', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notes = user.notes.get(req.params.countryId) || {};
    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

notesRouter.post('/:countryId', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.notes.set(req.params.countryId, req.body.notes);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

export default notesRouter;

