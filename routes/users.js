const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { findUserById, updateUser, executeQuery } = require('../config/database');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user.id;

    // Validar dados
    if (name && (name.length < 2 || name.length > 100)) {
      return res.status(400).json({
        message: 'Nome deve ter entre 2 e 100 caracteres'
      });
    }

    if (phone && (phone.length < 10 || phone.length > 20)) {
      return res.status(400).json({
        message: 'Telefone deve ter entre 10 e 20 caracteres'
      });
    }

    if (address && (address.length < 2 || address.length > 500)) {
      return res.status(400).json({
        message: 'Endereço deve ter entre 2 e 500 caracteres'
      });
    }

    // Atualizar usuário
    await updateUser(userId, {
      name: name || req.user.name,
      phone: phone || req.user.phone,
      address: address || req.user.address
    });

    // Buscar usuário atualizado
    const updatedUser = await findUserById(userId);

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/users/delivery (para estabelecimentos verem entregadores disponíveis)
router.get('/delivery', authenticateToken, requireRole('ESTABLISHMENT'), async (req, res) => {
  try {
    const query = `
      SELECT id, name, email, phone, address 
      FROM users 
      WHERE role = 'DELIVERY' 
      ORDER BY name
    `;
    
    const deliveryUsers = await executeQuery(query);
    
    res.json({
      delivery_users: deliveryUsers
    });
  } catch (error) {
    console.error('Erro ao buscar entregadores:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/users/establishments (para clientes verem estabelecimentos)
router.get('/establishments', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const query = `
      SELECT id, name, email, phone, address 
      FROM users 
      WHERE role = 'ESTABLISHMENT' 
      ORDER BY name
    `;
    
    const establishments = await executeQuery(query);
    
    res.json({
      establishments
    });
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/users/customers (para estabelecimentos verem clientes)
router.get('/customers', authenticateToken, requireRole('ESTABLISHMENT'), async (req, res) => {
  try {
    const query = `
      SELECT id, name, email, phone, address 
      FROM users 
      WHERE role = 'CUSTOMER' 
      ORDER BY name
    `;
    
    const customers = await executeQuery(query);
    
    res.json({
      customers
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/users/:id (buscar usuário específico)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        message: 'ID de usuário inválido'
      });
    }

    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/users/:id (atualizar usuário específico)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, phone, address } = req.body;
    
    console.log('PUT /users/:id - Dados recebidos:', { userId, name, phone, address });
    
    if (isNaN(userId)) {
      return res.status(400).json({
        message: 'ID de usuário inválido'
      });
    }

    // Validar dados
    if (name && (name.length < 2 || name.length > 100)) {
      console.log('Erro de validação - nome:', name);
      return res.status(400).json({
        message: 'Nome deve ter entre 2 e 100 caracteres'
      });
    }

    if (phone && (phone.length < 10 || phone.length > 20)) {
      console.log('Erro de validação - telefone:', phone);
      return res.status(400).json({
        message: 'Telefone deve ter entre 10 e 20 caracteres'
      });
    }

    if (address && (address.length < 2 || address.length > 500)) {
      console.log('Erro de validação - endereço:', address, 'comprimento:', address.length);
      return res.status(400).json({
        message: 'Endereço deve ter entre 2 e 500 caracteres'
      });
    }

    // Verificar se o usuário existe
    const existingUser = await findUserById(userId);
    if (!existingUser) {
      console.log('Usuário não encontrado:', userId);
      return res.status(404).json({
        message: 'Usuário não encontrado'
      });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    console.log('Dados para atualização:', updateData);

    // Atualizar usuário
    await updateUser(userId, updateData);

    // Buscar usuário atualizado
    const updatedUser = await findUserById(userId);

    console.log('Usuário atualizado com sucesso:', updatedUser);

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router; 