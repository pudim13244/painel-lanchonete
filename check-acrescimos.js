const db = require('./db');

async function checkAcrescimos() {
  try {
    console.log('🔍 Verificando tabela acrescimos...');
    
    // Verificar se a tabela existe
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'u328800108_food_fly' 
      AND TABLE_NAME = 'acrescimos'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela acrescimos não existe!');
      console.log('📋 Criando tabela...');
      
      await db.query(`
        CREATE TABLE acrescimos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          establishment_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (establishment_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      console.log('✅ Tabela acrescimos criada com sucesso!');
      
      // Inserir dados de teste
      console.log('📋 Inserindo dados de teste...');
      const testData = [
        { name: 'Bacon', price: 3.50, establishment_id: 15 },
        { name: 'Queijo Extra', price: 2.00, establishment_id: 15 },
        { name: 'Catupiry', price: 2.50, establishment_id: 15 },
        { name: 'Cebola Caramelizada', price: 1.50, establishment_id: 15 },
        { name: 'Molho Especial', price: 1.00, establishment_id: 15 }
      ];
      
      for (const item of testData) {
        await db.query(
          'INSERT INTO acrescimos (name, price, establishment_id) VALUES (?, ?, ?)',
          [item.name, item.price, item.establishment_id]
        );
        console.log(`✅ Acréscimo inserido: ${item.name} - R$ ${item.price}`);
      }
    } else {
      console.log('✅ Tabela acrescimos existe!');
      
      // Verificar estrutura
      const [structure] = await db.query('DESCRIBE acrescimos');
      console.log('\n📋 Estrutura da tabela:');
      console.table(structure);
      
      // Verificar dados
      const [data] = await db.query('SELECT * FROM acrescimos LIMIT 10');
      console.log('\n📊 Dados da tabela:');
      console.table(data);
    }
    
    // Testar a API
    console.log('\n🔍 Testando API de acréscimos...');
    const [apiTest] = await db.query(`
      SELECT id, name, price, establishment_id
      FROM acrescimos
      WHERE establishment_id = 15
    `);
    
    console.log('\n📊 Resultado da API:');
    console.table(apiTest);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAcrescimos(); 