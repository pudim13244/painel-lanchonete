const axios = require('axios');

async function testDashboard() {
  try {
    console.log('🧪 Testando rota do dashboard...');
    
    // Primeiro, vamos fazer login para obter um token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'manoelvitor253@gmail.com',
      password: '12345678'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');
    
    // Agora vamos testar a rota do dashboard
    const dashboardResponse = await axios.get('http://localhost:3001/api/establishment/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Dashboard funcionando!');
    console.log('📊 Dados retornados:', JSON.stringify(dashboardResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testDashboard(); 