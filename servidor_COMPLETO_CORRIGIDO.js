// ═══════════════════════════════════════════════════════════════════
// GESTOR FINANCEIRO 360° - BACKEND ESTADO ANTERIOR (SEM MULTI-USUÁRIOS)
// ═══════════════════════════════════════════════════════════════════
// Este é o código LIMPO e FUNCIONAL que estava antes
// Sistema básico: Login + Empresas + Diagnósticos
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

const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_aqui';

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

app.use(cors({
    origin: [
        'https://gestor360-frontend.vercel.app',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));

app.use(express.json());

function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.userId = decoded.userId;
        next();
    });
}

// ═══════════════════════════════════════════════════════════════════
// ROTAS DE AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════════

app.post('/auth/register', async (req, res) => {
    try {
        const { email, senha, nome } = req.body;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: senha
        });
        
        if (authError) throw authError;
        
        res.status(201).json({ 
            message: 'Usuário criado com sucesso',
            user: { id: authData.user.id, email }
        });
        
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha
        });
        
        if (error) throw error;
        
        const token = jwt.sign(
            { userId: data.user.id, email: data.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({ 
            token,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        });
        
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(401).json({ error: 'Email ou senha incorretos' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ROTAS DE EMPRESAS
// ═══════════════════════════════════════════════════════════════════

app.post('/empresas', verificarToken, async (req, res) => {
    try {
        const { 
            nome_empresa, 
            responsavel, 
            setor, 
            porte, 
            faturamento_mensal, 
            cidade_estado 
        } = req.body;
        
        const { data, error } = await supabase
            .from('empresas')
            .insert([{
                nome_empresa,
                responsavel,
                setor,
                porte,
                faturamento_mensal,
                cidade_estado,
                user_id: req.userId,
                owner_id: req.userId
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        res.status(201).json({ empresa: data });
        
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ error: 'Erro ao criar empresa' });
    }
});

app.get('/empresas', verificarToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .or(`user_id.eq.${req.userId},owner_id.eq.${req.userId}`)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({ empresas: data });
        
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ error: 'Erro ao listar empresas' });
    }
});

app.get('/empresas/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (data.user_id !== req.userId && data.owner_id !== req.userId) {
            return res.status(403).json({ error: 'Sem permissão' });
        }
        
        res.json({ empresa: data });
        
    } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar empresa' });
    }
});

app.put('/empresas/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const { data: empresa } = await supabase
            .from('empresas')
            .select('user_id, owner_id')
            .eq('id', id)
            .single();
        
        if (!empresa || (empresa.user_id !== req.userId && empresa.owner_id !== req.userId)) {
            return res.status(403).json({ error: 'Sem permissão' });
        }
        
        const { data, error } = await supabase
            .from('empresas')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ empresa: data });
        
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
});

app.delete('/empresas/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: empresa } = await supabase
            .from('empresas')
            .select('owner_id')
            .eq('id', id)
            .single();
        
        if (!empresa || empresa.owner_id !== req.userId) {
            return res.status(403).json({ error: 'Apenas o owner pode deletar' });
        }
        
        const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        res.json({ message: 'Empresa deletada com sucesso' });
        
    } catch (error) {
        console.error('Erro ao deletar empresa:', error);
        res.status(500).json({ error: 'Erro ao deletar empresa' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ROTAS DE DIAGNÓSTICOS
// ═══════════════════════════════════════════════════════════════════

app.post('/diagnosticos', verificarToken, async (req, res) => {
    try {
        const { empresa_id, scores, respostas, completo } = req.body;
        
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
        
        res.status(201).json({ diagnostico });
        
    } catch (error) {
        console.error('Erro ao salvar diagnóstico:', error);
        res.status(500).json({ error: 'Erro ao salvar diagnóstico' });
    }
});

app.get('/diagnosticos/:empresa_id', verificarToken, async (req, res) => {
    try {
        const { empresa_id } = req.params;
        
        const { data, error } = await supabase
            .from('diagnosticos')
            .select('*')
            .eq('empresa_id', empresa_id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({ diagnosticos: data });
        
    } catch (error) {
        console.error('Erro ao buscar diagnósticos:', error);
        res.status(500).json({ error: 'Erro ao buscar diagnósticos' });
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
    console.log('');
});

module.exports = app;
