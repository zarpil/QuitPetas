const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const router = express.Router();

// POST /api/auth/register — solo email + password
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        onboarded: false,
      }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        onboarded: user.onboarded,
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Error al registrarse' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboarded: user.onboarded,
        quitDate: user.quitDate,
        substanceType: user.substanceType,
        dailyJoints: user.dailyJoints,
        pricePerGram: user.pricePerGram,
        gramsPerJoint: user.gramsPerJoint,
        monthlySpend: user.monthlySpend,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, name: true, onboarded: true,
        quitDate: true, substanceType: true, dailyJoints: true,
        gramsPerJoint: true, pricePerGram: true, monthlySpend: true,
        yearsSmoked: true, smokeAlone: true, smokeTrigger: true,
        motivation: true, previousAttempts: true, tobaccoMix: true,
        age: true, createdAt: true,
        planType: true, previousRelapseCause: true,
      }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    console.log('DEBUG [AuthMe]:', { id: user.id, email: user.email, plan: user.planType });
    res.json(user);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

module.exports = router;
