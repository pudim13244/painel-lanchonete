const express = require('express');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { executeQuery, getCategories } = require('../config/database');

const router = express.Router();

// GET /api/categories - Listar categorias (público)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const categories = await getCategories();
    
    res.json({
      categories
    });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/categories/:id - Buscar categoria específica
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        message: 'ID de categoria inválido'
      });
    }
    
    const query = 'SELECT * FROM categories WHERE id = ?';
    const categories = await executeQuery(query, [categoryId]);
    
    if (categories.length === 0) {
      return res.status(404).json({
        message: 'Categoria não encontrada'
      });
    }
    
    res.json({
      category: categories[0]
    });
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/categories - Criar categoria (apenas estabelecimentos)
router.post('/', authenticateToken, requireRole('ESTABLISHMENT'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validações
    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({
        message: 'Nome deve ter entre 2 e 50 caracteres'
      });
    }
    
    // Verificar se já existe uma categoria com o mesmo nome
    const existingCategory = await executeQuery(
      'SELECT id FROM categories WHERE name = ?',
      [name]
    );
    
    if (existingCategory.length > 0) {
      return res.status(400).json({
        message: 'Já existe uma categoria com este nome'
      });
    }
    
    const query = 'INSERT INTO categories (name, description) VALUES (?, ?)';
    const result = await executeQuery(query, [name, description || '']);
    
    // Buscar categoria criada
    const createdCategory = await executeQuery(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      message: 'Categoria criada com sucesso',
      category: createdCategory[0]
    });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/categories/:id - Atualizar categoria
router.put('/:id', authenticateToken, requireRole('ESTABLISHMENT'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, description } = req.body;
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        message: 'ID de categoria inválido'
      });
    }
    
    // Verificar se a categoria existe
    const existingCategory = await executeQuery(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );
    
    if (existingCategory.length === 0) {
      return res.status(404).json({
        message: 'Categoria não encontrada'
      });
    }
    
    // Validações
    if (name && (name.length < 2 || name.length > 50)) {
      return res.status(400).json({
        message: 'Nome deve ter entre 2 e 50 caracteres'
      });
    }
    
    // Verificar se já existe outra categoria com o mesmo nome
    if (name && name !== existingCategory[0].name) {
      const duplicateCategory = await executeQuery(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [name, categoryId]
      );
      
      if (duplicateCategory.length > 0) {
        return res.status(400).json({
          message: 'Já existe uma categoria com este nome'
        });
      }
    }
    
    const query = 'UPDATE categories SET name = ?, description = ? WHERE id = ?';
    await executeQuery(query, [
      name || existingCategory[0].name,
      description !== undefined ? description : existingCategory[0].description,
      categoryId
    ]);
    
    // Buscar categoria atualizada
    const updatedCategory = await executeQuery(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );
    
    res.json({
      message: 'Categoria atualizada com sucesso',
      category: updatedCategory[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/categories/:id - Deletar categoria
router.delete('/:id', authenticateToken, requireRole('ESTABLISHMENT'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        message: 'ID de categoria inválido'
      });
    }
    
    // Verificar se a categoria existe
    const existingCategory = await executeQuery(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );
    
    if (existingCategory.length === 0) {
      return res.status(404).json({
        message: 'Categoria não encontrada'
      });
    }
    
    // Verificar se há produtos usando esta categoria
    const productsUsingCategory = await executeQuery(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [categoryId]
    );
    
    if (productsUsingCategory[0].count > 0) {
      return res.status(400).json({
        message: 'Não é possível deletar uma categoria que possui produtos'
      });
    }
    
    // Deletar categoria
    await executeQuery('DELETE FROM categories WHERE id = ?', [categoryId]);
    
    res.json({
      message: 'Categoria removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover categoria:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/categories/:id/products - Produtos de uma categoria específica
router.get('/:id/products', optionalAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        message: 'ID de categoria inválido'
      });
    }
    
    // Verificar se a categoria existe
    const category = await executeQuery(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );
    
    if (category.length === 0) {
      return res.status(404).json({
        message: 'Categoria não encontrada'
      });
    }
    
    // Buscar produtos da categoria
    const query = `
      SELECT p.*, u.name as establishment_name
      FROM products p
      LEFT JOIN users u ON p.establishment_id = u.id
      WHERE p.category_id = ? AND p.active = 1
      ORDER BY p.name
    `;
    
    const products = await executeQuery(query, [categoryId]);
    
    res.json({
      category: category[0],
      products
    });
  } catch (error) {
    console.error('Erro ao buscar produtos da categoria:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router; 