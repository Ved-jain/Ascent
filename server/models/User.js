// ─────────────────────────────────────────────────────────
//  models/User.js  —  User Mongoose Model
//
//  A Mongoose model is a blueprint for a document in MongoDB.
//  Think of it like defining columns in a SQL table, but for
//  a document (JSON-like object) in a collection.
//
//  This model tells Mongoose:
//    - What fields a user document has
//    - What types those fields are
//    - Which fields are required or unique
// ─────────────────────────────────────────────────────────

import mongoose from 'mongoose';

// Schema = the shape/structure of a document
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,   // cannot be empty
      unique: true,     // no two users can have the same username
      trim: true,       // removes accidental spaces around the value
      minlength: 3,
      maxlength: 30,
    },

    passwordHash: {
      type: String,
      required: true,   // always stored as a bcrypt hash, never plain text
    },

    codeforcesHandle: {
      type: String,
      default: '',      // optional — can be added later from profile settings
      trim: true,
    },

    cfHandle: {
      type: String,
      default: '',      // CF username
      trim: true,
    },

    friends: {
      type: [String],   // array of CF handles
      default: [],
    },

    startDate: {
      type: Date,
      default: Date.now, // when the user starts their Ascent journey
    },
  },
  {
    // Mongoose automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Pre-save hook to synchronize cfHandle and codeforcesHandle
userSchema.pre('save', function() {
  if (this.codeforcesHandle && !this.cfHandle) {
    this.cfHandle = this.codeforcesHandle;
  } else if (this.cfHandle && !this.codeforcesHandle) {
    this.codeforcesHandle = this.cfHandle;
  }
});

// Model = the actual class we use to create/query documents
// First arg = collection name in MongoDB (will be "users")
const User = mongoose.model('User', userSchema);

export default User;
