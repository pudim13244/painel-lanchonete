const mysql = require('mysql2/promise');
const path = require('path');

// Carregar variáveis de ambiente do arquivo config.env
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

// Configuração do pool de conexões
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Função para testar a conexão
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error.message);
    return false;
  }
};

// Função para executar queries
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Erro na query:', error);
    throw error;
  }
};

// Função para executar transações
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [rows] = await connection.execute(query, params);
      results.push(rows);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Função para buscar um usuário por email
const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = ?';
  const users = await executeQuery(query, [email]);
  return users.length > 0 ? users[0] : null;
};

// Função para buscar um usuário por ID
const findUserById = async (id) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  const users = await executeQuery(query, [id]);
  return users.length > 0 ? users[0] : null;
};

// Função para atualizar um usuário
const updateUser = async (id, data) => {
  try {
    // Construir a query manualmente para evitar problemas com o placeholder ?
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    if (fields.length === 0) {
      throw new Error('Nenhum campo fornecido para atualização');
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE users SET ${setClause} WHERE id = ?`;
    const params = [...values, id];
    
    console.log('Query de atualização:', query);
    console.log('Parâmetros:', params);
    
    return await executeQuery(query, params);
  } catch (error) {
    console.error('Erro na função updateUser:', error);
    throw error;
  }
};

// Função para buscar produtos
const getProducts = async (establishmentId = null) => {
  let query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `;
  let params = [];
  
  if (establishmentId) {
    query += ' WHERE p.establishment_id = ?';
    params.push(establishmentId);
  }
  
  query += ' ORDER BY p.name';
  return await executeQuery(query, params);
};

// Função para buscar categorias
const getCategories = async () => {
  const query = 'SELECT * FROM categories ORDER BY name';
  return await executeQuery(query);
};

// Função para buscar pedidos
const getOrders = async (userId = null, role = null) => {
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
  `;
  let params = [];
  
  if (userId && role) {
    switch (role) {
      case 'CUSTOMER':
        query += ' WHERE o.customer_id = ?';
        params.push(userId);
        break;
      case 'ESTABLISHMENT':
        query += ' WHERE o.establishment_id = ?';
        params.push(userId);
        break;
      case 'DELIVERY':
        query += ' WHERE o.delivery_id = ?';
        params.push(userId);
        break;
    }
  }
  
  query += ' ORDER BY o.created_at DESC, oi.id ASC';
  
  const rows = await executeQuery(query, params);
  
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
        establishment_name: row.establishment_name,
        delivery_name: row.delivery_name,
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
  
  return Array.from(ordersMap.values());
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  findUserByEmail,
  findUserById,
  updateUser,
  getProducts,
  getCategories,
  getOrders
}; 