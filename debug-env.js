const path = require('path');

// Carregar variáveis de ambiente do arquivo config.env
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

console.log('🔍 Debugando variáveis de ambiente:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NÃO DEFINIDA');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***' : 'NÃO DEFINIDA');
console.log('PORT:', process.env.PORT);

// Verificar se o arquivo config.env foi carregado
const fs = require('fs');

const envPath = path.join(__dirname, 'config.env');
if (fs.existsSync(envPath)) {
  console.log('\n📄 Conteúdo do arquivo config.env:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log(envContent);
} else {
  console.log('\n❌ Arquivo config.env não encontrado!');
} 