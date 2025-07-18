const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/establishment';

// Token de teste (substitua por um token válido)
const TEST_TOKEN = 'seu_token_aqui';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testDeliveryRoutes() {
  console.log('🧪 Testando rotas de entregadores...\n');

  try {
    // Teste 1: Listar entregadores
    console.log('1. Testando listagem de entregadores...');
    const listResponse = await api.get('/delivery-people');
    console.log('✅ Listagem:', listResponse.data);
    console.log('');

    // Teste 2: Vincular entregador (substitua o email por um válido)
    console.log('2. Testando vinculação de entregador...');
    try {
      const linkResponse = await api.post('/delivery-people/link', {
        email: 'entregador@teste.com'
      });
      console.log('✅ Vinculação:', linkResponse.data);
    } catch (error) {
      console.log('❌ Erro na vinculação:', error.response?.data || error.message);
    }
    console.log('');

    // Teste 3: Definir prioridade (substitua o ID por um válido)
    console.log('3. Testando definição de prioridade...');
    try {
      const priorityResponse = await api.post('/delivery-people/set-priority', {
        delivery_id: 1
      });
      console.log('✅ Prioridade:', priorityResponse.data);
    } catch (error) {
      console.log('❌ Erro na prioridade:', error.response?.data || error.message);
    }
    console.log('');

    // Teste 4: Desvincular entregador (substitua o ID por um válido)
    console.log('4. Testando desvinculação de entregador...');
    try {
      const unlinkResponse = await api.delete('/delivery-people/1');
      console.log('✅ Desvinculação:', unlinkResponse.data);
    } catch (error) {
      console.log('❌ Erro na desvinculação:', error.response?.data || error.message);
    }
    console.log('');

    console.log('🎉 Testes concluídos!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar testes
testDeliveryRoutes(); 