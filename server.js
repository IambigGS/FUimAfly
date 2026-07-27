import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// Initialize the Google Gen AI client if API key is provided
let ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Google Gen AI client initialized with GEMINI_API_KEY.');
  } catch (e) {
    console.error('Failed to initialize Google Gen AI client:', e);
  }
} else {
  console.warn('GEMINI_API_KEY is not set. Gemini API endpoints will not be available.');
}

// Health check / status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiInitialized: !!ai,
    message: 'Chopstick Fly Catcher Dojo Server is running.',
  });
});

// Server-side Gemini API proxy endpoint
app.post('/api/gemini', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'Gemini API client is not initialized (missing API key).' });
  }

  const { model, prompt, contents } = req.body;

  try {
    const targetModel = model || 'gemini-2.5-flash';
    let response;

    if (contents) {
      response = await ai.models.generateContent({
        model: targetModel,
        contents: contents,
      });
    } else if (prompt) {
      response = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
      });
    } else {
      return res.status(400).json({ error: 'Either prompt or contents must be provided.' });
    }

    res.json(response);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: error.message || 'Error communicating with Gemini API' });
  }
});

// Serve static assets from Vite's production build directory 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all requests to index.html for Single Page App routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
