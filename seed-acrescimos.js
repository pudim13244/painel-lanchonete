const db = require('./db');

async function seedAcrescimos() {
  try {
    console.log('🌱 Inserindo acréscimos de teste para o estabelecimento 15...');
    
    const testData = [
      { name: 'Bacon', price: 3.50, establishment_id: 15 },
      { name: 'Queijo Extra', price: 2.00, establishment_id: 15 },
      { name: 'Catupiry', price: 2.50, establishment_id: 15 },
      { name: 'Cebola Caramelizada', price: 1.50, establishment_id: 15 },
      { name: 'Molho Especial', price: 1.00, establishment_id: 15 },
      { name: 'Batata Palha', price: 1.50, establishment_id: 15 },
      { name: 'Picles', price: 0.50, establishment_id: 15 },
      { name: 'Maionese Verde', price: 1.00, establishment_id: 15 }
    ];
    
    for (const item of testData) {
      await db.query(
        'INSERT INTO acrescimos (name, price, establishment_id) VALUES (?, ?, ?)',
        [item.name, item.price, item.establishment_id]
      );
      console.log(`✅ Acréscimo inserido: ${item.name} - R$ ${item.price}`);
    }
    
    console.log('\n🎉 Acréscimos inseridos com sucesso!');
    
    // Verificar se foram inseridos
    const [result] = await db.query(`
      SELECT id, name, price, establishment_id
      FROM acrescimos
      WHERE establishment_id = 15
    `);
    
    console.log('\n📊 Acréscimos do estabelecimento 15:');
    console.table(result);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

seedAcrescimos(); 