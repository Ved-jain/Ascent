import { useState } from 'react';
import api from '../api/client.js';
import './NotesModal.css';

/**
 * Modal dialog for writing and saving a text note.
 * 
 * @param {object} props
 * @param {function} props.onClose - Callback triggered to close the modal
 * @param {function} props.onNoteAdded - Callback triggered after note is successfully saved
 */
export default function NotesModal({ onClose, onNoteAdded }) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Note text cannot be empty.');
      return;
    }
    
    setIsSaving(true);
    setError('');

    try {
      await api.addNote(text.trim());
      if (onNoteAdded) {
        onNoteAdded();
      }
      onClose();
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err.response?.data?.error || 'Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add a Note</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="note-text">What are you thinking about today?</label>
            <textarea
              id="note-text"
              className="form-input note-textarea"
              rows="6"
              placeholder="Write your reflections, struggle strategies, or notes here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSaving}
              maxLength={2000}
            />
          </div>

          {error && <div className="error-msg" style={{ marginBottom: '16px' }}>{error}</div>}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
