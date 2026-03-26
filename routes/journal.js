const express = require('express');
const prisma = require('../utils/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/journal
router.get('/', auth, async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(entries);
  } catch (err) {
    console.error('Journal get error:', err);
    res.status(500).json({ error: 'Error al obtener entradas' });
  }
});

// POST /api/journal
router.post('/', auth, async (req, res) => {
  try {
    const { content, mood } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        userId: req.userId,
        content: content.trim(),
        mood: mood || null,
      }
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error('Journal create error:', err);
    res.status(500).json({ error: 'Error al guardar entrada' });
  }
});

// DELETE /api/journal/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId }
    });

    if (!entry) return res.status(404).json({ error: 'Entrada no encontrada' });

    await prisma.journalEntry.delete({ where: { id: entry.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Journal delete error:', err);
    res.status(500).json({ error: 'Error al eliminar entrada' });
  }
});

module.exports = router;
