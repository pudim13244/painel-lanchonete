const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery, getOrders, pool } = require('../config/database');

const router = express.Router();

// Funções de broadcast locais (placeholder)
let broadcastNewOrder = (order) => {
  console.log('Novo pedido criado:', order.id);
};

let broadcastOrderUpdate = (order) => {
  console.log('Pedido atualizado:', order.id);
};

// Função para configurar as funções de broadcast (chamada pelo server.js)
function setBroadcastFunctions(newOrderFn, updateFn) {
  broadcastNewOrder = newOrderFn;
  broadcastOrderUpdate = updateFn;
}

// GET /api/orders - Listar pedidos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    const orders = await getOrders(userId, role);
    
    res.json({
      orders
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/orders/:id - Buscar pedido específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        message: 'ID de pedido inválido'
      });
    }
    
    let query = `
      SELECT 
        o.*, 
        u.name as customer_name, 
        u.phone as customer_phone, 
        o.delivery_address as customer_address,
        e.name as establishment_name, 
        d.name as delivery_name,
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
      LEFT JOIN users e ON o.establishment_id = e.id
      LEFT JOIN users d ON o.delivery_id = d.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN order_item_acrescimo oia ON oi.id = oia.order_item_id
      LEFT JOIN options opt ON oia.acrescimo_id = opt.id
      WHERE o.id = ?
    `;
    
    let params = [orderId];
    
    // Verificar se o usuário tem acesso ao pedido
    switch (role) {
      case 'CUSTOMER':
        query += ' AND o.customer_id = ?';
        params.push(userId);
        break;
      case 'ESTABLISHMENT':
        query += ' AND o.establishment_id = ?';
        params.push(userId);
        break;
      case 'DELIVERY':
        query += ' AND o.delivery_id = ?';
        params.push(userId);
        break;
    }
    
    query += ' ORDER BY oi.id ASC';
    
    const rows = await executeQuery(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Pedido não encontrado'
      });
    }
    
    // Processar resultados para criar o objeto do pedido
    const firstRow = rows[0];
    const order = {
      id: firstRow.id,
      customer_id: firstRow.customer_id,
      establishment_id: firstRow.establishment_id,
      delivery_id: firstRow.delivery_id,
      total_amount: Number(firstRow.total_amount),
      delivery_fee: Number(firstRow.delivery_fee),
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
      establishment_name: firstRow.establishment_name,
      delivery_name: firstRow.delivery_name,
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
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/orders - Criar novo pedido
router.post('/', authenticateToken, requireRole(['ESTABLISHMENT']), async (req, res) => {
  try {
    const {
      establishment_id,
      customer_name,
      customer_phone,
      customer_id,
      order_type,
      delivery_address,
      notes,
      payment_method,
      amount_paid,
      items = []
    } = req.body;

    // Validações básicas
    if (!establishment_id || !customer_name || !customer_phone || !order_type || !payment_method) {
      return res.status(400).json({
        message: 'Dados obrigatórios não fornecidos'
      });
    }

    // Verificar se o estabelecimento existe e se o usuário tem permissão
    if (establishment_id !== req.user.id) {
      return res.status(403).json({
        message: 'Acesso negado'
      });
    }

    let finalCustomerId = customer_id;
    let finalDeliveryAddress = delivery_address;

    // Se não foi fornecido customer_id, buscar ou criar usuário
    if (!finalCustomerId) {
      const [existingUsers] = await pool.execute(
        'SELECT id, address FROM users WHERE phone = ? AND role = "CUSTOMER"',
        [customer_phone]
      );

      if (existingUsers.length > 0) {
        finalCustomerId = existingUsers[0].id;
        // Se não foi enviado delivery_address, usa o endereço cadastrado do usuário
        if (!finalDeliveryAddress && existingUsers[0].address) {
          finalDeliveryAddress = existingUsers[0].address;
        }
      } else {
        // Criar novo usuário
        const [result] = await pool.execute(
          'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
          [
            customer_name,
            `cli${customer_phone}@fake.com`,
            '12345678',
            'CUSTOMER',
            customer_phone
          ]
        );
        finalCustomerId = result.insertId;
      }
    } else if (!finalDeliveryAddress) {
      // Se já tem customer_id mas não veio delivery_address, busca o endereço do usuário
      const [userRows] = await pool.execute(
        'SELECT address FROM users WHERE id = ?',
        [finalCustomerId]
      );
      if (userRows.length > 0 && userRows[0].address) {
        finalDeliveryAddress = userRows[0].address;
      }
    }

    // Calcular total dos itens
    const itemsTotal = items.reduce((sum, item) => {
      const itemTotal = (Number(item.price || 0) * (item.quantity || 1));
      const additionsTotal = (item.additions || []).reduce((addSum, add) => {
        return addSum + (Number(add.price || 0) * (add.quantity || 1));
      }, 0);
      return sum + itemTotal + additionsTotal;
    }, 0);

    // Buscar taxa de entrega do estabelecimento
    const [establishmentProfile] = await pool.execute(
      'SELECT delivery_fee FROM establishment_profile WHERE user_id = ?',
      [establishment_id]
    );

    const deliveryFee = establishmentProfile.length > 0 ? Number(establishmentProfile[0].delivery_fee) : 0;
    const totalAmount = itemsTotal + deliveryFee;

    // Inserir pedido
    const [orderResult] = await pool.execute(
      `INSERT INTO orders (
        customer_id, establishment_id, status, total_amount, delivery_fee,
        payment_method, order_type, amount_paid, delivery_address, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        finalCustomerId,
        establishment_id,
        'PENDING',
        totalAmount,
        deliveryFee,
        payment_method,
        order_type,
        amount_paid || null,
        finalDeliveryAddress || null,
        notes || null
      ]
    );

    const orderId = orderResult.insertId;

    // Inserir na tabela order_offers sem entregador
    await pool.execute(
      'INSERT INTO order_offers (order_id, deliveryman_id, status) VALUES (?, NULL, ?)',
      [orderId, 'pending']
    );

    // Buscar dados do pedido, cliente e estabelecimento para o histórico
    const [orderRows] = await pool.execute(`
      SELECT o.*, e.name as establishment_name, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN users e ON o.establishment_id = e.id
      LEFT JOIN users c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [orderId]);
    const order = orderRows[0] || {};

    // Buscar itens do pedido
    const [itemsRows] = await pool.execute(`
      SELECT oi.quantity, p.name as product_name, oi.price, oi.obs
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);
    const itemsText = itemsRows.map(item =>
      `${item.quantity}x ${item.product_name} (R$ ${item.price})${item.obs ? ' - Obs: ' + item.obs : ''}`
    ).join('\n');

    // LOG dos dados que serão inseridos no histórico
    console.log('Dados para delivery_history:', {
      establishment_id: order.establishment_id,
      establishment_name: order.establishment_name,
      order_id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      delivery_address: order.delivery_address,
      itemsText,
      total_amount: order.total_amount,
      delivery_fee: order.delivery_fee,
      finished_at: order.created_at,
      payment_method: order.payment_method,
      order_notes: order.notes
    });

    // Garantir valores padrão para campos obrigatórios
    const establishmentId = order.establishment_id || 0;
    const establishmentName = order.establishment_name || '';
    const orderIdHist = order.id || orderId;
    const customerName = order.customer_name || '';
    const customerPhone = order.customer_phone || '';
    const deliveryAddress = order.delivery_address || '';
    const totalAmountHist = order.total_amount || 0;
    const deliveryFeeHist = order.delivery_fee || 0;
    const createdAt = order.created_at || new Date();
    const finishedAt = order.updated_at || null;
    const paymentMethod = order.payment_method || '';
    const orderNotes = order.notes || '';
    // delivery_id e delivery_name podem ser null na criação
    const deliveryId = order.delivery_id || null;
    const deliveryName = order.delivery_name || null;

    // LOG DETALHADO DOS VALORES
    console.log('Valores para INSERT delivery_history:', [
      establishmentId,
      establishmentName,
      deliveryId,
      deliveryName,
      orderIdHist,
      customerName,
      customerPhone,
      deliveryAddress,
      itemsText,
      totalAmountHist,
      deliveryFeeHist,
      createdAt,
      finishedAt,
      paymentMethod,
      orderNotes
    ]);

    await pool.execute(`
      INSERT INTO delivery_history (
        establishment_id, establishment_name, delivery_id, delivery_name, order_id,
        customer_name, customer_phone, delivery_address, items, total_amount, delivery_fee, created_at, finished_at, payment_method, order_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      establishmentId,
      establishmentName,
      deliveryId,
      deliveryName,
      orderIdHist,
      customerName,
      customerPhone,
      deliveryAddress,
      itemsText,
      totalAmountHist,
      deliveryFeeHist,
      createdAt,
      finishedAt,
      paymentMethod,
      orderNotes
    ]);

    // Inserir itens do pedido
    for (const item of items) {
      const [itemResult] = await pool.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price, obs) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity || 1, item.price || 0, item.obs || null]
      );

      const itemId = itemResult.insertId;

      // Inserir acréscimos do item
      if (item.additions && item.additions.length > 0) {
        for (const addition of item.additions) {
          await pool.execute(
            'INSERT INTO order_item_acrescimo (order_item_id, acrescimo_id, quantity, price) VALUES (?, ?, ?, ?)',
            [itemId, addition.id, addition.quantity || 1, addition.price || 0]
          );
        }
      }
    }

    // Buscar pedido criado com detalhes
    const [orderDetails] = await pool.execute(
      `SELECT 
        o.*, 
        u.name as customer_name, 
        u.phone as customer_phone
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE o.id = ?`,
      [orderId]
    );

    const newOrder = {
      ...orderDetails[0],
      items: []
    };

    // Buscar itens do pedido
    const [orderItems] = await pool.execute(
      `SELECT 
        oi.*,
        p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?`,
      [orderId]
    );

    newOrder.items = orderItems;

    // Broadcast do novo pedido
    if (broadcastNewOrder) {
      broadcastNewOrder(newOrder);
    }

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// Função utilitária para buscar ou criar usuário conforme o tipo de pedido
async function getOrCreateCustomer({ name, phone, address, type, pool }) {
  if (type === 'local') {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      ['local@faker.com']
    );
    if (rows.length > 0) return rows[0].id;
    const result = await pool.execute(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      ['CONSUMO LOCAL', 'local@faker.com', '12345678', 'CUSTOMER', '00000000000', 'LOCAL']
    );
    return result[0].insertId;
  }
  // Para entrega/retirada, busca pelo telefone
  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE phone = ?',
    [phone]
  );
  if (rows.length > 0) return rows[0].id;
  // Cria novo usuário se não encontrar
  // Gera email a partir do nome (sem espaços, minúsculo)
  const email = `${name.replace(/\s+/g, '').toLowerCase()}@faker.com`;
  const result = await pool.execute(
    'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, '12345678', 'CUSTOMER', phone, address]
  );
  return result[0].insertId;
}

