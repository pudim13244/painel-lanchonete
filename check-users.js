const { pool } = require('./config/database');

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...\n');
    
    // Buscar todos os usuários
    const [users] = await pool.execute('SELECT id, name, email, role FROM users');
    
    console.log(`📊 Total de usuários: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado no banco de dados');
      return;
    }
    
    console.log('👥 Usuários encontrados:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} | Nome: ${user.name} | Email: ${user.email} | Role: ${user.role}`);
    });
    
    // Buscar estabelecimentos especificamente
    const [establishments] = await pool.execute('SELECT id, name, email FROM users WHERE role = "ESTABLISHMENT"');
    
    console.log('\n🏪 Estabelecimentos:');
    if (establishments.length === 0) {
      console.log('⚠️ Nenhum estabelecimento encontrado');
    } else {
      establishments.forEach((est, index) => {
        console.log(`${index + 1}. ID: ${est.id} | Nome: ${est.name} | Email: ${est.email}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers(); 