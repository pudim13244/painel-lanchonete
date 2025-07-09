const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, isEstablishment } = require('../middleware/auth');
const { pool, executeQuery } = require('../config/database');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Função utilitária para calcular tempo decorrido
function getTimeAgo(dateString) {
  const timeDiff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(timeDiff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `há ${days} dia${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    return `há ${minutes} min`;
  }
}

// Função helper para criar perfil padrão se não existir
async function ensureProfileExists(userId) {
  const [profileRows] = await pool.execute('SELECT id FROM establishment_profile WHERE user_id = ?', [userId]);
  
  if (profileRows.length === 0) {
    const defaultProfile = {
      user_id: userId,
      restaurant_name: '',
      business_hours: [],
      delivery_radius: 5,
      pix_key: '',
      description: '',
      cuisine_type: '',
      minimum_order: 20.00,
      delivery_fee: 5.00,
      only_linked_delivery: false,
      accepted_payment_methods: JSON.stringify(['CASH', 'PIX', 'CREDIT', 'DEBIT'])
    };

    const [result] = await pool.execute(
      'INSERT INTO establishment_profile (user_id, restaurant_name, business_hours, delivery_radius, pix_key, description, cuisine_type, minimum_order, delivery_fee, logo_url, banner_url, instagram, whatsapp, only_linked_delivery, accepted_payment_methods) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)',
      [
        defaultProfile.user_id,
        defaultProfile.restaurant_name,
        JSON.stringify(defaultProfile.business_hours),
        defaultProfile.delivery_radius,
        defaultProfile.pix_key,
        defaultProfile.description,
        defaultProfile.cuisine_type,
        defaultProfile.minimum_order,
        defaultProfile.delivery_fee,
        defaultProfile.only_linked_delivery ? 1 : 0,
        defaultProfile.accepted_payment_methods
      ]
    );
    
    return result.insertId;
  }
  
  return profileRows[0].id;
}

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'painelquick';
    if (file.fieldname === 'logo') folder += '/logos';
    if (file.fieldname === 'banner') folder += '/banners';
    return {
      folder,
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
      transformation: [{ width: 1200, height: 800, crop: 'limit' }]
    };
  }
});

const uploadCloud = multer({ storage: cloudStorage });

// Middleware de parsing JSON para rotas que não são de upload
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true });

// ==================== ROTA DE PEDIDOS PRONTOS PARA ENTREGA ====================

// Buscar pedidos prontos para atribuição de entregador
router.get('/orders/ready-for-delivery', verifyToken, isEstablishment, async (req, res) => {
  console.log('=== ROTA READY-FOR-DELIVERY CHAMADA ===');
  console.log('Usuário autenticado:', req.user);
  console.log('Establishment ID:', req.user.id);
  
  try {
    const establishmentId = req.user.id;
    console.log('Buscando pedidos para establishment ID:', establishmentId);
    
    const [orders] = await pool.execute(`
      SELECT 
        o.id,
        o.total_amount,
        o.delivery_fee,
        o.payment_method,
        o.order_type,
        o.created_at,
        o.delivery_id,
        u.name as customer_name,
        u.phone as customer_phone,
        o.delivery_address as customer_address,
        d.name as delivery_person_name,
        d.phone as delivery_person_phone
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN users d ON o.delivery_id = d.id
      WHERE o.establishment_id = ? 
        AND o.status IN ('READY', 'PREPARING')
        AND o.order_type = 'DELIVERY'
      ORDER BY o.created_at ASC
    `, [establishmentId]);
    
    console.log('Pedidos encontrados:', orders.length);
    
    // Formatar dados dos pedidos
    const formattedOrders = orders.map(order => ({
      id: order.id,
      total_amount: Number(order.total_amount),
      delivery_fee: Number(order.delivery_fee),
      payment_method: order.payment_method,
      order_type: order.order_type,
      created_at: order.created_at,
      delivery_id: order.delivery_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      delivery_person_name: order.delivery_person_name,
      delivery_person_phone: order.delivery_person_phone,
      time_ago: getTimeAgo(order.created_at)
    }));
    
    console.log('Pedidos formatados:', formattedOrders);
    
    res.json({
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos prontos para entrega:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// ==================== ROTAS EXISTENTES ====================

// Buscar perfil do estabelecimento
router.get('/profile', verifyToken, isEstablishment, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM establishment_profile WHERE user_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      // Se não existir perfil, criar um perfil padrão
      const defaultProfile = {
        user_id: req.user.id,
        restaurant_name: '',
        business_hours: [],
        delivery_radius: 5,
        pix_key: '',
        description: '',
        cuisine_type: '',
        minimum_order: 20.00,
        delivery_fee: 5.00,
        only_linked_delivery: false
      };

      const [result] = await pool.execute(
        'INSERT INTO establishment_profile (user_id, restaurant_name, business_hours, delivery_radius, pix_key, description, cuisine_type, minimum_order, delivery_fee, logo_url, banner_url, instagram, whatsapp, only_linked_delivery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?)',
        [
          defaultProfile.user_id,
          defaultProfile.restaurant_name,
          JSON.stringify(defaultProfile.business_hours),
          defaultProfile.delivery_radius,
          defaultProfile.pix_key,
          defaultProfile.description,
          defaultProfile.cuisine_type,
          defaultProfile.minimum_order,
          defaultProfile.delivery_fee,
          defaultProfile.only_linked_delivery ? 1 : 0
        ]
      );

      defaultProfile.id = result.insertId;
      return res.json(defaultProfile);
    }

    // Buscar horários detalhados
    const [hoursRows] = await pool.execute(
      'SELECT id, day_of_week, open_time, close_time FROM establishment_business_hours WHERE establishment_id = ?',
      [rows[0].id]
    );
    const profile = rows[0];
    profile.business_hours = hoursRows;
    
    // Converter only_linked_delivery para boolean
    if (profile.only_linked_delivery !== undefined) {
      profile.only_linked_delivery = profile.only_linked_delivery === 1 || profile.only_linked_delivery === true;
    } else {
      profile.only_linked_delivery = false;
    }
    
    // Montar URLs completas para logo e banner
    const baseUrl = req.protocol + '://' + req.get('host');
    if (profile.logo_url) {
      profile.logo_url = baseUrl + profile.logo_url;
    }
    if (profile.banner_url) {
      profile.banner_url = baseUrl + profile.banner_url;
    }
    
    console.log('Profile sendo retornado:', JSON.stringify(profile, null, 2));
    res.json(profile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar perfil do estabelecimento',
      error: error.message 
    });
  }
});

// Atualizar perfil do estabelecimento
router.put('/profile', jsonParser, urlencodedParser, verifyToken, isEstablishment, async (req, res) => {
  try {
    const {
      restaurant_name,
      business_hours, // agora é um array de objetos {day_of_week, open_time, close_time}
      delivery_radius,
      pix_key,
      description,
      cuisine_type,
      minimum_order,
      delivery_fee,
      instagram,
      whatsapp,
      accepted_payment_methods,
      only_linked_delivery
    } = req.body;

    // Garantir que o perfil existe
    const establishmentId = await ensureProfileExists(req.user.id);

    // Log para debug
    console.log('DEBUG BACKEND - only_linked_delivery:', only_linked_delivery, 'body:', req.body);
    // Atualizar dados principais
    await pool.execute(
      `UPDATE establishment_profile SET 
        restaurant_name = ?, 
        delivery_radius = ?, 
        pix_key = ?, 
        description = ?, 
        cuisine_type = ?, 
        minimum_order = ?, 
        delivery_fee = ?,
        instagram = ?,
        whatsapp = ?,
        accepted_payment_methods = ?,
        only_linked_delivery = ?
      WHERE user_id = ?`,
      [
        restaurant_name,
        delivery_radius,
        pix_key,
        description,
        cuisine_type,
        minimum_order,
        delivery_fee,
        instagram,
        whatsapp,
        accepted_payment_methods ? JSON.stringify(accepted_payment_methods) : JSON.stringify(['CASH', 'PIX', 'CREDIT', 'DEBIT']),
        only_linked_delivery ? 1 : 0,
        req.user.id
      ]
    );

    // Atualizar horários: remover todos e inserir os novos
    await pool.execute('DELETE FROM establishment_business_hours WHERE establishment_id = ?', [establishmentId]);
    if (Array.isArray(business_hours)) {
      for (const h of business_hours) {
        await pool.execute(
          'INSERT INTO establishment_business_hours (establishment_id, day_of_week, open_time, close_time) VALUES (?, ?, ?, ?)',
          [establishmentId, h.day_of_week, h.open_time, h.close_time]
        );
      }
    }

    res.json({ message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar perfil do estabelecimento',
      error: error.message 
    });
  }
});

// Upload de logo
router.post('/logo', verifyToken, isEstablishment, uploadCloud.single('logo'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }
    await ensureProfileExists(req.user.id);
    const logoUrl = req.file.path;
    await pool.execute(
      'UPDATE establishment_profile SET logo_url = ? WHERE user_id = ?',
      [logoUrl, req.user.id]
    );
    res.json({ logo_url: logoUrl });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer upload do logo', error: error.message });
  }
});

// Upload de banner
router.post('/banner', verifyToken, isEstablishment, uploadCloud.single('banner'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }
    await ensureProfileExists(req.user.id);
    const bannerUrl = req.file.path;
    await pool.execute(
      'UPDATE establishment_profile SET banner_url = ? WHERE user_id = ?',
      [bannerUrl, req.user.id]
    );
    res.json({ banner_url: bannerUrl });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer upload do banner', error: error.message });
  }
});

// Buscar pedidos do estabelecimento
router.get('/orders', verifyToken, isEstablishment, async (req, res) => {
  try {
    const establishmentId = req.user.id;
    const { status } = req.query;
    
    // Query otimizada com JOINs para evitar N+1
    let query = `
      SELECT 
        o.*,
        u.name as customer_name,
        u.phone as customer_phone,
        o.delivery_address as customer_address,
        d.name as delivery_person_name,
        oi.id as item_id,
        oi.quantity as item_quantity,
        oi.price as item_price,
        oi.obs as item_obs,
        p.id as product_id,
        p.name as product_name,
        p.price as product_price,
        oia.id as addition_id,
        oia.price as addition_price,
        opt.id as option_id,
        opt.name as option_name,
        opt.additional_price as option_additional_price
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN users d ON o.delivery_id = d.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN order_item_acrescimo oia ON oi.id = oia.order_item_id
      LEFT JOIN options opt ON oia.acrescimo_id = opt.id
      WHERE o.establishment_id = ?
    `;
    
    let params = [establishmentId];
    
    if (status && status !== 'all') {
      query += ' AND o.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY o.created_at DESC, oi.id ASC';
    
    const [rows] = await pool.execute(query, params);
    
    // Processar resultados para agrupar por pedido
    const ordersMap = new Map();
    
    for (const row of rows) {
      const orderId = row.id;
      
      if (!ordersMap.has(orderId)) {
        // Criar objeto do pedido
        ordersMap.set(orderId, {
          id: row.id,
          customer_id: row.customer_id,
          establishment_id: row.establishment_id,
          delivery_id: row.delivery_id,
          total_amount: Number(row.total_amount ?? row.total ?? 0),
          delivery_fee: Number(row.delivery_fee ?? 0),
          status: row.status,
          payment_method: row.payment_method,
          order_type: row.order_type,
          amount_paid: row.amount_paid,
          change_amount: row.change_amount,
          payment_status: row.payment_status,
          delivery_address: row.delivery_address,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          customer_address: row.customer_address,
          delivery_person_name: row.delivery_person_name,
          items: []
        });
      }
      
      const order = ordersMap.get(orderId);
      
      // Adicionar item se existir
      if (row.item_id && !order.items.find(item => item.id === row.item_id)) {
        const item = {
          id: row.item_id,
          order_id: row.order_id,
          product_id: row.product_id,
          quantity: row.item_quantity,
          price: row.item_price,
          obs: row.item_obs,
          product_name: row.product_name,
          product_price: row.product_price,
          additions: []
        };
        order.items.push(item);
      }
      
      // Adicionar acréscimo se existir
      if (row.addition_id && order.items.length > 0) {
        const item = order.items.find(item => item.id === row.item_id);
        if (item && !item.additions.find(add => add.id === row.addition_id)) {
          item.additions.push({
            id: row.addition_id,
            name: row.option_name,
            price: row.addition_price,
            additional_price: row.option_additional_price
          });
        }
      }
    }
    
    const orders = Array.from(ordersMap.values());
    
    res.json(orders);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// Buscar detalhes de um pedido específico do estabelecimento
router.get('/orders/:id', verifyToken, isEstablishment, async (req, res) => {
  try {
    const establishmentId = req.user.id;
    const orderId = req.params.id;
    
    // Query otimizada com JOINs para evitar N+1
    const [rows] = await pool.execute(`
      SELECT 
        o.*,
        u.name as customer_name,
        u.phone as customer_phone,
        o.delivery_address as customer_address,
        d.name as delivery_person_name,
        ep.restaurant_name as restaurant_name,
        ep.pix_key,
        oi.id as item_id,
        oi.quantity as item_quantity,
        oi.price as item_price,
        oi.obs as item_obs,
        p.id as product_id,
        p.name as product_name,
        p.price as product_price,
        oia.id as addition_id,
        oia.price as addition_price,
        opt.id as option_id,
        opt.name as option_name,
        opt.additional_price as option_additional_price
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN users d ON o.delivery_id = d.id
      LEFT JOIN establishment_profile ep ON o.establishment_id = ep.user_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN order_item_acrescimo oia ON oi.id = oia.order_item_id
      LEFT JOIN options opt ON oia.acrescimo_id = opt.id
      WHERE o.id = ? AND o.establishment_id = ?
      ORDER BY oi.id ASC
    `, [orderId, establishmentId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Processar resultados para criar o objeto do pedido
    const firstRow = rows[0];
    const order = {
      id: firstRow.id,
      customer_id: firstRow.customer_id,
      establishment_id: firstRow.establishment_id,
      delivery_id: firstRow.delivery_id,
      total_amount: Number(firstRow.total_amount ?? firstRow.total ?? 0),
      delivery_fee: Number(firstRow.delivery_fee ?? 0),
      status: firstRow.status,
      payment_method: firstRow.payment_method,
      order_type: firstRow.order_type,
      amount_paid: firstRow.amount_paid,
      change_amount: firstRow.change_amount,
      payment_status: firstRow.payment_status,
      delivery_address: firstRow.delivery_address,
      notes: firstRow.notes,
      created_at: firstRow.created_at,
      updated_at: firstRow.updated_at,
      customer_name: firstRow.customer_name,
      customer_phone: firstRow.customer_phone,
      customer_address: firstRow.customer_address,
      delivery_person_name: firstRow.delivery_person_name,
      pix_key: firstRow.pix_key,
      restaurant_name: firstRow.restaurant_name,
      items: []
    };
    
    // Processar itens e acréscimos
    const itemsMap = new Map();
    
    for (const row of rows) {
      if (row.item_id && !itemsMap.has(row.item_id)) {
        const item = {
          id: row.item_id,
          order_id: row.order_id,
          product_id: row.product_id,
          quantity: row.item_quantity,
          price: row.item_price,
          obs: row.item_obs,
          product_name: row.product_name,
          product_price: row.product_price,
          additions: []
        };
        
        itemsMap.set(row.item_id, item);
        order.items.push(item);
      }
      
      // Adicionar acréscimo se existir
      if (row.addition_id && itemsMap.has(row.item_id)) {
        const item = itemsMap.get(row.item_id);
        const addition = {
          id: row.addition_id,
          name: row.option_name,
          price: row.addition_price,
          additional_price: row.option_additional_price
        };
        
        // Verificar se o acréscimo já foi adicionado
        if (!item.additions.find(add => add.id === addition.id)) {
          item.additions.push(addition);
        }
      }
    }
    
    res.json(order);
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// Atualizar status de um pedido do estabelecimento
router.put('/orders/:id/status', jsonParser, urlencodedParser, verifyToken, isEstablishment, async (req, res) => {
  try {
    console.log('Backend: Recebida requisição para atualizar status');
    console.log('Backend: req.params:', req.params);
    console.log('Backend: req.body:', req.body);
    console.log('Backend: req.user:', req.user);
    
    const establishmentId = req.user.id;
    const orderId = req.params.id;
    const { status } = req.body;
    
    console.log('Backend: Dados extraídos:', { establishmentId, orderId, status });
    
    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      console.log('Backend: Status inválido:', status);
      return res.status(400).json({ message: 'Status inválido' });
    }
    
    // Verificar se o pedido pertence ao estabelecimento
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND establishment_id = ?',
      [orderId, establishmentId]
    );
    
    console.log('Backend: Pedidos encontrados:', orders.length);
    
    if (orders.length === 0) {
      console.log('Backend: Pedido não encontrado');
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Atualizar status
    await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );
    
    console.log('Backend: Status atualizado com sucesso');
    
    res.json({ 
      message: 'Status do pedido atualizado com sucesso',
      status 
    });
  } catch (error) {
    console.error('Backend: Erro ao atualizar status do pedido:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar status do pedido',
      error: error.message 
    });
  }
});

// Atualizar pedido completo (método de pagamento, endereço, itens, etc.)
router.put('/orders/:id', jsonParser, urlencodedParser, verifyToken, isEstablishment, async (req, res) => {
  try {
    console.log('Backend: Recebida requisição para atualizar pedido completo');
    console.log('Backend: req.params:', req.params);
    console.log('Backend: req.body:', req.body);
    console.log('Backend: req.user:', req.user);
    
    const establishmentId = req.user.id;
    const orderId = req.params.id;
    const { 
      status, 
      payment_method, 
      amount_paid, 
      customer_address, 
      notes, 
      items, 
      total_amount 
    } = req.body;
    
    console.log('Backend: Dados extraídos:', { 
      establishmentId, 
      orderId, 
      status, 
      payment_method, 
      amount_paid, 
      customer_address,
      itemsCount: items?.length,
      total_amount 
    });
    
    // Verificar se o pedido pertence ao estabelecimento
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND establishment_id = ?',
      [orderId, establishmentId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    const order = orders[0];
    
    // Iniciar transação
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Atualizar dados básicos do pedido
      const updateFields = [];
      const updateValues = [];
      
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      
      if (payment_method !== undefined) {
        updateFields.push('payment_method = ?');
        updateValues.push(payment_method);
      }
      
      if (amount_paid !== undefined) {
        updateFields.push('amount_paid = ?');
        updateValues.push(amount_paid);
      }
      
      if (total_amount !== undefined) {
        updateFields.push('total_amount = ?');
        updateValues.push(total_amount);
      }
      
      if (updateFields.length > 0) {
        updateValues.push(orderId);
        
        await connection.execute(
          `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }
      
      // Atualizar itens se fornecidos
      if (items && Array.isArray(items)) {
        // Remover itens existentes
        await connection.execute('DELETE FROM order_item_acrescimo WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = ?)', [orderId]);
        await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        
        // Inserir novos itens
        for (const item of items) {
          const [itemResult] = await connection.execute(`
            INSERT INTO order_items (order_id, product_id, quantity, price, obs)
            VALUES (?, ?, ?, ?, ?)
          `, [orderId, item.product_id, item.quantity || 1, item.price, item.obs || null]);
          
          const orderItemId = itemResult.insertId;
          
          // Inserir acréscimos se existirem
          if (item.additions && Array.isArray(item.additions) && item.additions.length > 0) {
            for (const addition of item.additions) {
              await connection.execute(
                'INSERT INTO order_item_acrescimo (order_item_id, acrescimo_id, price) VALUES (?, ?, ?)',
                [orderItemId, addition.acrescimo_id || addition.id, addition.price || 0]
              );
            }
          }
        }
      }
      
      await connection.commit();
      
      // Buscar pedido atualizado
      const [updatedOrders] = await pool.execute(`
        SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.address as customer_address,
               d.name as delivery_person_name, ep.pix_key
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN users d ON o.delivery_id = d.id
        LEFT JOIN establishment_profile ep ON o.establishment_id = ep.user_id
        WHERE o.id = ? AND o.establishment_id = ?
      `, [orderId, establishmentId]);
      
      if (updatedOrders.length === 0) {
        throw new Error('Erro ao buscar pedido atualizado');
      }
      
      const updatedOrder = updatedOrders[0];
      
      // Buscar itens atualizados
      const [updatedItems] = await pool.execute(`
        SELECT oi.*, p.name as product_name, p.price as product_price
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `, [orderId]);
      
      // Buscar acréscimos dos itens
      for (let item of updatedItems) {
        const [additions] = await pool.execute(`
          SELECT oia.*, opt.name, opt.additional_price
          FROM order_item_acrescimo oia
          LEFT JOIN options opt ON oia.acrescimo_id = opt.id
          WHERE oia.order_item_id = ?
        `, [item.id]);
        
        item.additions = additions;
      }
      
      updatedOrder.items = updatedItems;
      
      console.log('Backend: Pedido atualizado com sucesso');
      
      res.json(updatedOrder);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Backend: Erro ao atualizar pedido:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar pedido',
      error: error.message 
    });
  }
});

