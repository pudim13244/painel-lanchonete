const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { executeQuery } = require('./config/database');

// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const { router: orderRoutes, setBroadcastFunctions } = require('./routes/orders');
const categoryRoutes = require('./routes/categories');
const establishmentRoutes = require('./routes/establishment');
const establishmentsRoutes = require('./routes/establishments');
const acrescimosRouter = require('./routes/acrescimos');
const optionGroupsRouter = require('./routes/option-groups');
const optionsRouter = require('./routes/options');
const userAddressesRoutes = require('./routes/user-addresses');

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
module.exports = cloudinary;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança (helmet) - desabilitar headers problemáticos para uploads
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: {
    message: 'Muitas requisições deste IP, tente novamente mais tarde.'
  }
});
app.use('/api/', limiter);

// Configuração do CORS
app.use(cors({
  origin: [
    'https://painelquick.vmagenciadigital.com',
    'https://outrodominio.com',
    'http://localhost:8080',
  ],
  credentials: true
}));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas que precisam de parsing JSON
app.use('/api/auth', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), authRoutes);
app.use('/api/users', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), userRoutes);
app.use('/api/products', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), productRoutes);
app.use('/api/orders', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), orderRoutes);
app.use('/api/categories', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), categoryRoutes);
app.use('/api/establishments', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), establishmentsRoutes);
app.use('/api/acrescimos', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), acrescimosRouter);
app.use('/api/option-groups', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), optionGroupsRouter);
app.use('/api/options', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), optionsRouter);
app.use('/api/user-addresses', express.json({ limit: '10mb' }), express.urlencoded({ extended: true }), userAddressesRoutes);

// Rota de estabelecimento (inclui upload de arquivos) - sem express.json() global
app.use('/api/establishment', establishmentRoutes);

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Rota de teste
app.get('/api', (req, res) => {
  res.json({
    message: 'QuickPainel API está funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Dados inválidos',
      errors: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Token inválido ou expirado'
    });
  }
  
  res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// --- WEBSOCKET INTEGRADO ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  console.log('Cliente WebSocket conectado');
});

function broadcastNewOrder(order) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'NEW_ORDER', order }));
    }
  });
}

function broadcastOrderUpdate(order) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'ORDER_UPDATE', order }));
    }
  });
}

// Configurar as funções de broadcast no orderRoutes
setBroadcastFunctions(broadcastNewOrder, broadcastOrderUpdate);

// --- POLLING DE NOVOS PEDIDOS ---
let lastPolledOrderId = 0;
async function pollNewOrders() {
  try {
    // Busca o maior ID já emitido (na inicialização)
    if (lastPolledOrderId === 0) {
      const rows = await executeQuery('SELECT MAX(id) as maxId FROM orders');
      lastPolledOrderId = rows[0]?.maxId || 0;
    }
    // Busca pedidos PENDING com id maior que o último emitido
    const newOrders = await executeQuery(
      'SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.address as customer_address, e.name as establishment_name FROM orders o LEFT JOIN users u ON o.customer_id = u.id LEFT JOIN users e ON o.establishment_id = e.id WHERE o.status = "PENDING" AND o.id > ? ORDER BY o.id ASC',
      [lastPolledOrderId]
    );
    for (const order of newOrders) {
      broadcastNewOrder(order);
      if (order.id > lastPolledOrderId) lastPolledOrderId = order.id;
    }
  } catch (err) {
    console.error('Erro no polling de novos pedidos:', err);
  }
}
setInterval(pollNewOrders, 2000); // a cada 2 segundos

module.exports = { app, server, broadcastNewOrder, broadcastOrderUpdate };

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`�� API disponível em: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
}); 