import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

/**
 * POST /api/ai/coach
 * Expects { profileData, struggles } in body.
 */
router.post('/coach', async (req, res) => {
  const { profileData, struggles } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in the server .env file.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are an expert, slightly sarcastic, but ultimately encouraging competitive programming coach.
I am a Codeforces user named ${profileData?.handle || 'Unknown'}.
My current rating is ${profileData?.rating || 'Unrated'}, max rating ${profileData?.maxRating || 'Unrated'}, rank ${profileData?.rank || 'Newbie'}.
I have solved ${profileData?.problemsSolved || 0} problems.

Here are my weak topics:
${(struggles?.weakTags || []).map(t => `- ${t.tag} (Error rate: ${t.errorRate}%)`).join('\n')}

Here are problems I abandoned:
${(struggles?.abandoned || []).slice(0, 5).map(p => `- ${p.problemId}: ${p.name} (Failed ${p.failCount} times)`).join('\n')}

Give me a short, punchy "roast" of my recent performance, then give me 2 concrete, actionable steps to reach my next rank. Format your response in markdown. Don't be too long.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ analysis: responseText });
  } catch (err) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: 'Failed to generate AI analysis.' });
  }
});

/**
 * POST /api/ai/rivalry
 * Expects { myProfileData, friendProfileData, myStruggles, friendStruggles } in body.
 */
router.post('/rivalry', async (req, res) => {
  const { myProfileData, friendProfileData, myStruggles, friendStruggles } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in the server .env file.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are an energetic e-sports shoutcaster and analyst for competitive programming.
You are analyzing a rivalry between two coders:
1. ${myProfileData?.handle || 'Player 1'} (Rating: ${myProfileData?.rating}, Rank: ${myProfileData?.rank})
2. ${friendProfileData?.handle || 'Player 2'} (Rating: ${friendProfileData?.rating}, Rank: ${friendProfileData?.rank})

${myProfileData?.handle}'s Weak Topics: ${(myStruggles?.weakTags || []).map(t => t.tag).join(', ') || 'None'}
${friendProfileData?.handle}'s Weak Topics: ${(friendStruggles?.weakTags || []).map(t => t.tag).join(', ') || 'None'}

Write a short, hype-filled "Tale of the Tape" analysis comparing their profiles. Give them fun titles (e.g. "The Speedy Pupil", "The DP Master"), point out who has the edge, and declare a predicted winner if they went head-to-head in a Codeforces Div 2 round right now. Format in markdown.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ analysis: responseText });
  } catch (err) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: 'Failed to generate AI analysis.' });
  }
});

export default router;
