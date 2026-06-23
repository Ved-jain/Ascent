import express from 'express';
import Note from '../models/Note.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notes
 * Retrieves all notes for the authenticated user, sorted newest first.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    return res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve notes.' });
  }
});

/**
 * POST /api/notes
 * Creates a new note for the authenticated user.
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Note text cannot be empty.' });
    }

    if (text.length > 2000) {
      return res.status(400).json({ error: 'Note text cannot exceed 2000 characters.' });
    }

    const note = await Note.create({
      userId: req.user.id,
      text: text.trim()
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error.message);
    return res.status(500).json({ error: 'Failed to save note.' });
  }
});

export default router;
