const express = require('express');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getPhase(days) {
  if (days <= 7) return { name: 'Desintoxicación', emoji: '🌱', desc: 'Tu cuerpo está eliminando el THC' };
  if (days <= 30) return { name: 'Resistencia', emoji: '💪', desc: 'Estás rompiendo patrones y creando nuevos hábitos' };
  if (days <= 60) return { name: 'Reprogramación', emoji: '🧠', desc: 'Tus receptores cerebrales se están normalizando' };
  if (days <= 90) return { name: 'Consolidación', emoji: '⭐', desc: 'Estás afianzando tu nueva vida' };
  return { name: 'Libertad', emoji: '🦋', desc: 'Eres libre. Tu cerebro se ha reprogramado' };
}

const SYSTEM_PROMPT = `Eres "Verde", el coach personal de QuitPetas. Eres un terapeuta empático especializado en adicción al cannabis, formado en Terapia Cognitivo-Conductual (CBT) y Reducción de Daños (Harm Reduction).

PERSONALIDAD:
- Cercano pero profesional. Tuteas al usuario.
- Nunca juzgas. Nunca dices "deberías".
- Celebras cada pequeña victoria con entusiasmo genuino, especialmente si logran reducir su dosis semanal.
- Si el usuario recae, NO le haces sentir culpable. Analiza qué pasó.
- Eres directo y conciso. Nada de rollos.

CONOCIMIENTO EXPERTO Y PLANES CLÍNICOS:
- Hay tres planes en la app: COLD_TURKEY (corte de raíz), TAPER_FREQ (disminuir cantidad de petas), y TAPER_GRAMS (disminuir gramos por peta).
- Si el usuario está en TAPER_FREQ o TAPER_GRAMS y te cuenta que ha fumado PERO está dentro de su límite semanal, DEBES FELICITARLO vigorosamente por ser disciplinado con su dieta de reducción de daños. NO es una recaída, es un éxito terapéutico.
- Si supera su límite, anímalo a no tirar la toalla.
- Síntomas de abstinencia del cannabis: insomnio, irritabilidad, ansiedad. Que los cravings duran 10-20 minutos.
- Técnicas CBT para triggers, especialmente para su "Causa Histórica de Recaída".

TIPOS DE RESPUESTA:
1. CRAVING ACTIVO → Técnica de respiración. Recuérdale su motivación.
2. ÉXITO EN TAPER (Dieta) → Validar disciplina: "Fumar solo 0.2g hoy como marca tu plan es un paso brutal para tus pulmones."
3. RECAÍDA → Sin juicio. Analizar el trigger.
4. DUDA/DESMOTIVACIÓN → Entrevista motivacional.

REGLAS ESTRICTAS:
- Máximo 2-4 frases. Sé conciso.
- Usa 1-2 emojis por mensaje.
- Termina con una pregunta abierta o sugiriendo abrir el "Modo SOS" de respiración si hay riesgo alto.
- NUNCA inventes datos. Usa solo la información del contexto (Plan, Límite, Trigger, etc).`;