// ==================== ROTAS DO DASHBOARD ====================

// Buscar dados completos do dashboard
router.get('/dashboard', verifyToken, isEstablishment, async (req, res) => {
  try {
    const establishmentId = req.user.id;
    
    // Buscar estatísticas
    const [statsResult] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() THEN o.total_amount ELSE 0 END), 0) as faturamento_hoje,
        COUNT(CASE WHEN DATE(o.created_at) = CURDATE() THEN 1 END) as pedidos_hoje,
        COUNT(DISTINCT o.customer_id) as clientes_ativos,
        COALESCE(AVG(o.total_amount), 0) as ticket_medio,
        COALESCE(SUM(CASE WHEN DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN o.total_amount ELSE 0 END), 0) as faturamento_ontem,
        COUNT(CASE WHEN DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 END) as pedidos_ontem
      FROM orders o
      WHERE o.establishment_id = ? AND o.status != 'CANCELLED'
    `, [establishmentId]);
    
    const stats = statsResult[0];
    
    // Calcular crescimento
    const crescimentoFaturamento = stats.faturamento_ontem > 0 
      ? ((stats.faturamento_hoje - stats.faturamento_ontem) / stats.faturamento_ontem) * 100 
      : 0;
    
    const crescimentoPedidos = stats.pedidos_ontem > 0 
      ? ((stats.pedidos_hoje - stats.pedidos_ontem) / stats.pedidos_ontem) * 100 
      : 0;
    
    // Buscar dados de vendas dos últimos 7 dias
    const [salesData] = await pool.execute(`
      SELECT 
        DATE_FORMAT(o.created_at, '%a') as name,
        COALESCE(SUM(o.total_amount), 0) as vendas
      FROM orders o
      WHERE o.establishment_id = ? 
        AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND o.status != 'CANCELLED'
      GROUP BY DATE(o.created_at)
      ORDER BY o.created_at
    `, [establishmentId]);
    
    // Buscar produtos mais vendidos
    const [topProducts] = await pool.execute(`
      SELECT 
        p.name,
        COUNT(oi.id) as pedidos,
        COALESCE(SUM(oi.price * oi.quantity), 0) as receita
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.establishment_id = ? AND o.status != 'CANCELLED'
      GROUP BY p.id, p.name
      ORDER BY pedidos DESC
      LIMIT 5
    `, [establishmentId]);
    
    // Buscar melhores clientes
    const [topCustomers] = await pool.execute(`
      SELECT 
        u.name,
        COUNT(o.id) as pedidos,
        COALESCE(SUM(o.total_amount), 0) as gasto
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      WHERE o.establishment_id = ? AND o.status != 'CANCELLED'
      GROUP BY u.id, u.name
      ORDER BY gasto DESC
      LIMIT 5
    `, [establishmentId]);
    
    // Buscar distribuição por tipo de pedido
    const [orderTypeData] = await pool.execute(`
      SELECT 
        o.order_type as name,
        COUNT(*) as value
      FROM orders o
      WHERE o.establishment_id = ? AND o.status != 'CANCELLED'
      GROUP BY o.order_type
    `, [establishmentId]);
    
    // Adicionar cores e nomes aos tipos de pedido
    const orderTypeColors = {
      'DELIVERY': '#f97316',
      'PICKUP': '#22c55e',
      'DINE_IN': '#3b82f6'
    };
    const orderTypeNames = {
      'DELIVERY': 'Entrega',
      'PICKUP': 'Retirada',
      'DINE_IN': 'Local'
    };
    const orderTypeDataWithColors = orderTypeData.map(item => ({
      ...item,
      name: orderTypeNames[item.name] || item.name,
      color: orderTypeColors[item.name] || '#6b7280'
    }));
    
    // Buscar pedidos recentes
    const [recentOrders] = await pool.execute(`
      SELECT 
        o.id,
        u.name as customer,
        o.total_amount as total,
        o.status,
        o.created_at
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      WHERE o.establishment_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `, [establishmentId]);
    
    // Formatar pedidos recentes
    const formattedRecentOrders = recentOrders.map(order => {
      const timeDiff = Date.now() - new Date(order.created_at).getTime();
      const minutes = Math.floor(timeDiff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      let time;
      if (days > 0) {
        time = `há ${days} dia${days > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        time = `há ${hours} hora${hours > 1 ? 's' : ''}`;
      } else {
        time = `há ${minutes} min`;
      }
      
      return {
        id: order.id.toString().padStart(3, '0'),
        customer: order.customer,
        total: Number(order.total),
        status: order.status.toLowerCase(),
        time
      };
    });
    
    // Buscar número de entregadores vinculados
    const [deliveryCountResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM establishment_delivery
      WHERE establishment_id = ?
    `, [establishmentId]);

    // Retornar todos os dados do dashboard
    res.json({
      stats: {
        faturamentoHoje: stats.faturamento_hoje,
        pedidosHoje: stats.pedidos_hoje,
        clientesAtivos: stats.clientes_ativos,
        ticketMedio: stats.ticket_medio,
        faturamentoOntem: stats.faturamento_ontem,
        pedidosOntem: stats.pedidos_ontem,
        crescimentoFaturamento,
        crescimentoPedidos
      },
      salesData,
      topProducts,
      topCustomers,
      orderTypeData: orderTypeDataWithColors,
      recentOrders: formattedRecentOrders,
      deliveryCount: deliveryCountResult[0]?.total || 0
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard', error: error.message });
  }
});

// Endpoint para listar tipos únicos de cozinha
router.get('/cuisine-types', verifyToken, isEstablishment, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT DISTINCT cuisine_type FROM establishment_profile');
    const types = rows.map(r => r.cuisine_type).filter(Boolean);
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar tipos de cozinha', error: error.message });
  }
});

// Endpoint para listar entregadores vinculados ao estabelecimento
router.get('/delivery-people', verifyToken, isEstablishment, async (req, res) => {
  try {
    const establishmentId = req.user.id;
    const [rows] = await pool.execute(`
      SELECT 
        u.id, 
        u.name, 
        u.email,
        COUNT(o.id) as active_orders,
        (COUNT(o.id) < 3) as is_available
      FROM users u
      INNER JOIN establishment_delivery ed ON u.id = ed.delivery_id
      LEFT JOIN orders o ON u.id = o.delivery_id AND o.status IN ('READY', 'DELIVERING')
      WHERE ed.establishment_id = ?
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `, [establishmentId]);
    res.json({ delivery_people: rows });
  } catch (error) {
    console.error('Erro ao buscar entregadores:', error);
    res.status(500).json({ message: 'Erro ao buscar entregadores', error: error.message });
  }
});

// Atribuir entregador automaticamente (para o com menos pedidos)
router.post('/orders/:orderId/assign-delivery-auto', jsonParser, urlencodedParser, verifyToken, isEstablishment, async (req, res) => {
  try {
    const establishmentId = req.user.id;
    const orderId = req.params.orderId;
    // Verificar se o pedido pertence ao estabelecimento
    const [orders] = await pool.execute(`
      SELECT * FROM orders 
      WHERE id = ? AND establishment_id = ? AND order_type = 'DELIVERY'
    `, [orderId, establishmentId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    const order = orders[0];
    // Verificar se o pedido está em status adequado
    if (!['PENDING', 'PREPARING', 'READY'].includes(order.status)) {
      return res.status(400).json({ message: 'Pedido não pode receber entregador neste status' });
    }
    // Buscar configuração do estabelecimento
    const [profileRows] = await pool.execute('SELECT only_linked_delivery FROM establishment_profile WHERE user_id = ?', [establishmentId]);
    const onlyLinked = profileRows[0]?.only_linked_delivery === 1;
    // Buscar entregadores conforme configuração
    let selectedDelivery;
    if (onlyLinked) {
      // Buscar entregadores vinculados
      const [deliveryPeople] = await pool.execute(`
        SELECT 
          u.id,
          u.name,
          COUNT(o.id) as active_orders
        FROM users u
        INNER JOIN establishment_delivery ed ON u.id = ed.delivery_id AND ed.establishment_id = ?
        LEFT JOIN orders o ON u.id = o.delivery_id AND o.status IN ('READY', 'DELIVERING')
        WHERE u.role = 'DELIVERY'
        GROUP BY u.id, u.name
        HAVING active_orders < 3
        ORDER BY active_orders ASC, u.name ASC
      `, [establishmentId]);
      if (deliveryPeople.length === 0) {
        return res.status(400).json({ message: 'Nenhum entregador vinculado disponível no momento' });
      }
      selectedDelivery = deliveryPeople[0];
    } else {
      // Buscar qualquer entregador disponível
      const [anyDelivery] = await pool.execute(`
        SELECT 
          u.id,
          u.name,
          COUNT(o.id) as active_orders
        FROM users u
        LEFT JOIN orders o ON u.id = o.delivery_id AND o.status IN ('READY', 'DELIVERING')
        WHERE u.role = 'DELIVERY'
        GROUP BY u.id, u.name
        HAVING active_orders < 3
        ORDER BY active_orders ASC, u.name ASC
        LIMIT 1
      `);
      if (anyDelivery.length === 0) {
        return res.status(400).json({ message: 'Nenhum entregador disponível no momento' });
      }
      selectedDelivery = anyDelivery[0];
      // Opcional: vincular temporariamente esse entregador ao estabelecimento para este pedido
      await pool.execute(`
        INSERT INTO establishment_delivery (establishment_id, delivery_id) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE establishment_id = establishment_id
      `, [establishmentId, selectedDelivery.id]);
    }
    // Atualizar pedido com o entregador
    await pool.execute(`
      UPDATE orders 
      SET delivery_id = ?, status = 'READY' 
      WHERE id = ?
    `, [selectedDelivery.id, orderId]);
    res.json({ 
      message: 'Entregador atribuído automaticamente',
      delivery_id: selectedDelivery.id,
      delivery_name: selectedDelivery.name,
      active_orders: selectedDelivery.active_orders
    });
  } catch (error) {
    console.error('Erro ao atribuir entregador automaticamente:', error);
    res.status(500).json({ 
      message: 'Erro ao atribuir entregador automaticamente',
      error: error.message 
    });
  }
});

module.exports = router;