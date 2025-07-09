const db = require('./db');

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas existentes...\n');
    
    const [tables] = await db.query('SHOW TABLES');
    
    console.log('📋 Tabelas encontradas:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    console.log(`\n✅ Total: ${tables.length} tabelas`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables(); 