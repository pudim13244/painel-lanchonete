const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

const router = express.Router();

// GET /api/establishments/profile - Perfil do estabelecimento autenticado
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT ep.*
      FROM establishment_profile ep
      WHERE ep.user_id = ?
    `;
    const profiles = await executeQuery(query, [userId]);
    if (profiles.length === 0) {
      return res.status(404).json({ message: 'Perfil do estabelecimento não encontrado' });
    }
    
    // Parse o JSON dos métodos de pagamento aceitos
    const profile = profiles[0];
    if (profile.accepted_payment_methods) {
      try {
        profile.accepted_payment_methods = JSON.parse(profile.accepted_payment_methods);
      } catch (e) {
        profile.accepted_payment_methods = ['CASH', 'PIX', 'CREDIT', 'DEBIT'];
      }
    } else {
      profile.accepted_payment_methods = ['CASH', 'PIX', 'CREDIT', 'DEBIT'];
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Erro ao buscar perfil do estabelecimento:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// PUT /api/establishments/profile - Atualizar perfil do estabelecimento
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    const query = `
      UPDATE establishment_profile 
      SET 
        restaurant_name = ?,
        business_hours = ?,
        delivery_radius = ?,
        pix_key = ?,
        description = ?,
        cuisine_type = ?,
        minimum_order = ?,
        delivery_fee = ?,
        instagram = ?,
        whatsapp = ?,
        accepted_payment_methods = ?
      WHERE user_id = ?
    `;
    
    await executeQuery(query, [
      updateData.restaurant_name,
      updateData.business_hours,
      updateData.delivery_radius,
      updateData.pix_key,
      updateData.description,
      updateData.cuisine_type,
      updateData.minimum_order,
      updateData.delivery_fee,
      updateData.instagram,
      updateData.whatsapp,
      updateData.accepted_payment_methods ? JSON.stringify(updateData.accepted_payment_methods) : JSON.stringify(['CASH', 'PIX', 'CREDIT', 'DEBIT']),
      userId
    ]);
    
    res.json({ message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil do estabelecimento:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/establishments - Listar estabelecimentos
router.get('/', optionalAuth, async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.phone, ep.restaurant_name, ep.description, ep.cuisine_type, ep.logo_url
      FROM users u
      LEFT JOIN establishment_profile ep ON u.id = ep.user_id
      WHERE u.role = 'ESTABLISHMENT'
      ORDER BY u.name
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

// GET /api/establishments/:id - Buscar estabelecimento específico
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const establishmentId = parseInt(req.params.id);
    
    if (isNaN(establishmentId)) {
      return res.status(400).json({
        message: 'ID de estabelecimento inválido'
      });
    }
    
    const query = `
      SELECT u.id, u.name, u.email, u.phone, ep.restaurant_name, ep.description, ep.cuisine_type, ep.logo_url, ep.business_hours, ep.delivery_fee, ep.minimum_order, ep.accepted_payment_methods
      FROM users u
      LEFT JOIN establishment_profile ep ON u.id = ep.user_id
      WHERE u.id = ? AND u.role = 'ESTABLISHMENT'
    `;
    
    const establishments = await executeQuery(query, [establishmentId]);
    
    if (establishments.length === 0) {
      return res.status(404).json({
        message: 'Estabelecimento não encontrado'
      });
    }
    
    // Parse o JSON dos métodos de pagamento aceitos
    const establishment = establishments[0];
    if (establishment.accepted_payment_methods) {
      try {
        establishment.accepted_payment_methods = JSON.parse(establishment.accepted_payment_methods);
      } catch (e) {
        establishment.accepted_payment_methods = ['CASH', 'PIX', 'CREDIT', 'DEBIT'];
      }
    } else {
      establishment.accepted_payment_methods = ['CASH', 'PIX', 'CREDIT', 'DEBIT'];
    }
    
    res.json({
      establishment
    });
  } catch (error) {
    console.error('Erro ao buscar estabelecimento:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router; 