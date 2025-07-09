const path = require('path');

// Carregar variáveis de ambiente do arquivo config.env
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const { testConnection, findUserByEmail } = require('./config/database');

(async () => {
  try {
    console.log('🔄 Testando conexão com o banco de dados...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Conexão bem sucedida!');
      process.exit(0);
    } else {
      console.error('❌ Falha na conexão');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    process.exit(1);
  }
})();

async function main() {
  try {
    // Testar busca de usuário
    console.log('\n🔄 Testando busca de usuário...');
    const testEmail = 'obahotdog@gmail.com';
    const user = await findUserByEmail(testEmail);
    
    if (user) {
      console.log('✅ Usuário encontrado:');
      console.log('ID:', user.id);
      console.log('Nome:', user.name);
      console.log('Email:', user.email);
      console.log('Tipo:', user.role);
    } else {
      console.log('❌ Usuário não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  }
}

main(); 