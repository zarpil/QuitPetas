const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/achievements
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    // Recalcular streak
    const allCheckins = await prisma.checkIn.findMany({ where: { userId: req.userId } });
    const allSmokingLogs = await prisma.smokingLog.findMany({ where: { userId: req.userId } });
    const { calculateStreak } = require('../utils/streak');
    const streak = calculateStreak(user, allCheckins, allSmokingLogs);

    const allAchievements = await prisma.achievement.findMany({
      orderBy: { requirement: 'asc' },
      include: {
        users: {
          where: { userId: req.userId },
          select: { unlockedAt: true }
        }
      }
    });

    const result = allAchievements.map(ach => ({
      id: ach.id,
      key: ach.key,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      requirement: ach.requirement,
      unlocked: ach.users.length > 0,
      unlockedAt: ach.users.length > 0 ? ach.users[0].unlockedAt : null,
      progress: Math.min(100, Math.max(0, Math.round((streak / ach.requirement) * 100))),
    }));

    res.json(result);
  } catch (err) {
    console.error('Achievements error:', err);
    res.status(500).json({ error: 'Error al obtener logros' });
  }
});

module.exports = router;
