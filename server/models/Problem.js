import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────
//  models/Problem.js  —  Problem Mongoose Model
//
//  Stores global Codeforces problems to calculate tag-based 
//  recommendations without needing to fetch the 100MB+ global
//  problemset into memory every time.
// ─────────────────────────────────────────────────────────

const problemSchema = new mongoose.Schema(
  {
    problemId: {
      type: String,
      required: true,
      unique: true,     // e.g. "1553A"
      index: true       // fast lookups
    },
    name: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],   // array of topic tags (e.g., ["dp", "greedy"])
      default: []
    },
    rating: {
      type: Number,
      default: 0        // problem difficulty rating (e.g. 800, 1500)
    },
    solveCount: {
      type: Number,
      default: 0        // how many users solved this globally (indicates standardness)
    }
  },
  {
    timestamps: true,
  }
);

const Problem = mongoose.model('Problem', problemSchema);

export default Problem;
