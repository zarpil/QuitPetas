const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/smoking — historial de consumo
router.get('/', auth, async (req, res) => {
  try {
    const logs = await prisma.smokingLog.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) {
    console.error('Smoking log get error:', err);
    res.status(500).json({ error: 'Error al obtener registros' });
  }
});

// POST /api/smoking — registrar una peta
router.post('/', auth, async (req, res) => {
  try {
    const { grams, substance, situation, mood, note } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    
    // Si no se pasan gramos, usamos los que el usuario configuró en el onboarding
    const logGrams = grams ? parseFloat(grams) : (user?.gramsPerJoint || 0);

    const log = await prisma.smokingLog.create({
      data: {
        userId: req.userId,
        grams: logGrams,
        substance: substance || null,
        situation: situation || null,
        mood: mood ? parseInt(mood) : null,
        note: note || null,
      }
    });

    // Castigo por recaída: Borrar todos los logros para ganarlos de nuevo
    await prisma.userAchievement.deleteMany({
      where: { userId: req.userId }
    });

    res.status(201).json(log);
  } catch (err) {
    console.error('Smoking log create error:', err);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// GET /api/smoking/stats — estadísticas de consumo
router.get('/stats', auth, async (req, res) => {
  try {
    const total = await prisma.smokingLog.count({ where: { userId: req.userId } });

    // Hoy
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = await prisma.smokingLog.count({
      where: { userId: req.userId, createdAt: { gte: todayStart } }
    });

    // Esta semana
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = await prisma.smokingLog.count({
      where: { userId: req.userId, createdAt: { gte: weekStart } }
    });

    // Gramos totales
    const totalGrams = await prisma.smokingLog.aggregate({
      where: { userId: req.userId },
      _sum: { grams: true }
    });

    // Gasto estimado total
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const pricePerGram = user?.pricePerGram || 0;
    
    // Sumamos los gramos de todos los logs y multiplicamos por el precio del gramo configurado
    const totalSpent = ((totalGrams._sum.grams || 0) * pricePerGram).toFixed(2);

    // Por día de la semana
    const logs = await prisma.smokingLog.findMany({
      where: { userId: req.userId },
      select: { createdAt: true },
    });
    const byDay = [0, 0, 0, 0, 0, 0, 0]; // lun-dom
    logs.forEach(l => {
      const day = new Date(l.createdAt).getDay();
      byDay[day]++;
    });

    res.json({
      total,
      today,
      thisWeek,
      totalGrams: totalGrams._sum.grams || 0,
      totalSpent: parseFloat(totalSpent),
      byDay,
    });
  } catch (err) {
    console.error('Smoking stats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
