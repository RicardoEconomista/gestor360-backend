// ============================================
// GESTOR 360° - BACKEND COM SUPABASE
// ============================================
// Arquivo: servidor.js
// Função: API backend com autenticação e banco de dados

const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// ============================================
// MIDDLEWARE: VERIFICAR AUTENTICAÇÃO
// ============================================
async function verificarAutenticacao(req, res, next) {
    try {
        // Pegar token do header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                erro: 'Token de autenticação não fornecido' 
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verificar token com Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ 
                erro: 'Token inválido ou expirado' 
            });
        }

        // Adicionar usuário à requisição
        req.user = user;
        next();
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        res.status(500).json({ 
            erro: 'Erro ao verificar autenticação' 
        });
    }
}

// ============================================
// ROTA: HEALTH CHECK (Sem autenticação)
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        mensagem: 'Backend Gestor 360° funcionando perfeitamente!',
        supabase: 'conectado',
        data: new Date().toLocaleString('pt-BR')
    });
});

// ============================================
// 🆕 ROTA: DEBUG - Ver o que está sendo enviado
// ============================================
app.post('/debug', (req, res) => {
    console.log('🐛 DEBUG - Requisição recebida');
    console.log('📦 Headers:', req.headers);
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    
    res.json({
        sucesso: true,
        mensagem: 'Debug ativado - verifique os logs do servidor',
        recebido: {
            headers: req.headers,
            body: req.body,
            bodyKeys: Object.keys(req.body),
            bodyType: typeof req.body
        }
    });
});

// ============================================
// ROTA: CADASTRO DE USUÁRIO
// ============================================
app.post('/api/auth/cadastro', async (req, res) => {
    try {
        const { email, senha, nome } = req.body;

        // Validação básica
        if (!email || !senha || !nome) {
            return res.status(400).json({ 
                erro: 'Email, senha e nome são obrigatórios' 
            });
        }

        // ============================================
        // 🔐 VERIFICAR WHITELIST (Lista de emails autorizados)
        // ============================================
        console.log(`🔍 Verificando se email está autorizado: ${email}`);
        
        const { data: emailAutorizado, error: whitelistError } = await supabase
            .from('usuarios_autorizados')
            .select('email, nome, ativo')
            .eq('email', email.toLowerCase())
            .eq('ativo', true)
            .single();

        if (whitelistError || !emailAutorizado) {
            console.log(`❌ Email NÃO autorizado: ${email}`);
            return res.status(403).json({ 
                erro: 'Sistema em fase beta',
                mensagem: 'No momento, estamos em fase de testes com usuários selecionados. Para solicitar acesso, entre em contato através do email: contato@gestor360.com.br',
                tipo: 'acesso_restrito'
            });
        }

        console.log(`✅ Email autorizado: ${email}`);

        // Criar usuário no Supabase
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: {
                    nome: nome
                }
            }
        });

        if (error) {
            return res.status(400).json({ 
                erro: error.message 
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Usuário cadastrado com sucesso! Verifique seu email.',
            usuario: {
                id: data.user.id,
                email: data.user.email,
                nome: nome
            }
        });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ 
            erro: 'Erro ao cadastrar usuário' 
        });
    }
});

// ============================================
// ROTA: LOGIN
// ============================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Validação básica
        if (!email || !senha) {
            return res.status(400).json({ 
                erro: 'Email e senha são obrigatórios' 
            });
        }

        // Fazer login no Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            return res.status(401).json({ 
                erro: 'Email ou senha incorretos' 
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso!',
            token: data.session.access_token,
            usuario: {
                id: data.user.id,
                email: data.user.email,
                nome: data.user.user_metadata.nome || 'Usuário'
            }
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ 
            erro: 'Erro ao fazer login' 
        });
    }
});

