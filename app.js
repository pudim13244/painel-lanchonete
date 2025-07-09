const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// CORS para uploads - liberar geral
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
app.use('/uploads', require('express').static(require('path').join(__dirname, 'public/uploads')));

// Rotas
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/products', require('./routes/products'));
app.use('/categories', require('./routes/categories'));
app.use('/orders', require('./routes/orders'));
app.use('/api/establishment', require('./routes/establishment'));
app.use('/api/user-addresses', require('./routes/user-addresses'));

// Rota padrão
app.get('/api', (req, res) => {
  res.json({ message: 'API QuickPainel funcionando!' });
});

module.exports = app; 