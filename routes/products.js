const express = require('express');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { executeQuery, getProducts } = require('../config/database');
const db = require('../db');
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Configuração do multer para salvar imagens em public/uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'painelquick',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  }
});
const upload = multer({ storage: storage });

// GET /api/products - Listar produtos (público)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { establishment_id } = req.query;

    if (!establishment_id) {
      return res.status(400).json({ error: 'ID do estabelecimento é obrigatório' });
    }

    // Query principal para buscar produtos
    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url,
        c.id as category_id,
        c.name as category_name,
        pog.group_id as additional_group_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_option_groups pog ON p.id = pog.product_id
      WHERE p.establishment_id = ?
    `;

    const [products] = await db.query(productsQuery, [establishment_id]);

    // Organizar produtos e buscar grupos de adicionais
    const productsMap = new Map();
    
    for (const row of products) {
      if (!productsMap.has(row.id)) {
        productsMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          price: row.price,
          image_url: row.image_url,
          category: {
            id: row.category_id,
            name: row.category_name
          },
          additional_groups: []
        });
      }

      if (row.additional_group_id) {
        // Buscar informações do grupo de adicionais
        const [groupInfo] = await db.query(`
          SELECT id, name, product_type, min_selections, max_selections, is_required
          FROM option_groups
          WHERE id = ?
        `, [row.additional_group_id]);

        if (groupInfo.length > 0) {
          // Buscar opções do grupo
          const [options] = await db.query(`
            SELECT id, name, additional_price as price, description, is_available
            FROM options
            WHERE group_id = ?
          `, [row.additional_group_id]);

          const product = productsMap.get(row.id);
          if (!product.additional_groups.some(g => g.id === groupInfo[0].id)) {
            product.additional_groups.push({
              id: groupInfo[0].id,
              name: groupInfo[0].name,
              type: groupInfo[0].product_type,
              min_selections: groupInfo[0].min_selections,
              max_selections: groupInfo[0].max_selections,
              is_required: groupInfo[0].is_required,
              options: options
            });
          }
        }
      }
    }

    const formattedProducts = Array.from(productsMap.values());
    res.json({ products: formattedProducts });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/products/:id - Buscar produto específico
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        message: 'ID de produto inválido'
      });
    }
    
    const query = `
      SELECT p.*, c.name as category_name, u.name as establishment_name
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.establishment_id = u.id
      WHERE p.id = ?
    `;
    
    const products = await executeQuery(query, [productId]);
    
    if (products.length === 0) {
      return res.status(404).json({
        message: 'Produto não encontrado'
      });
    }
    
    res.json({
      product: products[0]
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/products - Criar produto (apenas estabelecimentos, com upload de imagem)
router.post('/', authenticateToken, requireRole('ESTABLISHMENT'), upload.single('image'), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      category_id, 
      establishment_id,
      additional_groups 
    } = req.body;

    // Se houver upload de imagem, pega a URL do Cloudinary
    let image_url = req.body.image_url;
    if (req.file && req.file.path) {
      image_url = req.file.path;
    }

    if (!name || !price || !category_id || !establishment_id) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Inserir produto
      const [result] = await connection.query(
        `INSERT INTO products (name, description, price, category_id, establishment_id, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, category_id, establishment_id, image_url]
      );

      const productId = result.insertId;

      // Inserir grupos de adicionais se existirem
      if (additional_groups && Array.isArray(additional_groups)) {
        for (const groupId of additional_groups) {
          await connection.query(
            `INSERT INTO product_option_groups (product_id, group_id)
             VALUES (?, ?)`,
            [productId, groupId]
          );
        }
      }

      await connection.commit();

      res.status(201).json({
        id: productId,
        name,
        description,
        price,
        category_id,
        establishment_id,
        image_url,
        additional_groups
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/products/:id - Editar produto (apenas estabelecimentos, com upload de imagem)
router.put('/:id', authenticateToken, requireRole('ESTABLISHMENT'), upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, category_id, establishment_id, additional_groups } = req.body;

    // Se houver upload de imagem, pega a URL do Cloudinary
    let image_url = req.body.image_url;
    if (req.file && req.file.path) {
      image_url = req.file.path;
    }

    if (!name || !price || !category_id || !establishment_id) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Atualizar produto
      await connection.query(
        `UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, establishment_id = ?, image_url = ? WHERE id = ?`,
        [name, description, price, category_id, establishment_id, image_url, productId]
      );

      // Atualizar grupos de adicionais
      await connection.query('DELETE FROM product_option_groups WHERE product_id = ?', [productId]);
      if (additional_groups && Array.isArray(additional_groups)) {
        for (const groupId of additional_groups) {
          await connection.query(
            `INSERT INTO product_option_groups (product_id, group_id) VALUES (?, ?)`,
            [productId, groupId]
          );
        }
      }

      await connection.commit();
      res.json({
        id: productId,
        name,
        description,
        price,
        category_id,
        establishment_id,
        image_url,
        additional_groups
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao editar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/products/:id - Deletar produto
router.delete('/:id', authenticateToken, requireRole('ESTABLISHMENT'), async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Remover grupos de adicionais
      await connection.query(
        'DELETE FROM product_option_groups WHERE product_id = ?',
        [id]
      );

      // Remover produto
      await connection.query(
        'DELETE FROM products WHERE id = ?',
        [id]
      );

      await connection.commit();
      res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/products/establishment/:id - Produtos de um estabelecimento específico
router.get('/establishment/:id', optionalAuth, async (req, res) => {
  try {
    const establishmentId = parseInt(req.params.id);
    
    if (isNaN(establishmentId)) {
      return res.status(400).json({
        message: 'ID de estabelecimento inválido'
      });
    }
    
    const products = await getProducts(establishmentId);
    
    res.json({
      products
    });
  } catch (error) {
    console.error('Erro ao buscar produtos do estabelecimento:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/products/:id/groups - Atualizar grupos de adicionais de um produto
router.put('/:id/groups', authenticateToken, requireRole('ESTABLISHMENT'), async (req, res) => {
  const productId = parseInt(req.params.id);
  let groupIds = req.body.group_ids;

  // Permitir receber como string JSON
  if (typeof groupIds === 'string') {
    try { groupIds = JSON.parse(groupIds); } catch {}
  }
  if (!Array.isArray(groupIds)) return res.status(400).json({ error: 'group_ids deve ser array' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Remove todos os grupos antigos
    await connection.query('DELETE FROM product_option_groups WHERE product_id = ?', [productId]);
    // Insere os novos grupos
    for (const groupId of groupIds) {
      await connection.query(
        'INSERT INTO product_option_groups (product_id, group_id) VALUES (?, ?)',
        [productId, groupId]
      );
    }
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: 'Erro ao atualizar grupos do produto', details: err.message });
  } finally {
    connection.release();
  }
});

// Servir imagens
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

module.exports = router; 