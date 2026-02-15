// ═══════════════════════════════════════════════════════════════════
// GESTOR FINANCEIRO 360° - BACKEND COMPLETO E CORRIGIDO
// ═══════════════════════════════════════════════════════════════════
// INSTRUÇÕES:
// 1. GitHub: https://github.com/RicardoEconomista/gestor360-backend
// 2. Clica em: servidor.js
// 3. Clica no lápis (Edit)
// 4. CTRL+A (seleciona tudo)
// 5. DELETE (apaga tudo)
// 6. COPIA TODO ESTE ARQUIVO
// 7. COLA no GitHub
// 8. Commit: "fix: servidor completo corrigido com CORS e health"
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_aqui_mude_em_producao';

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

// CORS - CORRIGIDO!
app.use(cors({
    origin: [
        'https://gestor360-frontend.vercel.app',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://gestor360-frontend-git-main-ricardo16.vercel.app',
        'https://gestor360-frontend-jt2p4alno-ricardo16.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware de verificação de token
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        console.log('❌ Token não fornecido');
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.userId = decoded.userId;
        next();
    });
}

// ═══════════════════════════════════════════════════════════════════
// ROTAS DE AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════════

// Registro de usuário
app.post('/auth/register', async (req, res) => {
    console.log('📥 POST /auth/register');
    
    try {
        const { email, senha, nome } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        // Criar usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: senha
        });
        
        if (authError) {
            console.error('Erro ao criar usuário:', authError);
            throw authError;
        }
        
        console.log('✅ Usuário criado:', authData.user.id);
        
        res.status(201).json({ 
            message: 'Usuário criado com sucesso',
            user: { 
                id: authData.user.id, 
                email: authData.user.email 
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no registro:', error);
        res.status(500).json({ 
            error: 'Erro ao criar usuário',
            details: error.message 
        });
    }
});

// Login de usuário
app.post('/auth/login', async (req, res) => {
    console.log('📥 POST /auth/login');
    
    try {
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        // Autenticar com Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha
        });
        
        if (error) {
            console.error('Erro no login:', error);
            throw error;
        }
        
        // Gerar JWT token
        const token = jwt.sign(
            { 
                userId: data.user.id, 
                email: data.user.email 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('✅ Login bem-sucedido:', data.user.id);
        
        res.json({ 
            token,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(401).json({ 
            error: 'Email ou senha incorretos',
            details: error.message 
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ROTAS DE EMPRESAS
// ═══════════════════════════════════════════════════════════════════

// Criar empresa
app.post('/empresas', verificarToken, async (req, res) => {
    console.log('📥 POST /empresas');
    console.log('Body recebido:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.userId);
    
    try {
        const { 
            nome_empresa, 
            setor, 
            porte, 
            faturamento_anual,
            dados_completos
        } = req.body;
        
        // Validações
        if (!nome_empresa) {
            console.error('❌ nome_empresa faltando');
            return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
        }
        
        if (!setor) {
            console.error('❌ setor faltando');
            return res.status(400).json({ error: 'Setor é obrigatório' });
        }
        
        if (!porte) {
            console.error('❌ porte faltando');
            return res.status(400).json({ error: 'Porte é obrigatório' });
        }
        
        console.log('✅ Validações OK');
        console.log('Inserindo no Supabase...');
        
        // Inserir empresa
        const { data, error } = await supabase
            .from('empresas')
            .insert([{
                nome_empresa,
                setor,
                porte,
                faturamento_anual: faturamento_anual || 0,
                dados_completos: dados_completos || {},
                user_id: req.userId,
                owner_id: req.userId
            }])
            .select()
            .single();
        
        if (error) {
            console.error('❌ Erro do Supabase:', error);
            throw error;
        }
        
        console.log('✅ Empresa criada com sucesso:', data.id);
        
        res.status(201).json({ empresa: data });
        
    } catch (error) {
        console.error('❌ Erro ao criar empresa:', error);
        res.status(500).json({ 
            error: 'Erro ao criar empresa',
            details: error.message,
            hint: error.hint || null
        });
    }
});

// Listar empresas
app.get('/empresas', verificarToken, async (req, res) => {
    console.log('📥 GET /empresas');
    console.log('User ID:', req.userId);
    
    try {
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .or(`user_id.eq.${req.userId},owner_id.eq.${req.userId}`)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ ${data.length} empresas encontradas`);
        
        res.json({ empresas: data });
        
    } catch (error) {
        console.error('❌ Erro ao listar empresas:', error);
        res.status(500).json({ 
            error: 'Erro ao listar empresas',
            details: error.message 
        });
    }
});

// Buscar empresa por ID
app.get('/empresas/:id', verificarToken, async (req, res) => {
    console.log('📥 GET /empresas/:id');
    
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Verificar se usuário tem acesso
        if (data.user_id !== req.userId && data.owner_id !== req.userId) {
            return res.status(403).json({ error: 'Sem permissão para acessar esta empresa' });
        }
        
        console.log('✅ Empresa encontrada:', id);
        
        res.json({ empresa: data });
        
    } catch (error) {
        console.error('❌ Erro ao buscar empresa:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar empresa',
            details: error.message 
        });
    }
});

// Atualizar empresa
app.put('/empresas/:id', verificarToken, async (req, res) => {
    console.log('📥 PUT /empresas/:id');
    
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Verificar permissão
        const { data: empresa } = await supabase
            .from('empresas')
            .select('user_id, owner_id')
            .eq('id', id)
            .single();
        
        if (!empresa || (empresa.user_id !== req.userId && empresa.owner_id !== req.userId)) {
            return res.status(403).json({ error: 'Sem permissão' });
        }
        
        // Atualizar
        const { data, error } = await supabase
            .from('empresas')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Empresa atualizada:', id);
        
        res.json({ empresa: data });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar empresa:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar empresa',
            details: error.message 
        });
    }
});

// Deletar empresa
app.delete('/empresas/:id', verificarToken, async (req, res) => {
    console.log('📥 DELETE /empresas/:id');
    
    try {
        const { id } = req.params;
        
        // Verificar se é owner
        const { data: empresa } = await supabase
            .from('empresas')
            .select('owner_id')
            .eq('id', id)
            .single();
        
        if (!empresa || empresa.owner_id !== req.userId) {
            return res.status(403).json({ error: 'Apenas o owner pode deletar' });
        }
        
        // Deletar
        const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        console.log('✅ Empresa deletada:', id);
        
        res.json({ message: 'Empresa deletada com sucesso' });
        
    } catch (error) {
        console.error('❌ Erro ao deletar empresa:', error);
        res.status(500).json({ 
            error: 'Erro ao deletar empresa',
            details: error.message 
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ROTAS DE DIAGNÓSTICOS
// ═══════════════════════════════════════════════════════════════════

// Salvar diagnóstico
app.post('/diagnosticos', verificarToken, async (req, res) => {
    console.log('📥 POST /diagnosticos');
    
    try {
        const { empresa_id, scores, respostas, completo } = req.body;
        
        // Inserir diagnóstico
        const { data: diagnostico, error: erroDiag } = await supabase
            .from('diagnosticos')
            .insert([{
                empresa_id,
                user_id: req.userId,
                score_geral: scores?.geral || 0,
                score_tesouraria: scores?.tesouraria || 0,
                score_resultados: scores?.resultados || 0,
                score_fluxo: scores?.fluxo || 0,
                score_orcamento: scores?.orcamento || 0,
                score_investimentos: scores?.investimentos || 0,
                score_riscos: scores?.riscos || 0,
                score_indicadores: scores?.indicadores || 0,
                score_tributario: scores?.tributario || 0,
                completo: completo || false
            }])
            .select()
            .single();
        
        if (erroDiag) throw erroDiag;
        
        // Inserir respostas
        if (respostas && respostas.length > 0) {
            const respostasComDiagnostico = respostas.map(r => ({
                ...r,
                diagnostico_id: diagnostico.id
            }));
            
            const { error: erroResp } = await supabase
                .from('respostas_diagnostico')
                .insert(respostasComDiagnostico);
            
            if (erroResp) throw erroResp;
        }
        
        console.log('✅ Diagnóstico salvo:', diagnostico.id);
        
        res.status(201).json({ diagnostico });
        
    } catch (error) {
        console.error('❌ Erro ao salvar diagnóstico:', error);
        res.status(500).json({ 
            error: 'Erro ao salvar diagnóstico',
            details: error.message 
        });
    }
});

// Buscar diagnósticos
app.get('/diagnosticos/:empresa_id', verificarToken, async (req, res) => {
    console.log('📥 GET /diagnosticos/:empresa_id');
    
    try {
        const { empresa_id } = req.params;
        
        const { data, error } = await supabase
            .from('diagnosticos')
            .select('*')
            .eq('empresa_id', empresa_id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ ${data.length} diagnósticos encontrados`);
        
        res.json({ diagnosticos: data });
        
    } catch (error) {
        console.error('❌ Erro ao buscar diagnósticos:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar diagnósticos',
            details: error.message 
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Backend funcionando!',
        timestamp: new Date().toISOString()
    });
});

// ═══════════════════════════════════════════════════════════════════
// SERVIDOR
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   GESTOR FINANCEIRO 360° - BACKEND         ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 CORS habilitado para: gestor360-frontend.vercel.app`);
    console.log('');
});

// Export para Vercel
module.exports = app;
