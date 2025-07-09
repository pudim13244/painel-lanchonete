const jwt = require('jsonwebtoken');
const { pool, executeQuery } = require('../config/database');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        message: 'Token de acesso não fornecido'
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, phone, address FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Usuário não encontrado'
      });
    }
    
    // Adicionar dados do usuário à requisição
    req.user = rows[0];
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Token inválido'
      });
    }
    
    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar se o usuário tem um role específico
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Usuário não autenticado'
      });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'Acesso negado. Permissão insuficiente.'
      });
    }
    
    next();
  };
};

// Middleware para verificar se é um cliente
const requireCustomer = requireRole('CUSTOMER');

// Middleware para verificar se é um estabelecimento
const requireEstablishment = requireRole('ESTABLISHMENT');

// Middleware para verificar se é um entregador
const requireDelivery = requireRole('DELIVERY');

// Middleware para verificar se é estabelecimento ou entregador
const requireEstablishmentOrDelivery = requireRole(['ESTABLISHMENT', 'DELIVERY']);

// Middleware opcional - não falha se não houver token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await executeQuery(
        'SELECT id, name, email, role, phone, address FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      if (user.length > 0) {
        req.user = user[0];
      }
    }
    
    next();
  } catch (error) {
    // Se houver erro no token, continua sem autenticação
    next();
  }
};

const verifyToken = async (req, res, next) => {
  console.log('Middleware verifyToken - Início');
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token recebido:', token);

    if (!token) {
      console.log('Middleware verifyToken - Token não fornecido');
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);
    // Buscar usuário completo no banco
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, phone, address FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (rows.length === 0) {
      console.log('Middleware verifyToken - Usuário não encontrado');
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    req.user = rows[0];
    console.log('Middleware verifyToken - Usuário autenticado:', req.user);
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(401).json({ message: 'Token inválido' });
  }
};

const isEstablishment = (req, res, next) => {
  console.log('Middleware isEstablishment - Usuário:', req.user);
  if (!req.user) {
    console.log('Middleware isEstablishment - Usuário não autenticado');
    return res.status(401).json({ 
      message: 'Usuário não autenticado' 
    });
  }

  if (req.user.role !== 'ESTABLISHMENT') {
    console.log('Middleware isEstablishment - Acesso negado. Role:', req.user.role);
    return res.status(403).json({ 
      message: 'Acesso permitido apenas para estabelecimentos' 
    });
  }

  console.log('Middleware isEstablishment - Usuário é ESTABLISHMENT');
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireCustomer,
  requireEstablishment,
  requireDelivery,
  requireEstablishmentOrDelivery,
  optionalAuth,
  verifyToken,
  isEstablishment
}; 