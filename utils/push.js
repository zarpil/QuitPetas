const webpush = require('web-push');
const prisma = require('./prisma');

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuB23C4-IE96w7pAivvE_-PTEI';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '8tBIt5z8hJxy9SqzUfG2E2XoUq14zZq9f1Tqz9o7sXo';

webpush.setVapidDetails('mailto:test@quitpetas.com', publicVapidKey, privateVapidKey);

/**
 * Sends a push notification to a specific user.
 * @param {number} userId 
 * @param {object} payload { title, body, icon, url }
 */
async function sendPushToUser(userId, payload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) return;

    const data = JSON.stringify({
      title: payload.title || '🌿 QuitPetas',
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      url: payload.url || '/'
    });

    const results = await Promise.all(
      subscriptions.map(sub => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        return webpush.sendNotification(pushConfig, data).catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
             // Remove expired subscription
             return prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
          console.error('Push failed for sub:', sub.id, err.message);
        });
      })
    );
    
    return results;
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

module.exports = { sendPushToUser };
