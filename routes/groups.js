const express = require('express');
const prisma = require('../utils/prisma');
const auth = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Generar código de grupo aleatorio
function generateJoinCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// POST /api/groups - Crear grupo
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });

    let joinCode = generateJoinCode();
    // Asegurar unicidad (reintento simple)
    let existing = await prisma.group.findUnique({ where: { joinCode } });
    while (existing) {
      joinCode = generateJoinCode();
      existing = await prisma.group.findUnique({ where: { joinCode } });
    }

    const group = await prisma.group.create({
      data: {
        name,
        joinCode,
        adminId: req.userId,
        members: {
          create: { userId: req.userId }
        }
      },
      include: {
        members: true
      }
    });

    res.status(201).json(group);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Error al crear el grupo' });
  }
});

// POST /api/groups/join - Unirse a un grupo
router.post('/join', auth, async (req, res) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ error: 'El código es obligatorio' });

    const group = await prisma.group.findUnique({
      where: { joinCode: joinCode.toUpperCase() }
    });

    if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });

    // Verificar si ya es miembro
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.userId,
          groupId: group.id
        }
      }
    });

    if (existingMember) return res.status(400).json({ error: 'Ya eres miembro de este grupo' });

    const member = await prisma.groupMember.create({
      data: {
        userId: req.userId,
        groupId: group.id
      }
    });

    res.json({ message: 'Te has unido al grupo correctamente', group });
  } catch (err) {
    console.error('Error joining group:', err);
    res.status(500).json({ error: 'Error al unirte al grupo' });
  }
});

// GET /api/groups - Listar mis grupos
router.get('/', auth, async (req, res) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.userId },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true }
            }
          }
        }
      }
    });

    res.json(memberships.map(m => ({
      id: m.group.id,
      name: m.group.name,
      joinCode: m.group.joinCode,
      memberCount: m.group._count.members,
      joinedAt: m.joinedAt
    })));
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Error al obtener grupos' });
  }
});

const { calculateStreak } = require('../utils/streak');

// GET /api/groups/:id - Detalle del grupo y estadísticas de miembros
router.get('/:id', auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Verificar que el usuario pertenece al grupo
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.userId,
          groupId
        }
      }
    });

    if (!membership) return res.status(403).json({ error: 'No tienes acceso a este grupo' });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                quitDate: true,
                dailyJoints: true,
                gramsPerJoint: true,
                planType: true,
                createdAt: true,
                checkins: true,
                smokingLogs: true
              }
            }
          }
        }
      }
    });

    // Calcular estadísticas para cada miembro
    const membersWithStats = group.members.map(m => {
      const u = m.user;
      
      // Calcular racha real usando el motor de rachas
      const streak = calculateStreak(u, u.checkins, u.smokingLogs);
      
      // Petas evitadas (basado en la fecha de dejarlo original)
      const now = new Date();
      const quitDate = u.quitDate ? new Date(u.quitDate) : new Date(u.createdAt);
      const diffTime = Math.max(0, now - quitDate);
      const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const jointsAvoided = Math.floor(totalDays * (u.dailyJoints || 0));

      // Petas fumadas (logs + checkins positivos)
      const jointsSmoked = u.smokingLogs.length + u.checkins.filter(c => c.smoked).length;

      // Dinero ahorrado (aproximado)
      const moneySaved = jointsAvoided * (u.gramsPerJoint || 0.3) * (u.pricePerGram || 5);

      return {
        id: u.id,
        name: u.name || 'Usuario anónimo',
        daysClean: streak,
        jointsAvoided,
        jointsSmoked,
        moneySaved,
        isMe: u.id === req.userId
      };
    }).sort((a, b) => b.daysClean - a.daysClean);

    // Totales del grupo
    const groupTotals = {
      totalJointsAvoided: membersWithStats.reduce((sum, m) => sum + m.jointsAvoided, 0),
      totalMoneySaved: membersWithStats.reduce((sum, m) => sum + m.moneySaved, 0),
      totalMembers: membersWithStats.length
    };

    res.json({
      id: group.id,
      name: group.name,
      joinCode: group.joinCode,
      members: membersWithStats,
      totals: groupTotals
    });
  } catch (err) {
    console.error('Error fetching group details:', err);
    res.status(500).json({ error: 'Error al obtener detalles del grupo' });
  }
});

module.exports = router;
