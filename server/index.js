import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import chatRoutes from './routes/chat.js';
import ticketRoutes from './routes/tickets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for embeddable widget cross-origin requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(rootDir, 'public')));
app.use('/public', express.static(path.join(rootDir, 'public')));
app.use('/widget', express.static(path.join(rootDir, 'widget')));

// Direct route for widget.js at root /widget.js
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(rootDir, 'widget', 'widget.js'));
});

// Direct route for homepage and legacy demo page paths
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get(['/demo', '/demo.html'], (req, res) => {
  res.sendFile(path.join(rootDir, 'widget', 'demo.html'));
});

// Direct route for admin dashboard at /admin and /admin.html
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'admin.html'));
});

// API Routes
app.use('/api', chatRoutes);
app.use('/api', ticketRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
      supabase: !!process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http'),
      discord: !!process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.startsWith('http')
    }
  });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Helix Support Server running at http://localhost:${PORT}`);
  console.log(`💬 Chat Widget Demo:  http://localhost:${PORT}/`);
  console.log(`🛡️  Admin Dashboard:   http://localhost:${PORT}/admin`);
  console.log(`📦 Embeddable Script: http://localhost:${PORT}/widget.js`);
  console.log('====================================================');
});
