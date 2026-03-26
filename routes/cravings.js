const express = require('express');
const prisma = require('../utils/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/cravings
router.get('/', auth, async (req, res) => {
  try {
    const cravings = await prisma.craving.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(cravings);
  } catch (err) {
    console.error('Cravings get error:', err);
    res.status(500).json({ error: 'Error al obtener cravings' });
  }
});

// POST /api/cravings
router.post('/', auth, async (req, res) => {
  try {
    const { intensity, trigger, strategy, resisted } = req.body;

    if (!intensity || intensity < 1 || intensity > 10) {
      return res.status(400).json({ error: 'Intensidad debe ser entre 1 y 10' });
    }

    const craving = await prisma.craving.create({
      data: {
        userId: req.userId,
        intensity,
        trigger: trigger || null,
        strategy: strategy || null,
        resisted: resisted !== undefined ? resisted : true,
      }
    });

    if (resisted === false) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      await prisma.smokingLog.create({
        data: {
          userId: req.userId,
          grams: user?.gramsPerJoint || 0,
          situation: 'Craving no resistido: ' + (trigger || 'Sin especificar'),
          note: strategy || null,
        }
      });
      // Castigo por recaída: Borrar logros
      await prisma.userAchievement.deleteMany({
        where: { userId: req.userId }
      });
    }

    res.status(201).json(craving);
  } catch (err) {
    console.error('Craving create error:', err);
    res.status(500).json({ error: 'Error al registrar craving' });
  }
});

// GET /api/cravings/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const total = await prisma.craving.count({ where: { userId: req.userId } });
    const resisted = await prisma.craving.count({ where: { userId: req.userId, resisted: true } });
    const avgIntensity = await prisma.craving.aggregate({
      where: { userId: req.userId },
      _avg: { intensity: true }
    });

    // Triggers más comunes
    const triggers = await prisma.craving.groupBy({
      by: ['trigger'],
      where: { userId: req.userId, trigger: { not: null } },
      _count: true,
      orderBy: { _count: { trigger: 'desc' } },
      take: 5,
    });

    res.json({
      total,
      resisted,
      successRate: total > 0 ? Math.round((resisted / total) * 100) : 100,
      avgIntensity: avgIntensity._avg.intensity ? avgIntensity._avg.intensity.toFixed(1) : 0,
      topTriggers: triggers.map(t => ({ trigger: t.trigger, count: t._count })),
    });
  } catch (err) {
    console.error('Craving stats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
