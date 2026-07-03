const { User } = require('../models');

// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        // Validações
        if (!nome || !email || !senha) {
            return res.status(400).json({
                error: 'Campos obrigatórios: nome, email e senha.'
            });
        }

        if (nome.trim().length < 3) {
            return res.status(400).json({
                error: 'O nome deve ter pelo menos 3 caracteres.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Por favor, insira um e-mail válido.'
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({
                error: 'A senha deve ter pelo menos 6 caracteres.'
            });
        }

        // Verificar se email já existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                error: 'Este e-mail já está cadastrado no sistema.'
            });
        }

        // Criar usuário (role padrão: 'cliente')
        const user = await User.create({
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            senha
        });

        // Retornar sem a senha
        const userData = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            role: user.role,
            created_at: user.created_at
        };

        return res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            user: userData
        });
    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        return res.status(500).json({
            error: 'Erro interno do servidor. Tente novamente mais tarde.'
        });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                error: 'E-mail e senha são obrigatórios.'
            });
        }

        // Buscar usuário
        const user = await User.findOne({
            where: { email: email.trim().toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({
                error: 'E-mail ou senha incorretos.'
            });
        }

        // Validar senha
        const senhaValida = await user.validarSenha(senha);
        if (!senhaValida) {
            return res.status(401).json({
                error: 'E-mail ou senha incorretos.'
            });
        }

        // Retornar dados do usuário sem senha
        const userData = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            role: user.role,
            created_at: user.created_at
        };

        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            user: userData
        });
    } catch (err) {
        console.error('Erro ao fazer login:', err);
        return res.status(500).json({
            error: 'Erro interno do servidor. Tente novamente mais tarde.'
        });
    }
};

module.exports = { register, login };
