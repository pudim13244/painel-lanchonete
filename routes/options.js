const express = require('express');
const router = express.Router();
const db = require('../db');

// Buscar todas as opções de um estabelecimento
router.get('/', async (req, res) => {
  try {
    const { establishment_id } = req.query;

    if (!establishment_id) {
      return res.status(400).json({ error: 'ID do estabelecimento é obrigatório' });
    }

    const query = `
      SELECT o.id, o.name, o.additional_price, o.description, o.is_available, o.group_id, o.created_at,
             og.name as group_name
      FROM options o
      LEFT JOIN option_groups og ON o.group_id = og.id
      WHERE og.establishment_id = ?
      ORDER BY og.name ASC, o.name ASC
    `;

    const [options] = await db.query(query, [establishment_id]);

    res.json({ options });
  } catch (error) {
    console.error('Erro ao buscar opções:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova opção
router.post('/', async (req, res) => {
  try {
    const { name, additional_price, description, group_id, is_available } = req.body;

    // Validações
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da opção é obrigatório' });
    }

    if (additional_price === undefined || additional_price === null || additional_price < 0) {
      return res.status(400).json({ error: 'Preço adicional deve ser zero ou maior' });
    }

    if (!group_id) {
      return res.status(400).json({ error: 'Grupo é obrigatório' });
    }

    // Verificar se o grupo existe e pertence ao estabelecimento correto
    const groupQuery = `
      SELECT id, establishment_id FROM option_groups WHERE id = ?
    `;
    const [group] = await db.query(groupQuery, [group_id]);
    
    if (group.length === 0) {
      return res.status(400).json({ error: 'Grupo não encontrado' });
    }

    // Verificar se já existe uma opção com o mesmo nome no mesmo grupo
    const checkQuery = `
      SELECT id FROM options 
      WHERE name = ? AND group_id = ?
    `;
    const [existing] = await db.query(checkQuery, [name.trim(), group_id]);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Já existe uma opção com este nome neste grupo' });
    }

    const query = `
      INSERT INTO options (name, additional_price, description, group_id, is_available)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      name.trim(), 
      parseFloat(additional_price), 
      description ? description.trim() : '', 
      group_id, 
      is_available !== undefined ? is_available : true
    ]);

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      additional_price: parseFloat(additional_price),
      description: description ? description.trim() : '',
      group_id,
      is_available: is_available !== undefined ? is_available : true
    });
  } catch (error) {
    console.error('Erro ao criar opção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar opção
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, additional_price, description, group_id, is_available } = req.body;

    // Validações
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da opção é obrigatório' });
    }

    if (additional_price === undefined || additional_price === null || additional_price < 0) {
      return res.status(400).json({ error: 'Preço adicional deve ser zero ou maior' });
    }

    if (!group_id) {
      return res.status(400).json({ error: 'Grupo é obrigatório' });
    }

    // Verificar se a opção existe
    const checkQuery = `SELECT id FROM options WHERE id = ?`;
    const [existing] = await db.query(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Opção não encontrada' });
    }

    // Verificar se o grupo existe
    const groupQuery = `SELECT id FROM option_groups WHERE id = ?`;
    const [group] = await db.query(groupQuery, [group_id]);
    
    if (group.length === 0) {
      return res.status(400).json({ error: 'Grupo não encontrado' });
    }

    // Verificar se já existe outra opção com o mesmo nome no mesmo grupo
    const duplicateQuery = `
      SELECT id FROM options 
      WHERE name = ? AND group_id = ? AND id != ?
    `;
    const [duplicate] = await db.query(duplicateQuery, [name.trim(), group_id, id]);
    
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'Já existe uma opção com este nome neste grupo' });
    }

    const query = `
      UPDATE options
      SET name = ?, additional_price = ?, description = ?, group_id = ?, is_available = ?
      WHERE id = ?
    `;

    await db.query(query, [
      name.trim(), 
      parseFloat(additional_price), 
      description ? description.trim() : '', 
      group_id, 
      is_available !== undefined ? is_available : true, 
      id
    ]);

    res.json({ 
      message: 'Opção atualizada com sucesso',
      id: parseInt(id),
      name: name.trim(),
      additional_price: parseFloat(additional_price),
      description: description ? description.trim() : '',
      group_id,
      is_available: is_available !== undefined ? is_available : true
    });
  } catch (error) {
    console.error('Erro ao atualizar opção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir opção
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a opção existe
    const checkQuery = `SELECT id FROM options WHERE id = ?`;
    const [existing] = await db.query(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Opção não encontrada' });
    }

    const query = `
      DELETE FROM options
      WHERE id = ?
    `;

    await db.query(query, [id]);

    res.json({ message: 'Opção excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir opção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 