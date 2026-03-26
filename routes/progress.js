const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/progress — stats del usuario
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const now = new Date();
    const quitDate = new Date(user.quitDate);
    const diffMs = now - quitDate;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let totalHours = Math.floor(diffMs / (1000 * 60 * 60));

    // // Calcular dinero ahorrado // //
    const dailySpend = user.monthlySpend 
      ? user.monthlySpend / 30 
      : ((user.dailyJoints || 0) * (user.gramsPerJoint || 0.3) * (user.pricePerGram || 0));
    const theoreticalMoneySpent = dailySpend * Math.max(1, totalDays);
    
    const allSmokingLogs = await prisma.smokingLog.findMany({ where: { userId: req.userId } });
    const totalGramsSmokedSinceQuit = allSmokingLogs.reduce((sum, log) => sum + (log.grams || 0), 0);
    const actualMoneySpent = totalGramsSmokedSinceQuit * (user.pricePerGram || 0);
    
    const moneySaved = Math.max(0, theoreticalMoneySpent - actualMoneySpent).toFixed(2);

    // // Calcular porros evitados // //
    const theoreticalJoints = user.dailyJoints * Math.max(1, totalDays);
    const allCheckins = await prisma.checkIn.findMany({ where: { userId: req.userId } });
    const actualCheckinsSmoked = allCheckins.filter(c => c.smoked).length;
    const realSmokedCount = Math.max(allSmokingLogs.length, actualCheckinsSmoked);
    const jointsNotSmoked = Math.max(0, theoreticalJoints - realSmokedCount);

    // Calcular Streak Dinámico con el utilidad
    const { calculateStreak } = require('../utils/streak');
    let streak = calculateStreak(user, allCheckins, allSmokingLogs);
    totalHours = totalDays * 24; // Placeholder
    
    // Si ha recaído, calculamos las horas limpias exactas
    const lastCheckin = allCheckins.filter(c => c.smoked).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    const lastSmokingLog = allSmokingLogs.sort((a,b) => b.createdAt - a.createdAt)[0];
    let mostRecentSmokeDate = null;
    if (lastCheckin && lastSmokingLog) {
      mostRecentSmokeDate = new Date(lastCheckin.date) > new Date(lastSmokingLog.createdAt) ? new Date(lastCheckin.date) : new Date(lastSmokingLog.createdAt);
    } else if (lastCheckin) {
      mostRecentSmokeDate = new Date(lastCheckin.date);
    } else if (lastSmokingLog) {
      mostRecentSmokeDate = new Date(lastSmokingLog.createdAt);
    }
    if (mostRecentSmokeDate && streak === 0) {
      const smokeDiff = now - mostRecentSmokeDate;
      totalHours = Math.floor(smokeDiff / (1000 * 60 * 60));
    }

    // Actualizar longestStreak si se ha superado
    const currentLongest = user.longestStreak || 0;
    if (streak > currentLongest) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { longestStreak: streak }
      });
      user.longestStreak = streak;
    }

    // Mejoras de salud basadas en días consecutivos sin fumar cannabis
    const healthImprovements = [];
    if (streak >= 1) healthImprovements.push({ day: 1, title: 'Sin THC activo', description: 'Los efectos psicoactivos han desaparecido', icon: '🧹', achieved: true });
    if (streak >= 3) healthImprovements.push({ day: 3, title: 'Mejor sueño', description: 'El sueño REM empieza a recuperarse', icon: '😴', achieved: true });
    if (streak >= 7) healthImprovements.push({ day: 7, title: 'Apetito normal', description: 'Tu apetito se está regulando', icon: '🍎', achieved: true });
    if (streak >= 14) healthImprovements.push({ day: 14, title: 'Memoria mejorada', description: 'Tu memoria a corto plazo mejora', icon: '🧠', achieved: true });
    if (streak >= 30) healthImprovements.push({ day: 30, title: 'Pulmones limpios', description: 'La capacidad pulmonar mejora significativamente', icon: '🫁', achieved: true });
    if (streak >= 90) healthImprovements.push({ day: 90, title: 'Receptores normalizados', description: 'Los receptores cannabinoides se han normalizado', icon: '✨', achieved: true });

    // Próxima mejora
    const milestones = [1, 3, 7, 14, 30, 90, 180, 365];
    const nextMilestone = milestones.find(m => m > streak) || null;

    // Cravings stats
    const totalCravings = await prisma.craving.count({ where: { userId: req.userId } });
    const resistedCravings = await prisma.craving.count({ where: { userId: req.userId, resisted: true } });

    // Multi-Path Allowance calculation for today
    let allowanceDailyLimit = null;
    let allowanceConsumedToday = 0;
    
    const weeksPassed = Math.floor(totalDays / 7);
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    
    const todayLogs = allSmokingLogs.filter(log => new Date(log.createdAt) >= todayStart);
    const todayCheckins = allCheckins.filter(c => new Date(c.date).getTime() === todayStart.getTime() && c.smoked);

    if (user.planType === 'TAPER_FREQ') {
      allowanceDailyLimit = Math.max(0, (user.dailyJoints || 0) - weeksPassed);
      let jointCount = todayLogs.length;
      if (todayCheckins.length > 0 && jointCount === 0) jointCount = 1; 
      allowanceConsumedToday = jointCount;
    } else if (user.planType === 'TAPER_GRAMS') {
      const perJointLimit = Math.max(0, (user.gramsPerJoint || 0.3) - (0.1 * weeksPassed));
      allowanceDailyLimit = parseFloat((Math.max(1, (user.dailyJoints || 1)) * perJointLimit).toFixed(2));
      allowanceConsumedToday = parseFloat((todayLogs.reduce((sum, l) => sum + (l.grams || user.gramsPerJoint || 0.3), 0)).toFixed(2));
      if (todayCheckins.length > 0 && todayLogs.length === 0) allowanceConsumedToday = perJointLimit;
    }

    console.log('DEBUG [Progress]:', { plan: user.planType, limit: allowanceDailyLimit, consumed: allowanceConsumedToday });

    res.json({
      totalDays,
      totalHours,
      streak,
      moneySaved: parseFloat(moneySaved),
      jointsNotSmoked,
      healthImprovements,
      nextMilestone,
      longestStreak: user.longestStreak || 0,
      totalCravings,
      resistedCravings,
      quitDate: user.quitDate,
      planType: user.planType,
      dailyJoints: user.dailyJoints,
      gramsPerJoint: user.gramsPerJoint,
      allowanceDailyLimit,
      allowanceConsumedToday
    });
  } catch (err) {
    console.error('Progress error:', err);
    res.status(500).json({ error: 'Error al obtener progreso' });
  }
});

