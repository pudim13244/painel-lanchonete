const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4'
};

async function checkDeliveryOrders() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('🔍 Verificando pedidos do entregador ID 22...\n');
    
    // Verificar se o entregador existe
    const [deliveryUser] = await connection.execute(
      'SELECT id, name, email, role FROM users WHERE id = 22'
    );
    
    if (deliveryUser.length === 0) {
      console.log('❌ Entregador com ID 22 não encontrado');
      return;
    }
    
    console.log('✅ Entregador encontrado:', deliveryUser[0]);
    
    // Verificar vínculos com estabelecimentos
    const [establishmentLinks] = await connection.execute(
      'SELECT * FROM establishment_delivery WHERE delivery_id = 22'
    );
    
    console.log('\n📋 Vínculos com estabelecimentos:', establishmentLinks);
    
    // Verificar pedidos ativos
    const [activeOrders] = await connection.execute(
      'SELECT id, establishment_id, status, created_at FROM orders WHERE delivery_id = 22 AND status IN ("READY", "DELIVERING")'
    );
    
    console.log('\n📦 Pedidos ativos:', activeOrders);
    
    // Verificar todos os pedidos do entregador
    const [allOrders] = await connection.execute(
      'SELECT id, establishment_id, status, created_at FROM orders WHERE delivery_id = 22 ORDER BY created_at DESC LIMIT 10'
    );
    
    console.log('\n📋 Últimos 10 pedidos do entregador:', allOrders);
    
    // Verificar estabelecimentos vinculados
    if (establishmentLinks.length > 0) {
      for (const link of establishmentLinks) {
        const [establishment] = await connection.execute(
          'SELECT id, name, email FROM users WHERE id = ?',
          [link.establishment_id]
        );
        
        console.log(`\n🏪 Estabelecimento ${link.establishment_id}:`, establishment[0]);
        
        // Verificar pedidos ativos para este estabelecimento
        const [establishmentOrders] = await connection.execute(
          'SELECT COUNT(*) as count FROM orders WHERE delivery_id = 22 AND status IN ("READY", "DELIVERING") AND establishment_id = ?',
          [link.establishment_id]
        );
        
        console.log(`📊 Pedidos ativos para este estabelecimento: ${establishmentOrders[0].count}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

checkDeliveryOrders(); 