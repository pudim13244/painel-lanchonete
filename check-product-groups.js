const db = require('./db');

async function checkProductGroups() {
  try {
    console.log('🔍 Verificando tabela product_option_groups...');
    
    // Verificar se a tabela existe
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'u328800108_food_fly' 
      AND TABLE_NAME = 'product_option_groups'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela product_option_groups não existe!');
      console.log('📋 Criando tabela...');
      
      await db.query(`
        CREATE TABLE product_option_groups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          group_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES option_groups(id) ON DELETE CASCADE,
          UNIQUE KEY unique_product_group (product_id, group_id)
        )
      `);
      
      console.log('✅ Tabela product_option_groups criada com sucesso!');
    } else {
      console.log('✅ Tabela product_option_groups existe!');
      
      // Verificar estrutura
      const [structure] = await db.query('DESCRIBE product_option_groups');
      console.log('\n📋 Estrutura da tabela:');
      console.table(structure);
      
      // Verificar dados
      const [data] = await db.query('SELECT * FROM product_option_groups LIMIT 10');
      console.log('\n📊 Dados da tabela:');
      console.table(data);
    }
    
    // Verificar relacionamentos
    console.log('\n🔍 Verificando produtos com grupos de adicionais...');
    const [productsWithGroups] = await db.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        pog.group_id,
        og.name as group_name
      FROM products p
      LEFT JOIN product_option_groups pog ON p.id = pog.product_id
      LEFT JOIN option_groups og ON pog.group_id = og.id
      WHERE p.establishment_id = 15
      LIMIT 10
    `);
    
    console.log('\n📊 Produtos com grupos:');
    console.table(productsWithGroups);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

checkProductGroups(); 