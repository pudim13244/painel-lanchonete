const db = require('./db');

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela option_groups...');
    
    const [rows] = await db.query('DESCRIBE option_groups');
    console.log('\n📋 Estrutura da tabela option_groups:');
    console.table(rows);
    
    console.log('\n🔍 Verificando dados da tabela option_groups...');
    const [data] = await db.query('SELECT * FROM option_groups LIMIT 5');
    console.log('\n📊 Primeiros 5 registros:');
    console.table(data);
    
    console.log('\n🔍 Verificando estrutura da tabela options...');
    const [optionsStructure] = await db.query('DESCRIBE options');
    console.log('\n📋 Estrutura da tabela options:');
    console.table(optionsStructure);
    
    console.log('\n🔍 Verificando dados da tabela options...');
    const [optionsData] = await db.query('SELECT * FROM options LIMIT 5');
    console.log('\n📊 Primeiros 5 registros de options:');
    console.table(optionsData);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTableStructure(); 