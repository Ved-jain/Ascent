import express from 'express';
import { fetchUserRating } from '../utils/fetchCF.js';
import { validateHandleParam } from '../middleware/validate.js';

const router = express.Router();
router.param('handle', validateHandleParam);

/**
 * GET /api/predict/:handle
 * Predicts the user's next Codeforces rating using Weighted Moving Average and Simple Linear Regression.
 * Does not use any ML libraries (pure math implementation).
 */
router.get('/:handle', async (req, res) => {
  const handle = req.params.handle.trim().toLowerCase();

  if (!handle) {
    return res.status(400).json({ error: 'Handle parameter is required' });
  }

  try {
    // 1. Fetch rating history from Codeforces (this utilizes our Redis cache internally)
    const ratingHistory = await fetchUserRating(handle);

    // If user has less than 2 contests, prediction is not mathematically meaningful
    if (!ratingHistory || ratingHistory.length < 2) {
      return res.status(400).json({ 
        error: 'Not enough contest history to generate a prediction. Minimum 2 contests required.' 
      });
    }

    const ratings = ratingHistory.map(c => c.newRating);
    const n = ratings.length;

    // =========================================================================
    // 2. Weighted Moving Average (WMA)
    // Formula: sum(rating_i * weight_i) / sum(weight_i)
    // Why: Simple Moving Average treats all past contests equally. WMA gives 
    // higher weight to recent contests to better reflect current skill level.
    // We use a linear weight (i), so the oldest contest has weight 1, and the newest has weight n.
    // =========================================================================
    let wmaSum = 0;
    let weightSum = 0;
    for (let i = 0; i < n; i++) {
      const weight = i + 1; // 1-based index for weight
      wmaSum += ratings[i] * weight;
      weightSum += weight;
    }
    const wmaPrediction = wmaSum / weightSum;

    // =========================================================================
    // 3. Simple Linear Regression
    // Formula: y = mx + b
    // where x = contest index (1 to n), y = rating
    // m = (n*Σ(xy) - Σx*Σy) / (n*Σ(x^2) - (Σx)^2)
    // b = (Σy - m*Σx) / n
    // Why: Regression finds the mathematical line of best fit through the rating history.
    // It captures the long-term upward or downward trend across all time.
    // =========================================================================
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i + 1; // 1-based index (x-axis)
      const y = ratings[i]; // Rating (y-axis)
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const denominator = (n * sumX2) - (sumX * sumX);
    let slopeM = 0;
    if (denominator !== 0) {
      slopeM = ((n * sumXY) - (sumX * sumY)) / denominator;
    }
    const interceptB = (sumY - slopeM * sumX) / n;

    // Predict the rating for the next contest (x = n + 1)
    const regressionPrediction = (slopeM * (n + 1)) + interceptB;

    // =========================================================================
    // 4. Calculate Final Prediction & Confidence Interval (Standard Error)
    // =========================================================================
    // We blend the WMA (current skill indicator) and Regression (long-term trend).
    // Giving 70% weight to WMA because recent performance is usually a better 
    // indicator of immediate next performance than long-term trend lines.
    const blendedPrediction = Math.round((wmaPrediction * 0.7) + (regressionPrediction * 0.3));

    // Standard Error of the Estimate formula: sqrt( sum(y - y_pred)^2 / (n - 2) )
    // Why: It measures the accuracy of predictions, providing a realistic ± confidence range.
    let sumSquaredErrors = 0;
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const actualY = ratings[i];
      const predictedY = (slopeM * x) + interceptB;
      sumSquaredErrors += Math.pow(actualY - predictedY, 2);
    }
    
    // Confidence range (margin of error)
    // If n=2, denominator n-2 is 0, so we default to a standard ± 50.
    const standardError = n > 2 ? Math.sqrt(sumSquaredErrors / (n - 2)) : 50;
    const confidenceRange = Math.round(standardError);

    // Trend Direction based on Regression slope
    let trend = 'Stagnant';
    if (slopeM > 1.5) trend = 'Strong Upward';
    else if (slopeM > 0.5) trend = 'Upward';
    else if (slopeM < -1.5) trend = 'Strong Downward';
    else if (slopeM < -0.5) trend = 'Downward';

    // Format final response
    res.json({
      predictedRating: blendedPrediction,
      confidenceRange,
      trend,
      slope: slopeM.toFixed(2),
      message: `Predicted based on purely mathematical WMA and Linear Regression across ${n} past contests.`
    });

  } catch (error) {
    console.error('Error generating prediction:', error);
    res.status(500).json({ error: 'Failed to generate contest prediction.' });
  }
});

export default router;