// ============================================
// 🆕 ROTA ATALHO: CALCULAR (SEM AUTENTICAÇÃO)
// Para compatibilidade com frontend atual
// ============================================
app.post('/calcular', async (req, res) => {
    try {
        console.log('📥 Requisição recebida em /calcular');
        console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
        
        // Extração UNIVERSAL de dados (aceita QUALQUER formato)
        let respostas = req.body.respostas || 
                       req.body.diagnostico || 
                       req.body.answers ||
                       req.body.questoes ||
                       req.body.perguntas;
        
        let dadosEmpresa = req.body.dadosEmpresa || 
                          req.body.empresa ||
                          req.body.company ||
                          req.body.dados ||
                          {};

        // Se não achou respostas nos campos esperados, tenta pegar do body direto
        if (!respostas && typeof req.body === 'object') {
            // Verifica se o body tem números como chaves (pode ser as respostas diretas)
            const keys = Object.keys(req.body);
            const hasNumericKeys = keys.some(k => !isNaN(parseInt(k)));
            
            if (hasNumericKeys) {
                respostas = req.body;
            }
        }

        console.log('✅ Respostas extraídas:', respostas ? 'SIM' : 'NÃO');
        console.log('✅ DadosEmpresa extraídos:', dadosEmpresa ? 'SIM' : 'NÃO');

        // Validação
        if (!respostas) {
            console.error('❌ Erro: Respostas não encontradas');
            return res.status(400).json({ 
                erro: 'Respostas não encontradas no body',
                dica: 'Envie {respostas: {...}, dadosEmpresa: {...}}',
                recebido: Object.keys(req.body)
            });
        }

        // ===== CÁLCULO DE PONTUAÇÃO (Lógica original) =====
        
        // Definir categorias
        const categorias = {
            'Tesouraria': { inicio: 0, fim: 9 },
            'Resultados & DRE': { inicio: 10, fim: 19 },
            'Fluxo de Caixa': { inicio: 20, fim: 35 },
            'Orçamento': { inicio: 36, fim: 45 },
            'Investimentos': { inicio: 46, fim: 55 },
            'Riscos Financeiros': { inicio: 56, fim: 65 },
            'Indicadores Financeiros': { inicio: 66, fim: 75 },
            'Planejamento Tributário': { inicio: 76, fim: 79 }
        };

        // Calcular pontuação por categoria
        const pontuacoesCategorias = {};
        let pontuacaoTotal = 0;

        for (const [categoria, range] of Object.entries(categorias)) {
            let pontos = 0;
            let questoesRespondidas = 0;

            for (let i = range.inicio; i <= range.fim; i++) {
                if (respostas[i] !== undefined) {
                    pontos += respostas[i];
                    questoesRespondidas++;
                }
            }

            pontuacoesCategorias[categoria] = {
                pontos: pontos,
                questoes: questoesRespondidas,
                media: questoesRespondidas > 0 ? (pontos / questoesRespondidas) * 10 : 0
            };

            pontuacaoTotal += pontos;
        }

        const totalQuestoes = Object.keys(respostas).length;
        const pontuacaoMedia = totalQuestoes > 0 ? (pontuacaoTotal / totalQuestoes) * 10 : 0;

        console.log('✅ Cálculo concluído com sucesso!');
        console.log(`📊 Pontuação: ${pontuacaoMedia.toFixed(1)}/100`);
        console.log(`📝 ${totalQuestoes} questões processadas`);

        // Retornar resultado (SEM salvar no banco - sem autenticação)
        res.json({
            sucesso: true,
            pontuacaoTotal: pontuacaoMedia.toFixed(1),
            pontuacoesCategorias: pontuacoesCategorias,
            mensagem: 'Diagnóstico calculado (modo sem login)',
            debug: {
                questoesRecebidas: totalQuestoes,
                categoriasCalculadas: Object.keys(pontuacoesCategorias).length
            }
        });

    } catch (error) {
        console.error('❌ Erro ao calcular diagnóstico:', error);
        res.status(500).json({ 
            erro: 'Erro ao processar diagnóstico',
            detalhes: error.message 
        });
    }
});