// Build rich user context for the AI
async function buildUserContext(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.quitDate) return { user, context: 'El usuario acaba de registrarse.' };

  const now = new Date();
  const totalDays = Math.floor((now - new Date(user.quitDate)) / (1000 * 60 * 60 * 24));
  const phase = getPhase(totalDays);

  // Last check-in
  const lastCheckin = await prisma.checkIn.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  // Craving stats
  const totalCravings = await prisma.craving.count({ where: { userId } });
  const resistedCravings = await prisma.craving.count({ where: { userId, resisted: true } });
  const successRate = totalCravings > 0 ? Math.round((resistedCravings / totalCravings) * 100) : 0;

  // Recent cravings (last 5)
  const recentCravings = await prisma.craving.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { intensity: true, trigger: true, resisted: true, createdAt: true },
  });

  // Today's smoking logs
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySmoked = await prisma.smokingLog.count({
    where: { userId, createdAt: { gte: todayStart } },
  });

  // Money saved
  const dailySpend = (user.monthlySpend || 0) / 30;
  const moneySaved = (dailySpend * totalDays).toFixed(0);

  // Last smoked check-in
  const lastSmoked = await prisma.checkIn.findFirst({
    where: { userId, smoked: true },
    orderBy: { date: 'desc' },
  });

  let streak = totalDays;
  if (lastSmoked) {
    streak = Math.floor((now - new Date(lastSmoked.date)) / (1000 * 60 * 60 * 24));
  }

  // Allowance Logic para el contexto
  let allowanceText = '0 petas (Abtinencia Total)';
  const weeksPassed = Math.floor(totalDays / 7);
  if (user.planType === 'TAPER_FREQ') {
    const allowance = Math.max(0, (user.dailyJoints || 0) - weeksPassed);
    allowanceText = `${allowance} petas al día permitidos esta semana`;
  } else if (user.planType === 'TAPER_GRAMS') {
    const allowanceGrams = Math.max(0, (user.gramsPerJoint || 0.3) - (0.1 * weeksPassed)).toFixed(2);
    allowanceText = `${allowanceGrams} gramos por peta permitidos esta semana`;
  }

  const contextParts = [
    `DATOS DEL USUARIO:`,
    `- Nombre: ${user.name || 'No indicado'}`,
    `- Plan Elegido: ${user.planType || 'COLD_TURKEY'}`,
    `- Límite Dietético Actual: ${allowanceText}`,
    `- Días desde que empezó a usar la app: ${totalDays}`,
    `- Racha actual de victorias: ${streak} días`,
    `- Fase del proceso: ${phase.emoji} ${phase.name} — ${phase.desc}`,
    `- Historial Previo de Motivo de Recaída: ${user.previousRelapseCause || 'Desconocido'}`,
    `- Consumo inicial: ${user.dailyJoints || '?'} petas/día durante ${user.yearsSmoked || '?'} años`,
    `- Mezcla con tabaco: ${user.tobaccoMix ? 'Sí' : 'No'}`,
    `- Cuándo fuma más: ${user.smokeTrigger || 'no indicado'}`,
    `- Suele fumar: ${user.smokeAlone ? 'solo' : 'acompañado'}`,
    `- Motivación personal: "${user.motivation || 'no indicada'}"`,
    `- Intentos previos de dejarlo: ${user.previousAttempts || 0}`,
    `- Dinero ahorrado: ${moneySaved}€`,
    `- Cravings: ${resistedCravings}/${totalCravings} resistidos (${successRate}% éxito)`,
    `- Petas fumadas hoy (registro): ${todaySmoked}`,
  ];

  if (lastCheckin) {
    const moods = ['', 'Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'];
    contextParts.push(`- Último check-in: mood ${moods[lastCheckin.mood] || '?'}, fumó: ${lastCheckin.smoked ? 'SÍ' : 'NO'}`);
  }

  if (recentCravings.length > 0) {
    const triggers = recentCravings.filter(c => c.trigger).map(c => c.trigger);
    if (triggers.length > 0) {
      contextParts.push(`- Triggers recientes: ${triggers.join(', ')}`);
    }
    const avgIntensity = (recentCravings.reduce((s, c) => s + c.intensity, 0) / recentCravings.length).toFixed(1);
    contextParts.push(`- Intensidad media cravings recientes: ${avgIntensity}/10`);
  }

  return { user, context: contextParts.join('\n') };
}

// POST /api/chat — enviar mensaje al coach IA
router.post('/', auth, async (req, res) => {
  try {
    const { message, mode } = req.body; // mode: 'normal' | 'sos'
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: { userId: req.userId, role: 'user', content: message.trim() }
    });

    // Build context
    const { context } = await buildUserContext(req.userId);

    // Get conversation history
    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let systemPrompt = SYSTEM_PROMPT;
    if (mode === 'sos') {
      systemPrompt += `\n\nMODO SOS ACTIVADO: El usuario está en crisis con un craving fuerte AHORA MISMO. 
Sé ultra-conciso (1-2 frases). Guíale con una acción inmediata:
1. Primero valida: "Estoy aquí contigo."
2. Una técnica rápida: respiración 4-7-8, o grounding 5-4-3-2-1
3. Recuérdale: "El craving dura ~15 min. Ya llevas X minutos aguantando."
4. Si puede, que salga a caminar o llame a alguien.
NO hagas preguntas largas. Acción directa.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: context },
      ...recentMessages.reverse().map(m => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    await prisma.chatMessage.create({
      data: { userId: req.userId, role: 'assistant', content: reply }
    });

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    if (err.status === 429) {
      return res.status(429).json({ error: 'Verde está procesando demasiados mensajes ahora mismo. Inténtalo de nuevo en unos segundos.' });
    }
    res.status(500).json({ error: 'Error al procesar el mensaje' });
  }
});

// GET /api/chat/history
router.get('/history', auth, async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json(messages);
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

module.exports = router;
