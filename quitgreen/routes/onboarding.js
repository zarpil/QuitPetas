const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/onboarding — guardar perfil de fumador
router.post('/', auth, async (req, res) => {
  try {
    const {
      name, age, substanceType, dailyJoints, gramsPerJoint,
      pricePerGram, yearsSmoked, smokeAlone, smokeTrigger,
      motivation, previousAttempts, tobaccoMix,
      planType, previousRelapseCause
    } = req.body;

    // Calcular gasto mensual
    const joints = dailyJoints || 0;
    const grams = gramsPerJoint || 0;
    const price = pricePerGram || 0;
    const monthlySpend = joints * grams * price * 30;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: name || null,
        age: age ? parseInt(age) : null,
        substanceType: substanceType || null,
        dailyJoints: dailyJoints ? parseFloat(dailyJoints) : null,
        gramsPerJoint: gramsPerJoint ? parseFloat(gramsPerJoint) : null,
        pricePerGram: pricePerGram ? parseFloat(pricePerGram) : null,
        monthlySpend,
        yearsSmoked: yearsSmoked ? parseInt(yearsSmoked) : null,
        smokeAlone: smokeAlone !== undefined ? smokeAlone : null,
        smokeTrigger: smokeTrigger || null,
        motivation: motivation || null,
        previousAttempts: previousAttempts ? parseInt(previousAttempts) : null,
        previousRelapseCause: previousRelapseCause || null,
        tobaccoMix: tobaccoMix !== undefined ? tobaccoMix : null,
        planType: planType || 'COLD_TURKEY',
        quitDate: new Date(),
        onboarded: true,
      },
      select: {
        id: true, email: true, name: true, onboarded: true,
        quitDate: true, substanceType: true, dailyJoints: true,
        gramsPerJoint: true, pricePerGram: true, monthlySpend: true,
        yearsSmoked: true, smokeAlone: true, smokeTrigger: true,
        motivation: true, previousAttempts: true, tobaccoMix: true,
        previousRelapseCause: true, planType: true,
        age: true,
      }
    });

    res.json(user);
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Error al guardar perfil' });
  }
});

module.exports = router;
