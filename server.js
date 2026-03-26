require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const prisma = require('./utils/prisma');
const { initScheduler } = require('./cron/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Global Middleware
app.set('trust proxy', 1); // Trust first proxy (e.g. Nginx, Cloudflare)
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"], // Allow Chart.js and DOMPurify
      "connect-src": ["'self'", "https://cdn.jsdelivr.net"], // Allow Chart.js maps
    },
  },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Relax for local IP/HTTP
  hsts: true, // Disable HSTS to prevent ERR_SSL_PROTOCOL_ERROR on local storage/IPs
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo más tarde.' }
});
app.use('/api/', globalLimiter);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 mins for login/register
  message: { error: 'Demasiados intentos de acceso. Espera 15 minutos.' }
});

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // 10 messages per minute
  message: { error: 'Chat muy activo. ¡Tómatelo con calma! 🧘‍♂️' }
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/cravings', require('./routes/cravings'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/chat', chatLimiter, require('./routes/chat'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/smoking', require('./routes/smoking'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/groups', require('./routes/groups'));

// Seed achievements on first run
async function seedAchievements() {
  const count = await prisma.achievement.count();
  if (count === 0) {
    await prisma.achievement.createMany({
      data: [
        { key: 'day_1', name: 'Primer Día', description: '¡Has sobrevivido tu primer día sin fumar!', icon: '🌱', requirement: 1 },
        { key: 'day_3', name: 'Tres Días', description: '3 días limpio. ¡La nicotina ya está saliendo de tu cuerpo!', icon: '💪', requirement: 3 },
        { key: 'week_1', name: 'Una Semana', description: '¡Una semana completa! Tu mente se está aclarando.', icon: '⭐', requirement: 7 },
        { key: 'week_2', name: 'Dos Semanas', description: '14 días. Los patrones de sueño mejoran.', icon: '🌙', requirement: 14 },
        { key: 'month_1', name: 'Un Mes', description: '¡30 días! Tu memoria y concentración mejoran notablemente.', icon: '🏆', requirement: 30 },
        { key: 'month_2', name: 'Dos Meses', description: '60 días de libertad. ¡Eres imparable!', icon: '🔥', requirement: 60 },
        { key: 'month_3', name: 'Tres Meses', description: '90 días. Los receptores cannabinoides se han normalizado.', icon: '🧠', requirement: 90 },
        { key: 'month_6', name: 'Seis Meses', description: 'Medio año limpio. ¡Increíble transformación!', icon: '💎', requirement: 180 },
        { key: 'year_1', name: 'Un Año', description: '¡365 días! Has reconstruido tu vida completamente.', icon: '👑', requirement: 365 },
      ]
    });
    console.log('✅ Achievements seeded');
  }
}

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    error: 'Algo salió mal en el servidor.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');
    await seedAchievements();
    initScheduler();
    app.listen(PORT, () => {
      console.log(`🌿 QuitPetas running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

start();

module.exports = { prisma };
