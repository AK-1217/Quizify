const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve ank.html and other static files

// Database setup - Initialize with default data
const adapter = new JSONFile(path.join(__dirname, 'db.json'));
const db = new Low(adapter, { leaderboard: [] });

// API Routes

// GET /api/leaderboard - Get all scores (all-time)
app.get('/api/leaderboard', async (req, res) => {
  try {
    await db.read();
    res.json(db.data?.leaderboard || []);
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/leaderboard/today - Get today's scores
app.get('/api/leaderboard/today', async (req, res) => {
  try {
    await db.read();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStart = now.getTime();
    const todayScores = (db.data?.leaderboard || []).filter(
      score => score.date >= todayStart
    );
    res.json(todayScores);
  } catch (error) {
    console.error('Error reading today leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch today leaderboard' });
  }
});

// POST /api/leaderboard - Save new score
app.post('/api/leaderboard', async (req, res) => {
  try {
    const { name, score, correct, total, avatar } = req.body;
    
    if (!name || typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score data' });
    }

    await db.read();
    
    // Add new score
    db.data.leaderboard.push({
      name: name.trim().substring(0, 20), // Sanitize
      score: Math.floor(score),
      correct,
      total,
      date: Date.now(),
      avatar: avatar || ''
    });

    // Sort by score desc, keep top 50
    db.data.leaderboard.sort((a, b) => b.score - a.score);
    db.data.leaderboard = db.data.leaderboard.slice(0, 50);

    // Write to file
    await db.write();

    res.json({ success: true, message: 'Score saved!' });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// DELETE /api/leaderboard - Clear all scores (for testing)
app.delete('/api/leaderboard', async (req, res) => {
  try {
    await db.read();
    db.data.leaderboard = [];
    await db.write();
    res.json({ success: true, message: 'Leaderboard cleared' });
  } catch (error) {
    console.error('Error clearing leaderboard:', error);
    res.status(500).json({ error: 'Failed to clear leaderboard' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📊 Leaderboard API ready`);
  console.log(`🌐 Frontend at http://localhost:${port}/ank.html`);
});