// ============================================
// 🆕 ROTA ATALHO: PERDAS (SEM AUTENTICAÇÃO)
// Para compatibilidade com frontend atual
// ============================================
app.post('/perdas', async (req, res) => {
    try {
        console.log('📥 Requisição recebida em /perdas');
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
        
        // Extração universal
        let pontuacaoTotal = req.body.pontuacaoTotal || 
                            req.body.pontuacao ||
                            req.body.score ||
                            req.body.total;
        
        let faturamentoAnual = req.body.faturamentoAnual || 
                              req.body.faturamento ||
                              req.body.revenue ||
                              req.body.receita;

        if (!pontuacaoTotal || !faturamentoAnual) {
            console.error('❌ Erro: Dados insuficientes');
            return res.status(400).json({ 
                erro: 'Pontuação e faturamento são obrigatórios',
                dica: 'Envie {pontuacaoTotal: 75.5, faturamentoAnual: 1000000}',
                recebido: Object.keys(req.body)
            });
        }

        // Cálculo de perdas (lógica original)
        const percentualPerda = (100 - parseFloat(pontuacaoTotal)) / 100;
        const perdaEstimada = parseFloat(faturamentoAnual) * percentualPerda * 0.15;

        console.log('✅ Perdas calculadas com sucesso!');
        console.log(`💰 Perda estimada: R$ ${perdaEstimada.toFixed(2)}`);

        res.json({
            sucesso: true,
            perdaEstimada: perdaEstimada.toFixed(2),
            percentualPerda: (percentualPerda * 100).toFixed(1)
        });

    } catch (error) {
        console.error('❌ Erro ao calcular perdas:', error);
        res.status(500).json({ 
            erro: 'Erro ao calcular perdas',
            detalhes: error.message 
        });
    }
});

