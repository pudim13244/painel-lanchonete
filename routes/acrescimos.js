const express = require('express');
const router = express.Router();
const db = require('../db');

// Buscar todos os acréscimos de um estabelecimento
router.get('/', async (req, res) => {
  try {
    const { establishment_id } = req.query;

    if (!establishment_id) {
      return res.status(400).json({ error: 'ID do estabelecimento é obrigatório' });
    }

    const query = `
      SELECT id, name, price, establishment_id, created_at
      FROM acrescimos
      WHERE establishment_id = ?
    `;

    const [acrescimos] = await db.query(query, [establishment_id]);

    res.json({ acrescimos });
  } catch (error) {
    console.error('Erro ao buscar acréscimos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo acréscimo
router.post('/', async (req, res) => {
  try {
    const { name, price, establishment_id } = req.body;

    if (!name || !price || !establishment_id) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const query = `
      INSERT INTO acrescimos (name, price, establishment_id)
      VALUES (?, ?, ?)
    `;

    const [result] = await db.query(query, [name, price, establishment_id]);

    res.status(201).json({
      id: result.insertId,
      name,
      price,
      establishment_id
    });
  } catch (error) {
    console.error('Erro ao criar acréscimo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar acréscimo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const query = `
      UPDATE acrescimos
      SET name = ?, price = ?
      WHERE id = ?
    `;

    await db.query(query, [name, price, id]);

    res.json({ message: 'Acréscimo atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar acréscimo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir acréscimo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM acrescimos
      WHERE id = ?
    `;

    await db.query(query, [id]);

    res.json({ message: 'Acréscimo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir acréscimo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 