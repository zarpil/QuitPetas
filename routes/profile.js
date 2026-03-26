const express = require('express');
const prisma = require('../utils/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

// PUT /api/profile
router.put('/', auth, async (req, res) => {
  try {
    const {
      name, age, substanceType, dailyJoints, gramsPerJoint,
      pricePerGram, yearsSmoked, smokeAlone, smokeTrigger,
      motivation, previousAttempts, tobaccoMix,
      planType, previousRelapseCause
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name,
        age: age ? parseInt(age) : null,
        substanceType,
        dailyJoints: dailyJoints ? parseFloat(dailyJoints) : null,
        gramsPerJoint: gramsPerJoint ? parseFloat(gramsPerJoint) : null,
        pricePerGram: pricePerGram ? parseFloat(pricePerGram) : null,
        yearsSmoked: yearsSmoked ? parseInt(yearsSmoked) : null,
        smokeAlone,
        smokeTrigger,
        motivation,
        previousAttempts: previousAttempts ? parseInt(previousAttempts) : null,
        previousRelapseCause,
        planType,
        tobaccoMix,
        monthlySpend: (parseFloat(dailyJoints || 0) * parseFloat(gramsPerJoint || 0) * parseFloat(pricePerGram || 0) * 30) || 0
      },
      select: {
        id: true, email: true, name: true, age: true, substanceType: true,
        dailyJoints: true, gramsPerJoint: true, pricePerGram: true,
        monthlySpend: true, yearsSmoked: true, smokeAlone: true,
        smokeTrigger: true, motivation: true, previousAttempts: true,
        previousRelapseCause: true, planType: true,
        tobaccoMix: true, onboarded: true, quitDate: true
      }
    });

    res.json(user);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// DELETE /api/profile
router.delete('/', auth, async (req, res) => {
  try {
    // 1. Delete groups where user is admin
    await prisma.group.deleteMany({
      where: { adminId: req.userId }
    });

    // 2. Delete user (Cascades to everything else)
    await prisma.user.delete({
      where: { id: req.userId }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Error al eliminar la cuenta' });
  }
});

module.exports = router;