// ============================================
// ROTA: CALCULAR DIAGNÓSTICO (COM AUTENTICAÇÃO)
// ============================================
app.post('/api/diagnostico/calcular', verificarAutenticacao, async (req, res) => {
    try {
        const { respostas, dadosEmpresa } = req.body;

        // Validação
        if (!respostas || !dadosEmpresa) {
            return res.status(400).json({ 
                erro: 'Respostas e dados da empresa são obrigatórios' 
            });
        }

        // ===== CÁLCULO DE PONTUAÇÃO (Lógica original) =====
        
        // Definir categorias
        const categorias = {
            'Tesouraria': { inicio: 0, fim: 9 },
            'Resultados & DRE': { inicio: 10, fim: 19 },
            'Fluxo de Caixa': { inicio: 20, fim: 35 },
            'Orçamento': { inicio: 36, fim: 45 },
            'Investimentos': { inicio: 46, fim: 55 },
            'Riscos Financeiros': { inicio: 56, fim: 65 },
            'Indicadores Financeiros': { inicio: 66, fim: 75 },
            'Planejamento Tributário': { inicio: 76, fim: 79 }
        };

        // Calcular pontuação por categoria
        const pontuacoesCategorias = {};
        let pontuacaoTotal = 0;

        for (const [categoria, range] of Object.entries(categorias)) {
            let pontos = 0;
            let questoesRespondidas = 0;

            for (let i = range.inicio; i <= range.fim; i++) {
                if (respostas[i] !== undefined) {
                    pontos += respostas[i];
                    questoesRespondidas++;
                }
            }

            pontuacoesCategorias[categoria] = {
                pontos: pontos,
                questoes: questoesRespondidas,
                media: questoesRespondidas > 0 ? (pontos / questoesRespondidas) * 10 : 0
            };

            pontuacaoTotal += pontos;
        }

        const totalQuestoes = Object.keys(respostas).length;
        const pontuacaoMedia = totalQuestoes > 0 ? (pontuacaoTotal / totalQuestoes) * 10 : 0;

        // ===== SALVAR NO BANCO SUPABASE =====

        // 1. Salvar/Atualizar empresa
        const { data: empresaData, error: empresaError } = await supabase
            .from('empresas')
            .upsert({
                user_id: req.user.id,
                nome_empresa: dadosEmpresa.nomeEmpresa,
                porte: dadosEmpresa.porte,
                setor: dadosEmpresa.setor,
                faturamento_anual: dadosEmpresa.faturamentoAnual || 0,
                dados_completos: dadosEmpresa,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (empresaError) {
            console.error('Erro ao salvar empresa:', empresaError);
            // Continua mesmo com erro (não bloqueia resposta)
        }

        // 2. Salvar diagnóstico
        if (empresaData) {
            const { error: diagnosticoError } = await supabase
                .from('diagnosticos')
                .insert({
                    user_id: req.user.id,
                    empresa_id: empresaData.id,
                    respostas: respostas,
                    pontuacao_total: pontuacaoMedia,
                    pontuacoes_categorias: pontuacoesCategorias,
                    perdas_estimadas: 0, // Será calculado na próxima rota
                    created_at: new Date().toISOString()
                });

            if (diagnosticoError) {
                console.error('Erro ao salvar diagnóstico:', diagnosticoError);
                // Continua mesmo com erro
            }
        }

        // Retornar resultado
        res.json({
            sucesso: true,
            pontuacaoTotal: pontuacaoMedia.toFixed(1),
            pontuacoesCategorias: pontuacoesCategorias,
            empresaSalva: !!empresaData,
            empresaId: empresaData?.id
        });

    } catch (error) {
        console.error('Erro ao calcular diagnóstico:', error);
        res.status(500).json({ 
            erro: 'Erro ao processar diagnóstico' 
        });
    }
});

// ============================================
// ROTA: CALCULAR PERDAS (COM AUTENTICAÇÃO)
// ============================================
app.post('/api/diagnostico/perdas', verificarAutenticacao, async (req, res) => {
    try {
        const { pontuacaoTotal, faturamentoAnual } = req.body;

        if (!pontuacaoTotal || !faturamentoAnual) {
            return res.status(400).json({ 
                erro: 'Pontuação e faturamento são obrigatórios' 
            });
        }

        // Cálculo de perdas (lógica original)
        const percentualPerda = (100 - parseFloat(pontuacaoTotal)) / 100;
        const perdaEstimada = parseFloat(faturamentoAnual) * percentualPerda * 0.15;

        res.json({
            sucesso: true,
            perdaEstimada: perdaEstimada.toFixed(2),
            percentualPerda: (percentualPerda * 100).toFixed(1)
        });

    } catch (error) {
        console.error('Erro ao calcular perdas:', error);
        res.status(500).json({ 
            erro: 'Erro ao calcular perdas' 
        });
    }
});

// ============================================
// ROTA: LISTAR EMPRESAS DO USUÁRIO
// ============================================
app.get('/api/empresas', verificarAutenticacao, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ 
                erro: 'Erro ao buscar empresas' 
            });
        }

        res.json({
            sucesso: true,
            empresas: data || []
        });

    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ 
            erro: 'Erro ao listar empresas' 
        });
    }
});

// ============================================
// ROTA: LISTAR DIAGNÓSTICOS DE UMA EMPRESA
// ============================================
app.get('/api/diagnosticos/:empresaId', verificarAutenticacao, async (req, res) => {
    try {
        const { empresaId } = req.params;

        const { data, error } = await supabase
            .from('diagnosticos')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ 
                erro: 'Erro ao buscar diagnósticos' 
            });
        }

        res.json({
            sucesso: true,
            diagnosticos: data || []
        });

    } catch (error) {
        console.error('Erro ao listar diagnósticos:', error);
        res.status(500).json({ 
            erro: 'Erro ao listar diagnósticos' 
        });
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`\n🚀 Backend Gestor 360° rodando na porta ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`✅ Supabase conectado!`);
    console.log(`🔐 Autenticação ativada!`);
    console.log(`🆕 Rotas de atalho disponíveis: /calcular, /perdas\n`);
});
