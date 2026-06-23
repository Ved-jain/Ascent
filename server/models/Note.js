import mongoose from 'mongoose';

// Schema for user's journal entries/notes.
// Keeps track of thoughts, struggles, or insights over time.
const noteSchema = new mongoose.Schema({
  // Reference to the logged-in User
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // The note text content, trimmed and capped at 2000 characters
  text: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

// Index for query optimization when getting notes for a specific user sorted by newest first
noteSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Note', noteSchema);
