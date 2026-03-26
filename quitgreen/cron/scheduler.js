const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendPushToUser } = require('../utils/push');
const prisma = new PrismaClient();

function initScheduler() {
  console.log('⏰ Notification scheduler initialized');

  // 1. Daily Check-in Reminder (at 21:00)
  // Format: second minute hour dayMonth month dayWeek
  cron.schedule('0 21 * * *', async () => {
    console.log('🚀 Running daily check-in reminder job...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find users who haven't done check-in today
      const usersToRemind = await prisma.user.findMany({
        where: {
          pushSubs: { some: {} }, // Has at least one subscription
          checkIns: {
            none: {
              date: today
            }
          }
        }
      });

      console.log(`🔔 Sending reminders to ${usersToRemind.length} users...`);

      for (const user of usersToRemind) {
        await sendPushToUser(user.id, {
          title: '🌿 Momento de Check-in',
          body: `Hola ${user.name || 'campeón'}, ¿cómo va el día? No olvides registrar tu progreso hoy. ✨`,
          url: '/#dashboard'
        });
      }
    } catch (err) {
      console.error('Daily reminder job error:', err);
    }
  });

  // 2. Weekly Motivational Message (every Monday at 10:00)
  cron.schedule('0 10 * * 1', async () => {
    console.log('🚀 Running weekly motivation job...');
    const users = await prisma.user.findMany({
      where: { pushSubs: { some: {} } }
    });

    const messages = [
      "¡Nueva semana, nuevas victorias! Mantente fuerte. 💪",
      "Cada día cuenta. Tus pulmones te lo agradecen hoy. 🫁",
      "Recuerda por qué empezaste. ¡Tú puedes!",
      "La libertad sabe mejor que cualquier humo. 🦋"
    ];

    for (const user of users) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      await sendPushToUser(user.id, {
        title: 'Verde (Tu Coach) 🧘‍♂️',
        body: msg
      });
    }
  });
}

module.exports = { initScheduler };
