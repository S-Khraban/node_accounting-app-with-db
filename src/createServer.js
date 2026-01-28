'use strict';

const express = require('express');
const { Op } = require('sequelize');

const {
  models: { User, Expense },
} = require('./models/models');

const createServer = () => {
  const app = express();

  app.use(express.json());

  app.post('/users', async (req, res) => {
    const { name } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = await User.create({ name });

    return res.status(201).json(user.toJSON());
  });

  app.get('/users', async (_req, res) => {
    const users = await User.findAll({ order: [['id', 'ASC']] });

    return res.json(users.map((u) => u.toJSON()));
  });

  app.get('/users/:id', async (req, res) => {
    const id = Number(req.params.id);

    const user = await User.findByPk(id);

    if (!user) {
      return res.sendStatus(404);
    }

    return res.json(user.toJSON());
  });

  async function updateUser(req, res) {
    const id = Number(req.params.id);

    const user = await User.findByPk(id);

    if (!user) {
      return res.sendStatus(404);
    }

    const { name } = req.body || {};

    if (name !== undefined) {
      user.name = name;
    }

    await user.save();

    return res.json(user.toJSON());
  }

  app.patch('/users/:id', updateUser);
  app.put('/users/:id', updateUser);

  app.delete('/users/:id', async (req, res) => {
    const id = Number(req.params.id);

    const user = await User.findByPk(id);

    if (!user) {
      return res.sendStatus(404);
    }

    await user.destroy();

    return res.sendStatus(204);
  });

  app.post('/expenses', async (req, res) => {
    const body = req.body || {};
    const { spentAt, title, amount, category, note, userId } = body;

    if (!spentAt || !title || amount === undefined || userId === undefined) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const user = await User.findByPk(Number(userId));

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const expense = await Expense.create({
      spentAt,
      title,
      amount,
      category,
      note,
      userId: Number(userId),
    });

    return res.status(201).json(expense.toJSON());
  });

  app.get('/expenses', async (req, res) => {
    const { userId, from, to, categories } = req.query;

    const where = {};

    if (userId !== undefined) {
      where.userId = Number(userId);
    }

    if (from && to) {
      where.spentAt = { [Op.between]: [new Date(from), new Date(to)] };
    } else if (from) {
      where.spentAt = { [Op.gte]: new Date(from) };
    } else if (to) {
      where.spentAt = { [Op.lte]: new Date(to) };
    }

    if (categories) {
      const list = String(categories)
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      if (list.length > 0) {
        where.category = { [Op.in]: list };
      }
    }

    const expenses = await Expense.findAll({ where, order: [['id', 'ASC']] });

    return res.json(expenses.map((e) => e.toJSON()));
  });

  app.get('/expenses/:id', async (req, res) => {
    const id = Number(req.params.id);

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.sendStatus(404);
    }

    return res.json(expense.toJSON());
  });

  app.patch('/expenses/:id', async (req, res) => {
    const id = Number(req.params.id);

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.sendStatus(404);
    }

    const body = req.body || {};
    const allowed = [
      'spentAt',
      'title',
      'amount',
      'category',
      'note',
      'userId',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        expense[key] = key === 'userId' ? Number(body[key]) : body[key];
      }
    }

    if (body.userId !== undefined) {
      const user = await User.findByPk(Number(body.userId));

      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
    }

    await expense.save();

    return res.json(expense.toJSON());
  });

  app.delete('/expenses/:id', async (req, res) => {
    const id = Number(req.params.id);

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.sendStatus(404);
    }

    await expense.destroy();

    return res.sendStatus(204);
  });

  return app;
};

module.exports = {
  createServer,
};
