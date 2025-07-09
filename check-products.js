const { executeQuery } = require('./config/database');

const checkProducts = async () => {
  try {
    console.log('🔍 Verificando produtos na tabela...');
    
    const products = await executeQuery('SELECT * FROM products');
    
    console.log(`📊 Total de produtos encontrados: ${products.length}`);
    
    if (products.length > 0) {
      console.log('\n📋 Primeiros 3 produtos:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - R$ ${product.price} (Estabelecimento: ${product.establishment_id})`);
      });
    } else {
      console.log('❌ Nenhum produto encontrado na tabela.');
    }
    
    // Verificar estabelecimentos
    const establishments = await executeQuery('SELECT id, name FROM users WHERE role = "ESTABLISHMENT" LIMIT 5');
    console.log(`\n🏪 Estabelecimentos encontrados: ${establishments.length}`);
    establishments.forEach(est => {
      console.log(`- ID: ${est.id}, Nome: ${est.name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar produtos:', error);
  } finally {
    process.exit(0);
  }
};

checkProducts(); 