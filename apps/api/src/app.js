require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient, TransactionType } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

const FAMILY_EMAILS = new Set(['mario@home.local', 'aye@home.local']);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const settingsSchema = z.object({
  salaryMonthly: z.number().min(0),
  currency: z.string().min(3).max(6),
  userSavingsGoalMonthly: z.number().min(0).nullable().optional()
});

const householdSchema = z.object({
  householdSavingsGoalMonthly: z.number().min(0),
  currency: z.string().min(3).max(6)
});

const transactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  description: z.string().trim().max(280).optional(),
  date: z.string().optional()
});

function getMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  return { start, end };
}

function buildSummary({
  incomeTotal,
  transactions,
  goalMonthly
}) {
  const spentBreakdown = {
    FIXED: 0,
    VARIABLE: 0,
    EXTRA: 0
  };

  let savingTotal = 0;

  for (const tx of transactions) {
    if (tx.type === 'SAVING') {
      savingTotal += tx.amount;
    } else {
      spentBreakdown[tx.type] += tx.amount;
    }
  }

  const spentTotal = spentBreakdown.FIXED + spentBreakdown.VARIABLE + spentBreakdown.EXTRA;
  const netTotal = incomeTotal - spentTotal - savingTotal;
  const progress = goalMonthly > 0 ? Math.min(100, (savingTotal / goalMonthly) * 100) : 0;

  return {
    incomeTotal,
    spentBreakdown,
    spentTotal,
    savingTotal,
    netTotal,
    goalMonthly,
    progress
  };
}

function mapUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar
  };
}

function mapTransaction(tx) {
  return {
    id: tx.id,
    userId: tx.userId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    createdAt: tx.createdAt,
    user: tx.user
      ? {
          id: tx.user.id,
          displayName: tx.user.displayName,
          avatar: tx.user.avatar
        }
      : null
  };
}

async function getOrCreateHousehold() {
  return prisma.householdSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      householdSavingsGoalMonthly: 0,
      currency: 'USD'
    }
  });
}

