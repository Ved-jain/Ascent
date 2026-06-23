import mongoose from 'mongoose';

// Schema to store Codeforces user data cached for 30 minutes.
// This reduces external API calls, bypasses strict rate limits, and improves response time.
const cfCacheSchema = new mongoose.Schema({
  // Lowercase normalized handle for easy case-insensitive lookups
  handle: { type: String, required: true, unique: true, lowercase: true },
  
  // Raw user.info response payload
  userInfo: { type: Object },
  
  // Raw user.status response payload (last 10000 submissions)
  submissions: { type: Array },
  
  // Raw user.rating response payload
  ratingHistory: { type: Array },
  
  // Precalculated struggles from our analysis utility
  struggles: {
    struggled: { type: Array, default: [] },
    abandoned: { type: Array, default: [] },
    weakTags: { type: Array, default: [] },
  },
  
  // Expiration reference to handle cache eviction manually or using cron
  cachedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('CFCache', cfCacheSchema);
