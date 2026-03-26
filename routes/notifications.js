const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();
const prisma = new PrismaClient();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuB23C4-IE96w7pAivvE_-PTEI';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '8tBIt5z8hJxy9SqzUfG2E2XoUq14zZq9f1Tqz9o7sXo';

// webpush configuration already handled in utils/push.js

router.get('/vapidPublicKey', (req, res) => {
  res.json({ publicKey: publicVapidKey });
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const subscription = req.body;
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userId: req.userId },
      create: { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userId: req.userId }
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Error saving subscription' });
  }
});

router.post('/test', auth, async (req, res) => {
  try {
    await sendPushToUser(req.userId, {
        title: '🌿 QuitPetas',
        body: '¡Funciona! Esta es una notificación de prueba.',
        url: '/#dashboard'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Test failed' });
  }
});

module.exports = router;