async function getFamilyUsers() {
  return prisma.user.findMany({
    where: {
      email: {
        in: Array.from(FAMILY_EMAILS)
      }
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatar: true
    }
  });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token user' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
    })
  );

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/auth/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email: parsed.email } });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(parsed.password, user.passwordHash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '7d'
      });

      return res.json({
        token,
        user: mapUser(user)
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });

  app.get('/settings', authMiddleware, async (req, res, next) => {
    try {
      const settings = await prisma.settings.upsert({
        where: { userId: req.user.id },
        update: {},
        create: {
          userId: req.user.id,
          salaryMonthly: 0,
          currency: 'USD'
        }
      });

      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  app.put('/settings', authMiddleware, async (req, res, next) => {
    try {
      const parsed = settingsSchema.parse(req.body);

      const settings = await prisma.settings.upsert({
        where: { userId: req.user.id },
        update: {
          salaryMonthly: parsed.salaryMonthly,
          currency: parsed.currency,
          userSavingsGoalMonthly:
            parsed.userSavingsGoalMonthly === undefined ? null : parsed.userSavingsGoalMonthly
        },
        create: {
          userId: req.user.id,
          salaryMonthly: parsed.salaryMonthly,
          currency: parsed.currency,
          userSavingsGoalMonthly:
            parsed.userSavingsGoalMonthly === undefined ? null : parsed.userSavingsGoalMonthly
        }
      });

      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  app.get('/household', authMiddleware, async (_req, res, next) => {
    try {
      const household = await getOrCreateHousehold();
      res.json({ household });
    } catch (error) {
      next(error);
    }
  });

  app.put('/household', authMiddleware, async (req, res, next) => {
    try {
      if (!FAMILY_EMAILS.has(req.user.email)) {
        return res.status(403).json({ error: 'Only household members can edit this setting' });
      }

      const parsed = householdSchema.parse(req.body);

      const household = await prisma.householdSettings.upsert({
        where: { id: 1 },
        update: {
          householdSavingsGoalMonthly: parsed.householdSavingsGoalMonthly,
          currency: parsed.currency
        },
        create: {
          id: 1,
          householdSavingsGoalMonthly: parsed.householdSavingsGoalMonthly,
          currency: parsed.currency
        }
      });

      res.json({ household });
    } catch (error) {
      next(error);
    }
  });

  app.get('/transactions', authMiddleware, async (req, res, next) => {
    try {
      const month = String(req.query.month || '');
      const scope = String(req.query.scope || 'personal');
      const monthRange = getMonthRange(month);

      if (!monthRange) {
        return res.status(400).json({ error: 'Invalid month. Use YYYY-MM' });
      }

      if (!['personal', 'family'].includes(scope)) {
        return res.status(400).json({ error: 'Invalid scope. Use personal or family' });
      }

      let userIds = [req.user.id];
      if (scope === 'family') {
        const familyUsers = await getFamilyUsers();
        userIds = familyUsers.map((user) => user.id);
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: { in: userIds },
          date: {
            gte: monthRange.start,
            lt: monthRange.end
          }
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatar: true
            }
          }
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({
        month,
        scope,
        items: transactions.map(mapTransaction)
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/transactions', authMiddleware, async (req, res, next) => {
    try {
      const parsed = transactionSchema.parse(req.body);
      const idempotencyKeyHeader = req.header('X-Idempotency-Key');
      const idempotencyKey = idempotencyKeyHeader ? idempotencyKeyHeader.trim() : '';

      if (idempotencyKey) {
        const existingRecord = await prisma.idempotencyRecord.findUnique({
          where: {
            key_userId: {
              key: idempotencyKey,
              userId: req.user.id
            }
          },
          include: {
            transaction: {
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    avatar: true
                  }
                }
              }
            }
          }
        });

        if (existingRecord) {
          return res.status(200).json({
            transaction: mapTransaction(existingRecord.transaction),
            duplicated: true
          });
        }
      }

      let date = new Date();
      if (parsed.date) {
        date = new Date(parsed.date);
      }

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            userId: req.user.id,
            type: parsed.type,
            amount: parsed.amount,
            description: parsed.description,
            date
          },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatar: true
              }
            }
          }
        });

        if (idempotencyKey) {
          await tx.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              userId: req.user.id,
              transactionId: transaction.id
            }
          });
        }

        return transaction;
      });

      return res.status(201).json({
        transaction: mapTransaction(result),
        duplicated: false
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/transactions/:id', authMiddleware, async (req, res, next) => {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id }
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ error: 'Only the owner can delete this transaction' });
      }

      await prisma.transaction.delete({ where: { id: req.params.id } });

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/summary', authMiddleware, async (req, res, next) => {
    try {
      const month = String(req.query.month || '');
      const scope = String(req.query.scope || 'personal');
      const monthRange = getMonthRange(month);

      if (!monthRange) {
        return res.status(400).json({ error: 'Invalid month. Use YYYY-MM' });
      }

      if (!['personal', 'family'].includes(scope)) {
        return res.status(400).json({ error: 'Invalid scope. Use personal or family' });
      }

      const household = await getOrCreateHousehold();

      let userIds = [req.user.id];
      if (scope === 'family') {
        const familyUsers = await getFamilyUsers();
        userIds = familyUsers.map((user) => user.id);
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: { in: userIds },
          date: {
            gte: monthRange.start,
            lt: monthRange.end
          }
        }
      });

      const settingsRows = await prisma.settings.findMany({
        where: {
          userId: { in: userIds }
        }
      });

      const incomeTotal = settingsRows.reduce((sum, settings) => sum + settings.salaryMonthly, 0);

      const currentUserSettings = settingsRows.find((settings) => settings.userId === req.user.id);
      const goalMonthly =
        scope === 'family'
          ? household.householdSavingsGoalMonthly
          : (currentUserSettings && currentUserSettings.userSavingsGoalMonthly) ??
            household.householdSavingsGoalMonthly;

      const summary = buildSummary({
        incomeTotal,
        transactions,
        goalMonthly
      });

      res.json({
        month,
        scope,
        currency: scope === 'family' ? household.currency : currentUserSettings?.currency || household.currency,
        ...summary
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.flatten()
      });
    }

    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = {
  createApp,
  prisma
};
