const path = require('path');

// Carregar variáveis de ambiente do arquivo config.env
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const { testConnection } = require('./config/database');

async function startServer() {
  console.log('�� Iniciando servidor QuickPainel...');
  
  // Testar conexão com o banco
  console.log('📊 Testando conexão com o banco de dados...');
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.error('❌ Falha na conexão com o banco de dados. Verifique as configurações.');
    process.exit(1);
  }
  
  // Iniciar servidor
  console.log('✅ Conexão com banco estabelecida. Iniciando servidor...');
  require('./server');
}

startServer().catch(error => {
  console.error('❌ Erro ao iniciar servidor:', error);
  process.exit(1);
}); 