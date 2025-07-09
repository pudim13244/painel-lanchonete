const express = require('express');
const router = express.Router();
const db = require('../db');

// Buscar todos os grupos de opções de um estabelecimento
router.get('/', async (req, res) => {
  try {
    const { establishment_id } = req.query;

    if (!establishment_id) {
      return res.status(400).json({ error: 'ID do estabelecimento é obrigatório' });
    }

    const query = `
      SELECT id, name, product_type, min_selections, max_selections, is_required, establishment_id, created_at
      FROM option_groups
      WHERE establishment_id = ?
      ORDER BY name ASC
    `;

    const [groups] = await db.query(query, [establishment_id]);

    res.json({ groups });
  } catch (error) {
    console.error('Erro ao buscar grupos de opções:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo grupo de opções
router.post('/', async (req, res) => {
  try {
    const { name, product_type, min_selections, max_selections, is_required, establishment_id } = req.body;

    // Validações
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
    }

    if (!product_type || !product_type.trim()) {
      return res.status(400).json({ error: 'Tipo do produto é obrigatório' });
    }

    if (!establishment_id) {
      return res.status(400).json({ error: 'ID do estabelecimento é obrigatório' });
    }

    // Validações numéricas
    const min = parseInt(min_selections) || 0;
    const max = parseInt(max_selections) || 1;
    
    if (min < 0) {
      return res.status(400).json({ error: 'Mínimo de seleções deve ser zero ou maior' });
    }
    
    if (max < min) {
      return res.status(400).json({ error: 'Máximo de seleções deve ser maior ou igual ao mínimo' });
    }

    // Verificar se já existe um grupo com o mesmo nome para este estabelecimento
    const checkQuery = `
      SELECT id FROM option_groups 
      WHERE name = ? AND establishment_id = ?
    `;
    const [existing] = await db.query(checkQuery, [name.trim(), establishment_id]);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Já existe um grupo com este nome' });
    }

    const query = `
      INSERT INTO option_groups (name, product_type, min_selections, max_selections, is_required, establishment_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      name.trim(), 
      product_type.trim(), 
      min, 
      max, 
      is_required || false, 
      establishment_id
    ]);

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      product_type: product_type.trim(),
      min_selections: min,
      max_selections: max,
      is_required: is_required || false,
      establishment_id
    });
  } catch (error) {
    console.error('Erro ao criar grupo de opções:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar grupo de opções
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, product_type, min_selections, max_selections, is_required } = req.body;

    // Validações
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
    }

    if (!product_type || !product_type.trim()) {
      return res.status(400).json({ error: 'Tipo do produto é obrigatório' });
    }

    // Validações numéricas
    const min = parseInt(min_selections) || 0;
    const max = parseInt(max_selections) || 1;
    
    if (min < 0) {
      return res.status(400).json({ error: 'Mínimo de seleções deve ser zero ou maior' });
    }
    
    if (max < min) {
      return res.status(400).json({ error: 'Máximo de seleções deve ser maior ou igual ao mínimo' });
    }

    // Verificar se o grupo existe
    const checkQuery = `SELECT establishment_id FROM option_groups WHERE id = ?`;
    const [existing] = await db.query(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Grupo de opções não encontrado' });
    }

    // Verificar se já existe outro grupo com o mesmo nome para este estabelecimento
    const duplicateQuery = `
      SELECT id FROM option_groups 
      WHERE name = ? AND establishment_id = ? AND id != ?
    `;
    const [duplicate] = await db.query(duplicateQuery, [name.trim(), existing[0].establishment_id, id]);
    
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'Já existe um grupo com este nome' });
    }

    const query = `
      UPDATE option_groups
      SET name = ?, product_type = ?, min_selections = ?, max_selections = ?, is_required = ?
      WHERE id = ?
    `;

    await db.query(query, [
      name.trim(), 
      product_type.trim(), 
      min, 
      max, 
      is_required || false, 
      id
    ]);

    res.json({ 
      message: 'Grupo de opções atualizado com sucesso',
      id: parseInt(id),
      name: name.trim(),
      product_type: product_type.trim(),
      min_selections: min,
      max_selections: max,
      is_required: is_required || false
    });
  } catch (error) {
    console.error('Erro ao atualizar grupo de opções:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir grupo de opções
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o grupo existe
    const checkQuery = `SELECT id FROM option_groups WHERE id = ?`;
    const [existing] = await db.query(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Grupo de opções não encontrado' });
    }

    // Verificar se há opções associadas
    const optionsQuery = `SELECT id FROM options WHERE group_id = ?`;
    const [options] = await db.query(optionsQuery, [id]);
    
    if (options.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir o grupo. Existem opções associadas a ele.' 
      });
    }

    const query = `
      DELETE FROM option_groups
      WHERE id = ?
    `;

    await db.query(query, [id]);

    res.json({ message: 'Grupo de opções excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir grupo de opções:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 