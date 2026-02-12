// ═══════════════════════════════════════════════════════════════════
// SERVIDOR BACKEND - GESTOR FINANCEIRO 360°
// Sistema Multi-Usuários MVP Integrado
// Data: 12/02/2026
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tdclvlukfckkibwlbgwo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkY2x2bHVrZmNra2lid2xiZ3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5ODk2MDksImV4cCI6MjA1MzU2NTYwOX0.SSavf8vriHMr7WWQ9SO1Cg_cUxdQoRr30HdwS7aUi1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE: Verificar autenticação
// ═══════════════════════════════════════════════════════════════════

async function verificarAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.status(500).json({ error: 'Erro ao verificar autenticação' });
    }
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS MULTI-USUÁRIOS
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// ENDPOINT: Convidar Usuário
// POST /api/usuarios/convidar
// ───────────────────────────────────────────────────────────────────

app.post('/api/usuarios/convidar', verificarAuth, async (req, res) => {
    try {
        const { empresa_id, email_convidado, role } = req.body;
        const user_id = req.user.id;

        console.log('📨 Convite recebido:', { empresa_id, email_convidado, role, user_id });

        // 1. Validar dados
        if (!empresa_id || !email_convidado || !role) {
            return res.status(400).json({ 
                error: 'Dados incompletos. Necessário: empresa_id, email_convidado, role' 
            });
        }

        if (!['admin', 'editor', 'viewer'].includes(role)) {
            return res.status(400).json({ 
                error: 'Role inválido. Use: admin, editor ou viewer' 
            });
        }

        // 2. Verificar se usuário atual é admin da empresa
        const { data: usuarioEmpresa, error: errorVerif } = await supabase
            .from('usuarios_empresas')
            .select('role')
            .eq('user_id', user_id)
            .eq('empresa_id', empresa_id)
            .eq('ativo', true)
            .single();

        if (errorVerif || !usuarioEmpresa) {
            return res.status(403).json({ error: 'Você não tem acesso a esta empresa' });
        }

        if (usuarioEmpresa.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas admins podem convidar usuários' });
        }

        // 3. Verificar se email já tem acesso
        const { data: usuarios } = await supabase.auth.admin.listUsers();
        const usuarioExistente = usuarios?.users?.find(u => u.email === email_convidado);

        if (usuarioExistente) {
            const { data: jaTemAcesso } = await supabase
                .from('usuarios_empresas')
                .select('id')
                .eq('user_id', usuarioExistente.id)
                .eq('empresa_id', empresa_id)
                .single();

            if (jaTemAcesso) {
                return res.status(400).json({ error: 'Este usuário já tem acesso à empresa' });
            }
        }

        // 4. Verificar se já existe convite pendente
        const { data: convitePendente } = await supabase
            .from('convites')
            .select('id')
            .eq('empresa_id', empresa_id)
            .eq('email_convidado', email_convidado)
            .eq('status', 'pendente')
            .single();

        if (convitePendente) {
            return res.status(400).json({ 
                error: 'Já existe um convite pendente para este email' 
            });
        }

        // 5. Buscar nome da empresa
        const { data: empresa } = await supabase
            .from('empresas')
            .select('nome_empresa')
            .eq('id', empresa_id)
            .single();

        // 6. Criar convite
        const token = crypto.randomUUID();
        const expira_em = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

        const { data: convite, error: errorConvite } = await supabase
            .from('convites')
            .insert({
                empresa_id,
                email_convidado,
                role,
                convidado_por: user_id,
                token,
                expira_em: expira_em.toISOString()
            })
            .select()
            .single();

        if (errorConvite) {
            console.error('Erro ao criar convite:', errorConvite);
            return res.status(500).json({ error: 'Erro ao criar convite' });
        }

        console.log('✅ Convite criado:', convite.id);

        // 7. Link do convite (MVP: manual)
        const linkConvite = `https://gestor360-frontend.vercel.app/aceitar-convite?token=${token}`;

        res.json({
            success: true,
            convite: {
                id: convite.id,
                email: email_convidado,
                role,
                empresa: empresa?.nome_empresa,
                link: linkConvite,
                expira_em
            },
            message: 'Convite criado com sucesso! (MVP: Copie e envie o link manualmente)'
        });

    } catch (error) {
        console.error('❌ Erro ao convidar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ───────────────────────────────────────────────────────────────────
// ENDPOINT: Aceitar Convite
// POST /api/usuarios/aceitar-convite
// ───────────────────────────────────────────────────────────────────

app.post('/api/usuarios/aceitar-convite', verificarAuth, async (req, res) => {
    try {
        const { token } = req.body;
        const user_id = req.user.id;

        console.log('🎫 Tentativa de aceitar convite:', { token, user_id });

        // 1. Validar token
        if (!token) {
            return res.status(400).json({ error: 'Token não fornecido' });
        }

        // 2. Buscar convite
        const { data: convite, error: errorConvite } = await supabase
            .from('convites')
            .select('*, empresas(nome_empresa)')
            .eq('token', token)
            .eq('status', 'pendente')
            .single();

        if (errorConvite || !convite) {
            return res.status(404).json({ error: 'Convite não encontrado ou já foi utilizado' });
        }

        // 3. Verificar email do usuário corresponde
        if (req.user.email !== convite.email_convidado) {
            return res.status(403).json({ 
                error: 'Este convite é para outro email. Faça login com: ' + convite.email_convidado 
            });
        }

        // 4. Verificar se expirou
        if (new Date() > new Date(convite.expira_em)) {
            await supabase
                .from('convites')
                .update({ status: 'expirado' })
                .eq('id', convite.id);

            return res.status(400).json({ error: 'Este convite expirou' });
        }

        // 5. Verificar se usuário já tem acesso
        const { data: jaTemAcesso } = await supabase
            .from('usuarios_empresas')
            .select('id')
            .eq('user_id', user_id)
            .eq('empresa_id', convite.empresa_id)
            .single();

        if (jaTemAcesso) {
            return res.status(400).json({ error: 'Você já tem acesso a esta empresa' });
        }

        // 6. Criar vínculo usuário-empresa
        const { error: errorVinculo } = await supabase
            .from('usuarios_empresas')
            .insert({
                user_id,
                empresa_id: convite.empresa_id,
                role: convite.role,
                convidado_por: convite.convidado_por,
                aceito: true,
                aceito_em: new Date().toISOString()
            });

        if (errorVinculo) {
            console.error('Erro ao criar vínculo:', errorVinculo);
            return res.status(500).json({ error: 'Erro ao aceitar convite' });
        }

        // 7. Atualizar convite como aceito
        await supabase
            .from('convites')
            .update({ 
                status: 'aceito',
                aceito_em: new Date().toISOString()
            })
            .eq('id', convite.id);

        console.log('✅ Convite aceito com sucesso!');

        res.json({
            success: true,
            empresa: {
                id: convite.empresa_id,
                nome: convite.empresas.nome_empresa
            },
            role: convite.role,
            message: 'Convite aceito! Você agora tem acesso à empresa.'
        });

    } catch (error) {
        console.error('❌ Erro ao aceitar convite:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ───────────────────────────────────────────────────────────────────
// ENDPOINT: Listar Usuários da Empresa
// GET /api/empresas/:empresa_id/usuarios
// ───────────────────────────────────────────────────────────────────

app.get('/api/empresas/:empresa_id/usuarios', verificarAuth, async (req, res) => {
    try {
        const { empresa_id } = req.params;
        const user_id = req.user.id;

        console.log('👥 Listando usuários da empresa:', empresa_id);

        // 1. Verificar se usuário tem acesso à empresa
        const { data: temAcesso, error: errorAcesso } = await supabase
            .from('usuarios_empresas')
            .select('role')
            .eq('user_id', user_id)
            .eq('empresa_id', empresa_id)
            .eq('ativo', true)
            .single();

        if (errorAcesso || !temAcesso) {
            return res.status(403).json({ error: 'Você não tem acesso a esta empresa' });
        }

        // 2. Buscar todos usuários da empresa
        const { data: usuariosEmpresas, error: errorUsuarios } = await supabase
            .from('usuarios_empresas')
            .select('*')
            .eq('empresa_id', empresa_id)
            .eq('ativo', true)
            .order('created_at', { ascending: true });

        if (errorUsuarios) {
            console.error('Erro ao buscar usuários:', errorUsuarios);
            return res.status(500).json({ error: 'Erro ao buscar usuários' });
        }

        // 3. Buscar dados dos usuários (email)
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        
        const usuariosComDados = usuariosEmpresas.map(ue => {
            const userData = allUsers?.users?.find(u => u.id === ue.user_id);
            
            return {
                id: ue.id,
                user_id: ue.user_id,
                email: userData?.email || 'N/A',
                role: ue.role,
                convidado_em: ue.convidado_em,
                aceito_em: ue.aceito_em,
                is_owner: ue.convidado_por === null,
                is_me: ue.user_id === user_id
            };
        });

        console.log(`✅ ${usuariosComDados.length} usuários encontrados`);

        res.json({
            success: true,
            usuarios: usuariosComDados,
            meu_role: temAcesso.role
        });

    } catch (error) {
        console.error('❌ Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ───────────────────────────────────────────────────────────────────
// ENDPOINT: Listar Empresas do Usuário
// GET /api/usuarios/minhas-empresas
// ───────────────────────────────────────────────────────────────────

app.get('/api/usuarios/minhas-empresas', verificarAuth, async (req, res) => {
    try {
        const user_id = req.user.id;

        console.log('🏢 Listando empresas do usuário:', user_id);

        // Buscar empresas onde usuário tem acesso
        const { data: usuariosEmpresas, error } = await supabase
            .from('usuarios_empresas')
            .select(`
                role,
                empresa_id,
                empresas (
                    id,
                    nome_empresa,
                    porte,
                    setor,
                    faturamento_anual,
                    owner_id
                )
            `)
            .eq('user_id', user_id)
            .eq('ativo', true);

        if (error) {
            console.error('Erro ao buscar empresas:', error);
            return res.status(500).json({ error: 'Erro ao buscar empresas' });
        }

        const empresas = usuariosEmpresas.map(ue => ({
            ...ue.empresas,
            meu_role: ue.role,
            sou_owner: ue.empresas.owner_id === user_id
        }));

        console.log(`✅ ${empresas.length} empresas encontradas`);

        res.json({
            success: true,
            empresas
        });

    } catch (error) {
        console.error('❌ Erro ao listar empresas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ───────────────────────────────────────────────────────────────────
// ENDPOINT: Remover Usuário
// DELETE /api/empresas/:empresa_id/usuarios/:usuario_empresa_id
// ───────────────────────────────────────────────────────────────────

app.delete('/api/empresas/:empresa_id/usuarios/:usuario_empresa_id', verificarAuth, async (req, res) => {
    try {
        const { empresa_id, usuario_empresa_id } = req.params;
        const user_id = req.user.id;

        console.log('🗑️ Removendo usuário:', { empresa_id, usuario_empresa_id });

        // 1. Verificar se é admin
        const { data: isAdmin } = await supabase
            .from('usuarios_empresas')
            .select('role')
            .eq('user_id', user_id)
            .eq('empresa_id', empresa_id)
            .eq('ativo', true)
            .single();

        if (!isAdmin || isAdmin.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas admins podem remover usuários' });
        }

        // 2. Buscar usuário a ser removido
        const { data: usuarioRemover } = await supabase
            .from('usuarios_empresas')
            .select('user_id')
            .eq('id', usuario_empresa_id)
            .single();

        // 3. Não permitir remover a si mesmo
        if (usuarioRemover && usuarioRemover.user_id === user_id) {
            return res.status(400).json({ error: 'Você não pode remover a si mesmo' });
        }

        // 4. Desativar usuário (MVP: não deletar, apenas desativar)
        const { error } = await supabase
            .from('usuarios_empresas')
            .update({ ativo: false })
            .eq('id', usuario_empresa_id)
            .eq('empresa_id', empresa_id);

        if (error) {
            console.error('Erro ao remover usuário:', error);
            return res.status(500).json({ error: 'Erro ao remover usuário' });
        }

        console.log('✅ Usuário removido com sucesso');

        res.json({
            success: true,
            message: 'Usuário removido com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao remover usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS ORIGINAIS (EXISTENTES)
// ═══════════════════════════════════════════════════════════════════

// Rota para criar/atualizar diagnóstico
app.post('/api/diagnostico', verificarAuth, async (req, res) => {
    try {
        const diagnosticoData = req.body;
        const userId = req.user.id;

        console.log('Recebendo diagnóstico do usuário:', userId);

        // Adicionar user_id ao diagnóstico
        diagnosticoData.user_id = userId;

        // Inserir no Supabase
        const { data, error } = await supabase
            .from('diagnosticos')
            .insert([diagnosticoData])
            .select();

        if (error) {
            console.error('Erro ao salvar diagnóstico:', error);
            return res.status(500).json({ error: 'Erro ao salvar diagnóstico' });
        }

        console.log('Diagnóstico salvo com sucesso:', data[0].id);

        res.json({
            success: true,
            diagnostico_id: data[0].id,
            message: 'Diagnóstico salvo com sucesso!'
        });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para obter diagnóstico
app.get('/api/diagnostico/:id', verificarAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('diagnosticos')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Erro ao buscar diagnóstico:', error);
            return res.status(404).json({ error: 'Diagnóstico não encontrado' });
        }

        res.json(data);

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para criar empresa
app.post('/api/empresas', verificarAuth, async (req, res) => {
    try {
        const empresaData = req.body;
        const userId = req.user.id;

        console.log('Criando empresa para usuário:', userId);

        // Adicionar user_id e owner_id à empresa
        empresaData.user_id = userId;
        empresaData.owner_id = userId;

        // Inserir no Supabase
        const { data, error } = await supabase
            .from('empresas')
            .insert([empresaData])
            .select();

        if (error) {
            console.error('Erro ao criar empresa:', error);
            return res.status(500).json({ error: 'Erro ao criar empresa' });
        }

        console.log('Empresa criada com sucesso:', data[0].id);

        // Criar entrada em usuarios_empresas (owner é sempre admin)
        await supabase
            .from('usuarios_empresas')
            .insert({
                user_id: userId,
                empresa_id: data[0].id,
                role: 'admin',
                aceito: true,
                aceito_em: new Date().toISOString()
            });

        res.json({
            success: true,
            empresa_id: data[0].id,
            message: 'Empresa criada com sucesso!'
        });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para obter empresa
app.get('/api/empresas/:id', verificarAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Erro ao buscar empresa:', error);
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        res.json(data);

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

app.get('/health', async (req, res) => {
    try {
        // Testar conexão com Supabase
        const { error } = await supabase
            .from('empresas')
            .select('count')
            .limit(1);

        res.json({
            status: 'online',
            supabase: error ? 'erro' : 'conectado',
            multiusuarios: 'ativo',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'erro',
            error: error.message
        });
    }
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'API Gestor Financeiro 360° - Multi-Usuários MVP',
        version: '2.0.0',
        endpoints: {
            diagnostico: '/api/diagnostico',
            empresas: '/api/empresas',
            usuarios: '/api/usuarios',
            health: '/health'
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  🚀 GESTOR 360° - BACKEND MULTI-USUÁRIOS MVP            ║
║                                                          ║
║  📍 Porta: ${PORT}                                      ║
║  🌐 Supabase: Conectado                                 ║
║  👥 Multi-usuários: Ativo                               ║
║                                                          ║
║  Endpoints Multi-Usuários:                              ║
║  • POST   /api/usuarios/convidar                        ║
║  • POST   /api/usuarios/aceitar-convite                 ║
║  • GET    /api/empresas/:id/usuarios                    ║
║  • GET    /api/usuarios/minhas-empresas                 ║
║  • DELETE /api/empresas/:id/usuarios/:user_id           ║
║                                                          ║
║  Endpoints Originais:                                    ║
║  • POST   /api/diagnostico                              ║
║  • GET    /api/diagnostico/:id                          ║
║  • POST   /api/empresas                                 ║
║  • GET    /api/empresas/:id                             ║
║  • GET    /health                                        ║
╚══════════════════════════════════════════════════════════╝
    `);
});

// ═══════════════════════════════════════════════════════════════════
// EXPORT (para Vercel)
// ═══════════════════════════════════════════════════════════════════

module.exports = app;