// POST /api/orders - Criar pedido
router.post('/', authenticateToken, requireRole(['CUSTOMER', 'ESTABLISHMENT']), async (req, res) => {
  try {
    console.log('Backend: Recebida requisição para criar pedido');
    console.log('Backend: req.user:', req.user);
    console.log('Backend: req.body:', req.body);
    
    // Pegue os dados do cliente diretamente do req.body
    const { establishment_id, items, name, phone, address, orderType } = req.body;

    // Use esses dados para buscar/criar o usuário
    const customer_id = await getOrCreateCustomer({
      name: name || 'CONSUMO LOCAL',
      phone: phone || '00000000000',
      address: orderType === 'delivery' ? address : (orderType === 'pickup' ? 'RETIRADA' : 'LOCAL'),
      type: orderType,
      pool // passe a conexão do banco
    });
    
    console.log('Backend: Dados extraídos:', { establishment_id, customer_id, itemsCount: items?.length });
    
    // Validações
    if (!establishment_id) {
      console.log('Backend: Estabelecimento não fornecido');
      return res.status(400).json({
        message: 'Estabelecimento é obrigatório'
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Itens do pedido são obrigatórios'
      });
    }
    
    // Verificar se o estabelecimento existe
    const establishment = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "ESTABLISHMENT"',
      [establishment_id]
    );
    
    if (establishment.length === 0) {
      return res.status(400).json({
        message: 'Estabelecimento não encontrado'
      });
    }
    
    // Calcular total do pedido
    let total = 0;
    for (const item of items) {
      const product = await executeQuery(
        'SELECT price FROM products WHERE id = ? AND establishment_id = ?',
        [item.product_id, establishment_id]
      );
      if (product.length === 0) {
        return res.status(400).json({
          message: `Produto ${item.product_id} não encontrado ou não disponível`
        });
      }
      // Soma do valor base do produto
      let itemTotal = product[0].price * item.quantity;
      // Soma dos adicionais
      if (item.selected_options && Array.isArray(item.selected_options) && item.selected_options.length > 0) {
        for (const option of item.selected_options) {
          const optionPrice = typeof option === 'object'
            ? (option.price ?? option.additional_price ?? 0)
            : 0;
          const optionQty = typeof option === 'object' && option.quantity ? option.quantity : 1;
          itemTotal += Number(optionPrice) * Number(optionQty);
        }
      }
      total += itemTotal;
    }
    
    // Mapear orderType para order_type do banco
    let orderTypeDB = 'DINE_IN'; // padrão
    if (orderType === 'delivery') {
      orderTypeDB = 'DELIVERY';
    } else if (orderType === 'pickup') {
      orderTypeDB = 'PICKUP';
    } else if (orderType === 'local') {
      orderTypeDB = 'DINE_IN';
    }
    
    // Se for DINE_IN, usar o número da mesa como delivery_address
    const mesa = orderType === 'local' ? (req.body.table || 'LOCAL') : address;
    
    // Buscar taxa de entrega do banco se for DELIVERY
    let delivery_fee = 0;
    if (orderType === 'delivery') {
      const [profile] = await pool.execute(
        'SELECT delivery_fee FROM establishment_profile WHERE user_id = ?',
        [establishment_id]
      );
      delivery_fee = profile.length > 0 ? Number(profile[0].delivery_fee) : 0;
    }
    
    // Inserir pedido
    const [orderResult] = await pool.execute(`
      INSERT INTO orders (
        customer_id, 
        establishment_id, 
        status, 
        total_amount, 
        delivery_fee, 
        payment_method, 
        order_type, 
        delivery_address,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      customer_id,
      establishment_id,
      'PENDING',
      total + delivery_fee,
      delivery_fee,
      req.body.payment_method || 'CASH',
      orderTypeDB,
      mesa || null, // Usar o endereço/mesa como delivery_address
      req.body.notes || null
    ]);
    
    const orderId = orderResult.insertId;
    console.log('Backend: Pedido criado com ID:', orderId);
    
    // Inserir itens do pedido
    for (const item of items) {
      // Buscar o preço real do produto no banco
      const [productRows] = await pool.execute(
        'SELECT price FROM products WHERE id = ? AND establishment_id = ?',
        [item.product_id, establishment_id]
      );
      const productPrice = productRows.length > 0 ? Number(productRows[0].price) : 0;

      const [itemResult] = await pool.execute(`
        INSERT INTO order_items (order_id, product_id, quantity, price, obs)
        VALUES (?, ?, ?, ?, ?)
      `, [
        orderId,
        item.product_id,
        item.quantity,
        productPrice,
        item.obs || null
      ]);
      
      const itemId = itemResult.insertId;
      
      // Inserir adicionais se existirem
      if (item.selected_options && Array.isArray(item.selected_options) && item.selected_options.length > 0) {
        for (const option of item.selected_options) {
          const optionId = typeof option === 'object' ? option.id : option;
          const optionQty = typeof option === 'object' && option.quantity ? option.quantity : 1;
          const optionPrice = typeof option === 'object' 
            ? (option.price ?? option.additional_price ?? 0) 
            : 0;
          
          // Verificar se os valores não são undefined
          if (optionId && itemId) {
            await pool.execute(`
              INSERT INTO order_item_acrescimo (order_item_id, acrescimo_id, quantity, price)
              VALUES (?, ?, ?, ?)
            `, [itemId, optionId, optionQty, optionPrice]);
          }
        }
      }
    }
    
    console.log('Backend: Pedido criado com sucesso');
    
    res.status(201).json({
      message: 'Pedido criado com sucesso',
      order_id: orderId
    });
  } catch (error) {
    console.error('Backend: Erro ao criar pedido:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// Função para salvar histórico de entrega
async function saveDeliveryHistory(orderId) {
  // Buscar todos os dados do pedido, entregador, cliente, itens
  const [orderRows] = await pool.execute(`
    SELECT o.*, e.name as establishment_name, d.name as delivery_name, c.name as customer_name, c.phone as customer_phone
    FROM orders o
    JOIN users e ON o.establishment_id = e.id
    LEFT JOIN users d ON o.delivery_id = d.id
    LEFT JOIN users c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [orderId]);
  if (!orderRows || orderRows.length === 0) return;
  const order = orderRows[0];

  // Buscar itens do pedido
  const [itemsRows] = await pool.execute(`
    SELECT oi.quantity, p.name as product_name, oi.price, oi.obs
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [orderId]);
  // Formatar itens como texto
  const itemsText = itemsRows.map(item =>
    `${item.quantity}x ${item.product_name} (R$ ${item.price})${item.obs ? ' - Obs: ' + item.obs : ''}`
  ).join('\n');

  // Salvar no histórico
  await pool.execute(`
    INSERT INTO delivery_history (
      establishment_id, establishment_name, delivery_id, delivery_name, order_id,
      customer_name, customer_phone, delivery_address, items, total_amount, delivery_fee, created_at, finished_at, payment_method, order_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    order.establishment_id,
    order.establishment_name,
    order.delivery_id,
    order.delivery_name,
    order.id,
    order.customer_name,
    order.customer_phone,
    order.delivery_address,
    itemsText,
    order.total_amount,
    order.delivery_fee,
    order.created_at || new Date(),
    order.updated_at || null,
    order.payment_method,
    order.notes
  ]);
}

// PUT /api/orders/:id - Atualizar pedido
router.put('/:id', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { delivery_address, notes } = req.body;
    const customer_id = req.user.id;
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        message: 'ID de pedido inválido'
      });
    }
    
    // Verificar se o pedido pertence ao cliente e está pendente
    const order = await executeQuery(
      'SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status = "PENDING"',
      [orderId, customer_id]
    );
    
    if (order.length === 0) {
      return res.status(404).json({
        message: 'Pedido não encontrado ou não pode ser editado'
      });
    }
    
    // Atualizar pedido
    await executeQuery(
      'UPDATE orders SET delivery_address = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      [delivery_address || order[0].delivery_address, notes || order[0].notes, orderId]
    );
    
    res.json({
      message: 'Pedido atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/orders/:id - Cancelar pedido
router.delete('/:id', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const customer_id = req.user.id;
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        message: 'ID de pedido inválido'
      });
    }
    
    // Verificar se o pedido pertence ao cliente e pode ser cancelado
    const order = await executeQuery(
      'SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status IN ("PENDING", "PREPARING")',
      [orderId, customer_id]
    );
    
    if (order.length === 0) {
      return res.status(404).json({
        message: 'Pedido não encontrado ou não pode ser cancelado'
      });
    }
    
    // Cancelar pedido
    await executeQuery(
      'UPDATE orders SET status = "CANCELLED", updated_at = NOW() WHERE id = ?',
      [orderId]
    );
    
    res.json({
      message: 'Pedido cancelado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/orders/offers - Listar ofertas de pedidos
router.get('/offers', authenticateToken, requireRole(['ESTABLISHMENT', 'DELIVERY']), async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    let query = `
      SELECT 
        oo.id,
        oo.order_id,
        oo.deliveryman_id,
        oo.status as offer_status,
        oo.created_at as offer_created_at,
        oo.updated_at as offer_updated_at,
        o.id as order_id,
        o.status as order_status,
        o.total_amount,
        o.delivery_fee,
        o.payment_method,
        o.order_type,
        o.delivery_address,
        o.notes,
        o.created_at as order_created_at,
        c.name as customer_name,
        c.phone as customer_phone,
        e.name as establishment_name,
        d.name as delivery_name,
        d.phone as delivery_phone
      FROM order_offers oo
      JOIN orders o ON oo.order_id = o.id
      JOIN users c ON o.customer_id = c.id
      JOIN users e ON o.establishment_id = e.id
      LEFT JOIN users d ON oo.deliveryman_id = d.id
      WHERE 1=1
    `;
    
    let params = [];
    
    // Filtrar por papel do usuário
    if (role === 'ESTABLISHMENT') {
      query += ' AND o.establishment_id = ?';
      params.push(userId);
    } else if (role === 'DELIVERY') {
      query += ' AND oo.deliveryman_id = ?';
      params.push(userId);
    }
    
    // Filtrar por status se fornecido
    if (req.query.status) {
      query += ' AND oo.status = ?';
      params.push(req.query.status);
    }
    
    // Filtrar por status do pedido se fornecido
    if (req.query.order_status) {
      query += ' AND o.status = ?';
      params.push(req.query.order_status);
    }
    
    // Ordenar por data de criação da oferta (mais recentes primeiro)
    query += ' ORDER BY oo.created_at DESC';
    
    const offers = await executeQuery(query, params);
    
    res.json({
      success: true,
      offers: offers.map(offer => ({
        id: offer.id,
        order_id: offer.order_id,
        deliveryman_id: offer.deliveryman_id,
        offer_status: offer.offer_status,
        offer_created_at: offer.offer_created_at,
        offer_updated_at: offer.offer_updated_at,
        order: {
          id: offer.order_id,
          status: offer.order_status,
          total_amount: Number(offer.total_amount),
          delivery_fee: Number(offer.delivery_fee),
          payment_method: offer.payment_method,
          order_type: offer.order_type,
          delivery_address: offer.delivery_address,
          notes: offer.notes,
          created_at: offer.order_created_at,
          customer_name: offer.customer_name,
          customer_phone: offer.customer_phone,
          establishment_name: offer.establishment_name,
          delivery_name: offer.delivery_name,
          delivery_phone: offer.delivery_phone
        }
      }))
    });
  } catch (error) {
    console.error('Erro ao listar ofertas de pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/orders/:orderId/offers - Listar ofertas de um pedido específico
router.get('/:orderId/offers', authenticateToken, requireRole(['ESTABLISHMENT']), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const userId = req.user.id;
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }
    
    // Verificar se o pedido pertence ao estabelecimento
    const order = await executeQuery(
      'SELECT * FROM orders WHERE id = ? AND establishment_id = ?',
      [orderId, userId]
    );
    
    if (order.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Buscar ofertas do pedido
    const offers = await executeQuery(`
      SELECT 
        oo.id,
        oo.deliveryman_id,
        oo.status as offer_status,
        oo.created_at as offer_created_at,
        oo.updated_at as offer_updated_at,
        d.name as delivery_name,
        d.phone as delivery_phone,
        dp.vehicle_type,
        dp.vehicle_model,
        dp.plate
      FROM order_offers oo
      LEFT JOIN users d ON oo.deliveryman_id = d.id
      LEFT JOIN delivery_profile dp ON d.id = dp.user_id
      WHERE oo.order_id = ?
      ORDER BY oo.created_at DESC
    `, [orderId]);
    
    res.json({
      success: true,
      order_id: orderId,
      offers: offers.map(offer => ({
        id: offer.id,
        deliveryman_id: offer.deliveryman_id,
        offer_status: offer.offer_status,
        offer_created_at: offer.offer_created_at,
        offer_updated_at: offer.offer_updated_at,
        delivery_name: offer.delivery_name,
        delivery_phone: offer.delivery_phone,
        vehicle_type: offer.vehicle_type,
        vehicle_model: offer.vehicle_model,
        plate: offer.plate
      }))
    });
  } catch (error) {
    console.error('Erro ao listar ofertas do pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ROTA 1: Listar entregadores do histórico de um estabelecimento
router.get('/establishments/:establishmentId/delivery-history/deliverers', authenticateToken, requireRole(['ESTABLISHMENT', 'ADMIN']), async (req, res) => {
  try {
    const establishmentId = parseInt(req.params.establishmentId);
    if (isNaN(establishmentId)) {
      return res.status(400).json({ success: false, message: 'ID do estabelecimento inválido' });
    }
    // Buscar entregadores distintos do histórico, ordenados pelo mais recente
    const [rows] = await pool.execute(`
      SELECT DISTINCT delivery_id, delivery_name
      FROM delivery_history
      WHERE establishment_id = ?
      ORDER BY MAX(finished_at) DESC
    `, [establishmentId]);
    res.json({
      success: true,
      deliverers: rows.map(r => ({ id: r.delivery_id, name: r.delivery_name }))
    });
  } catch (error) {
    console.error('Erro ao listar entregadores do histórico:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ROTA 2: Listar histórico de entregas de um entregador, com filtro de data
router.get('/establishments/:establishmentId/delivery-history/:deliveryId', authenticateToken, requireRole(['ESTABLISHMENT', 'ADMIN']), async (req, res) => {
  try {
    const establishmentId = parseInt(req.params.establishmentId);
    const deliveryId = parseInt(req.params.deliveryId);
    const date = req.query.date; // YYYY-MM-DD
    if (isNaN(establishmentId) || isNaN(deliveryId)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    let query = `SELECT * FROM delivery_history WHERE establishment_id = ? AND delivery_id = ?`;
    let params = [establishmentId, deliveryId];
    if (date) {
      query += ' AND DATE(finished_at) = ?';
      params.push(date);
    }
    query += ' ORDER BY finished_at DESC';
    const [rows] = await pool.execute(query, params);
    // Calcular total das taxas de entrega do dia
    const totalTaxas = rows.reduce((acc, r) => acc + (r.delivery_fee || 0), 0);
    res.json({
      success: true,
      total_delivery_fee: totalTaxas,
      deliveries: rows
    });
  } catch (error) {
    console.error('Erro ao listar histórico de entregas:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

module.exports = { router, setBroadcastFunctions }; 