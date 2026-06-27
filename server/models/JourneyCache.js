import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  rating: Number,
  problemsSolved: Number,
  contestsGiven: Number,
  journeyDay: Number,
  calendarDate: Date
}, { _id: false });

const journeyCacheSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true, index: true },
  startDate: { type: Date, required: true },
  // Map strings (day numbers) to snapshot data
  snapshots: {
    type: Map,
    of: snapshotSchema,
    default: {}
  },
  // Full timeline array for charting
  timeline: {
    type: [Object],
    default: []
  },
  lastUpdated: { type: Date, default: Date.now }
});

const JourneyCache = mongoose.model('JourneyCache', journeyCacheSchema);
export default JourneyCache;