// POST /api/progress/checkin — check-in diario
router.post('/checkin', auth, async (req, res) => {
  try {
    const { smoked, mood, note } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkin = await prisma.checkIn.upsert({
      where: {
        userId_date: {
          userId: req.userId,
          date: today,
        }
      },
      update: { smoked: smoked || false, mood, note },
      create: {
        userId: req.userId,
        date: today,
        smoked: smoked || false,
        mood,
        note,
      }
    });

    if (smoked) {
      // Castigo por recaída: Borrar todos los logros para ganarlos de nuevo
      await prisma.userAchievement.deleteMany({
        where: { userId: req.userId }
      });
    }

    // Revisar achievements
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const totalDays = Math.floor((new Date() - new Date(user.quitDate)) / (1000 * 60 * 60 * 24));
    
    // Recalcular streak utilizando la utilidad global
    const allCheckins = await prisma.checkIn.findMany({ where: { userId: req.userId } });
    const allSmokingLogs = await prisma.smokingLog.findMany({ where: { userId: req.userId } });
    const { calculateStreak } = require('../utils/streak');
    let streak = calculateStreak(user, allCheckins, allSmokingLogs);

    const achievements = await prisma.achievement.findMany({
      where: { 
        requirement: { lte: streak },
        NOT: { users: { some: { userId: req.userId } } }
      }
    });

    const newAchievements = [];
    for (const ach of achievements) {
      await prisma.userAchievement.create({
        data: { userId: req.userId, achievementId: ach.id }
      });
      newAchievements.push(ach);
      
      // Real Push Notification
      await sendPushToUser(req.userId, {
        title: '🏆 Logro Desbloqueado',
        body: `¡Felicidades! Has ganado: ${ach.name}. ${ach.description}`,
        icon: '/icons/icon-192.png',
        url: '/#achievements'
      });
    }

    res.json({ checkin, newAchievements });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Error en el check-in' });
  }
});

// GET /api/progress/chart — datos históricos para gráficas (últimos 7 días)
router.get('/chart', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Fetch cravings
    const cravings = await prisma.craving.findMany({
      where: {
        userId: req.userId,
        createdAt: { gte: sevenDaysAgo, lte: today }
      },
      select: { createdAt: true }
    });

    // Fetch smoking logs
    const smoking = await prisma.smokingLog.findMany({
      where: {
        userId: req.userId,
        createdAt: { gte: sevenDaysAgo, lte: today }
      },
      select: { createdAt: true, grams: true }
    });

    // Generate last 7 days array
    const labels = [];
    const cravingsData = [0, 0, 0, 0, 0, 0, 0];
    const smokingData = [0, 0, 0, 0, 0, 0, 0];
    const moneyData = [0, 0, 0, 0, 0, 0, 0];
    const moneySavedData = [0, 0, 0, 0, 0, 0, 0];

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const pricePerGram = user?.pricePerGram || 0;
    const dailyTheoretic = user?.monthlySpend 
      ? user.monthlySpend / 30 
      : ((user?.dailyJoints || 0) * (user?.gramsPerJoint || 0.3) * pricePerGram);

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      labels.push(d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));

      const dStart = new Date(d);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      // Cravings
      const dayCravings = cravings.filter(c => c.createdAt >= dStart && c.createdAt <= dEnd);
      cravingsData[i] = dayCravings.length;

      // Smoking
      const daySmoking = smoking.filter(s => s.createdAt >= dStart && s.createdAt <= dEnd);
      smokingData[i] = daySmoking.reduce((sum, s) => sum + (s.grams || 0), 0);

      // Money spent that day
      moneyData[i] = smokingData[i] * pricePerGram;
      
      // Money saved that day
      moneySavedData[i] = Math.max(0, dailyTheoretic - moneyData[i]);
    }

    res.json({
      labels,
      cravings: cravingsData,
      smokingGrams: smokingData,
      moneySpent: moneyData,
      moneySaved: moneySavedData
    });

  } catch (err) {
    console.error('Progress chart error:', err);
    res.status(500).json({ error: 'Error al obtener datos históricos' });
  }
});

module.exports = router;
