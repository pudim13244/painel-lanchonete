const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { findUserByEmail, findUserById, updateUser } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, executeQuery } = require('../config/database');

const router = express.Router();

// Validação para login
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Senha é obrigatória')
];

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = file.fieldname === 'logo' ? 'logos' : 'banners';
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '_' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Buscar usuário no banco
    const user = await findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        message: 'Email ou senha incorretos'
      });
    }

    // Verificar senha
    // Nota: Como as senhas no banco podem estar em texto plano ou hasheadas,
    // vamos tentar primeiro como texto plano, depois como hash
    let isValidPassword = false;
    
    // Tentar como texto plano primeiro
    if (password === user.password) {
      isValidPassword = true;
    } else {
      // Tentar como hash bcrypt
      try {
        isValidPassword = await bcrypt.compare(password, user.password);
      } catch (error) {
        // Se der erro no bcrypt, a senha não está hasheada
        isValidPassword = false;
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Email ou senha incorretos'
      });
    }

    // Gerar JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retornar dados do usuário (sem senha)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/auth/validate
router.get('/validate', authenticateToken, async (req, res) => {
  try {
    res.json({
      valid: true,
      user: req.user
    });
  } catch (error) {
    console.error('Erro na validação:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Em uma implementação mais robusta, você poderia invalidar o token
    // Por enquanto, apenas retornamos sucesso
    res.json({
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/auth/profile
router.put('/profile', [
  authenticateToken,
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('phone')
    .optional()
    .isLength({ min: 10, max: 20 })
    .withMessage('Telefone deve ter entre 10 e 20 caracteres'),
  body('address')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Endereço deve ter entre 5 e 500 caracteres')
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { name, phone, address } = req.body;
    const userId = req.user.id;

    // Atualizar usuário
    const updatedUser = await updateUser(userId, {
      name: name || req.user.name,
      phone: phone || req.user.phone,
      address: address || req.user.address
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/auth/refresh (opcional - para refresh tokens)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Gerar novo token
    const token = jwt.sign(
      {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token
    });
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Dados do usuário
    const { nome, email, senha, cpfCnpj, suporte } = req.body;

    // Validações básicas
    if (!nome || !email || !senha || !cpfCnpj || !suporte) {
      return res.status(400).json({ message: 'Dados do usuário obrigatórios.' });
    }

    // Verificar se usuário já existe
    const [userRows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (userRows.length > 0) {
      return res.status(400).json({ message: 'E-mail já cadastrado.' });
    }

    // Criar usuário
    const hashedPassword = await bcrypt.hash(senha, 10);
    const [userResult] = await pool.execute(
      'INSERT INTO users (name, email, password, role, phone, cpfCnpj) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, hashedPassword, 'ESTABLISHMENT', suporte, cpfCnpj]
    );

    res.status(201).json({ message: 'Cadastro realizado com sucesso!' });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ message: 'Erro ao cadastrar estabelecimento', error: error.message });
  }
});

module.exports = router; 