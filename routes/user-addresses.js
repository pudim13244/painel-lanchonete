const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Buscar endereços de um usuário por telefone
router.get('/by-phone/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        // Primeiro, encontrar o usuário pelo telefone
        const [users] = await db.query(
            'SELECT id, name, phone FROM users WHERE phone = ?',
            [phone]
        );

        if (users.length === 0) {
            return res.json({ 
                success: true, 
                user: null, 
                addresses: [] 
            });
        }

        // Se houver múltiplos usuários com o mesmo telefone, retornar erro
        if (users.length > 1) {
            return res.status(400).json({
                success: false,
                message: 'Múltiplos usuários encontrados com este telefone. Entre em contato com o administrador.',
                duplicateUsers: users
            });
        }

        const user = users[0];

        // Buscar endereços do usuário
        const [addresses] = await db.query(
            `SELECT id, label, address, is_default, created_at 
             FROM user_address 
             WHERE user_id = ? 
             ORDER BY is_default DESC, created_at ASC`,
            [user.id]
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone
            },
            addresses
        });

    } catch (error) {
        console.error('Erro ao buscar endereços por telefone:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Listar endereços de um usuário
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar se o usuário logado está acessando seus próprios endereços
        if (req.user.id != userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const [addresses] = await db.query(
            `SELECT id, label, address, is_default, created_at, updated_at 
             FROM user_address 
             WHERE user_id = ? 
             ORDER BY is_default DESC, created_at ASC`,
            [userId]
        );

        res.json({
            success: true,
            addresses
        });

    } catch (error) {
        console.error('Erro ao listar endereços:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Adicionar novo endereço
router.post('/', auth, async (req, res) => {
    try {
        const { label, address, is_default = false } = req.body;
        const userId = req.user.id;

        if (!label || !address) {
            return res.status(400).json({
                success: false,
                message: 'Label e endereço são obrigatórios'
            });
        }

        // Se este endereço será o padrão, remover o padrão anterior
        if (is_default) {
            await db.query(
                'UPDATE user_address SET is_default = 0 WHERE user_id = ?',
                [userId]
            );
        }

        const [result] = await db.query(
            `INSERT INTO user_address (user_id, label, address, is_default, created_at, updated_at) 
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [userId, label, address, is_default]
        );

        const [newAddress] = await db.query(
            'SELECT * FROM user_address WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            address: newAddress[0]
        });

    } catch (error) {
        console.error('Erro ao adicionar endereço:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Atualizar endereço
router.put('/:addressId', auth, async (req, res) => {
    try {
        const { addressId } = req.params;
        const { label, address, is_default = false } = req.body;
        const userId = req.user.id;

        if (!label || !address) {
            return res.status(400).json({
                success: false,
                message: 'Label e endereço são obrigatórios'
            });
        }

        // Verificar se o endereço pertence ao usuário
        const [existingAddress] = await db.query(
            'SELECT user_id FROM user_address WHERE id = ?',
            [addressId]
        );

        if (existingAddress.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Endereço não encontrado'
            });
        }

        if (existingAddress[0].user_id != userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // Se este endereço será o padrão, remover o padrão anterior
        if (is_default) {
            await db.query(
                'UPDATE user_address SET is_default = 0 WHERE user_id = ? AND id != ?',
                [userId, addressId]
            );
        }

        await db.query(
            `UPDATE user_address 
             SET label = ?, address = ?, is_default = ?, updated_at = NOW() 
             WHERE id = ?`,
            [label, address, is_default, addressId]
        );

        const [updatedAddress] = await db.query(
            'SELECT * FROM user_address WHERE id = ?',
            [addressId]
        );

        res.json({
            success: true,
            address: updatedAddress[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar endereço:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Excluir endereço
router.delete('/:addressId', auth, async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.user.id;

        // Verificar se o endereço pertence ao usuário
        const [existingAddress] = await db.query(
            'SELECT user_id, is_default FROM user_address WHERE id = ?',
            [addressId]
        );

        if (existingAddress.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Endereço não encontrado'
            });
        }

        if (existingAddress[0].user_id != userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        await db.query('DELETE FROM user_address WHERE id = ?', [addressId]);

        // Se o endereço excluído era o padrão, definir o próximo como padrão
        if (existingAddress[0].is_default) {
            const [nextAddress] = await db.query(
                'SELECT id FROM user_address WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
                [userId]
            );

            if (nextAddress.length > 0) {
                await db.query(
                    'UPDATE user_address SET is_default = 1 WHERE id = ?',
                    [nextAddress[0].id]
                );
            }
        }

        res.json({
            success: true,
            message: 'Endereço excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir endereço:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Definir endereço como padrão
router.patch('/:addressId/set-default', auth, async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.user.id;

        // Verificar se o endereço pertence ao usuário
        const [existingAddress] = await db.query(
            'SELECT user_id FROM user_address WHERE id = ?',
            [addressId]
        );

        if (existingAddress.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Endereço não encontrado'
            });
        }

        if (existingAddress[0].user_id != userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // Remover padrão anterior e definir novo padrão
        await db.query(
            'UPDATE user_address SET is_default = 0 WHERE user_id = ?',
            [userId]
        );

        await db.query(
            'UPDATE user_address SET is_default = 1, updated_at = NOW() WHERE id = ?',
            [addressId]
        );

        res.json({
            success: true,
            message: 'Endereço definido como padrão'
        });

    } catch (error) {
        console.error('Erro ao definir endereço padrão:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

module.exports = router; 