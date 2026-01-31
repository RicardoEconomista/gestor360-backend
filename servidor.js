// ============================================
// GESTOR FINANCEIRO 360° - SERVIDOR BACKEND
// Versão COMPLETA com Autenticação Supabase
// ============================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURAÇÃO SUPABASE
// ============================================

const SUPABASE_URL = 'https://eggyabjkdgkotkrjjmbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZ3lhYmprZGdrb3RrcmpqbWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MjMyMDYsImV4cCI6MjA4NTM5OTIwNn0.yJqjB7rMuIlKteRzZBGm1bDtUA8ZlAB29bkD8-s0Qjg';

// Importar Supabase (para Node.js no Vercel)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// MIDDLEWARES
// ============================================

// Permitir requisições de qualquer origem (CORS)
app.use(cors());

// Processar JSON no body das requisições
app.use(express.json());

// Log de todas as requisições (para debug)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// ROTA 1: HEALTH CHECK
// ============================================
// Verifica se o servidor está online

app.get('/health', async (req, res) => {
    try {
        // Testar conexão com Supabase
        const { error } = await supabase.from('usuarios_autorizados').select('count').single();
        
        res.json({ 
            status: 'online',
            timestamp: new Date().toISOString(),
            message: 'Servidor funcionando perfeitamente!',
            supabase: error ? 'erro' : 'conectado'
        });
    } catch (erro) {
        res.json({ 
            status: 'online',
            timestamp: new Date().toISOString(),
            message: 'Servidor online (Supabase não testado)',
            supabase: 'não testado'
        });
    }
});

// ============================================
// ROTA 2: VERIFICAR WHITELIST
// ============================================
// Verifica se o email está autorizado a criar conta

app.post('/api/auth/verificar-whitelist', async (req, res) => {
    try {
        console.log('🔍 Verificando whitelist...');
        
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                erro: 'Email não fornecido' 
            });
        }

        console.log(`📧 Email para verificar: ${email}`);

        // Buscar email na tabela usuarios_autorizados
        const { data, error } = await supabase
            .from('usuarios_autorizados')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('ativo', true)
            .single();

        if (error || !data) {
            console.log('❌ Email NÃO autorizado');
            return res.status(403).json({ 
                erro: 'Sistema em fase beta. Apenas emails autorizados podem criar conta.' 
            });
        }

        console.log('✅ Email autorizado!');
        res.json({ 
            autorizado: true,
            mensagem: 'Email autorizado a criar conta',
            dados: {
                nome: data.nome,
                cargo: data.cargo,
                empresa: data.empresa
            }
        });

    } catch (erro) {
        console.error('❌ Erro ao verificar whitelist:', erro);
        res.status(500).json({ 
            erro: 'Erro ao verificar autorização',
            detalhes: erro.message 
        });
    }
});

// ============================================
// ROTA 3: CALCULAR DIAGNÓSTICO (SEM AUTH)
// ============================================
// Recebe respostas do diagnóstico e retorna pontuações
// Esta rota funciona sem autenticação (compatibilidade)

app.post('/calcular', async (req, res) => {
    try {
        console.log('📊 Calculando diagnóstico...');
        
        // Pega os dados enviados pelo frontend
        const { respostas, porte, setor } = req.body;

        // Validação básica
        if (!respostas || typeof respostas !== 'object') {
            return res.status(400).json({ 
                erro: 'Dados inválidos: respostas não fornecidas' 
            });
        }

        // ============================================
        // LÓGICA DE CÁLCULO
        // ============================================
        
        // Categorias do diagnóstico
        const categorias = [
            'tesouraria',
            'resultados',
            'fluxoCaixa',
            'orcamento',
            'investimentos',
            'riscosFinanceiros',
            'indicadores',
            'planejamentoTributario'
        ];

        // Objeto para armazenar pontuações por categoria
        const pontuacoesCategorias = {};
        let pontuacaoTotal = 0;
        let totalPerguntas = 0;

        // Calcular pontuação de cada categoria
        categorias.forEach(categoria => {
            let pontos = 0;
            let perguntas = 0;

            // Percorrer todas as respostas
            Object.keys(respostas).forEach(pergunta => {
                // Se a pergunta pertence a esta categoria
                if (pergunta.startsWith(categoria)) {
                    const resposta = parseInt(respostas[pergunta]);
                    if (!isNaN(resposta)) {
                        pontos += resposta;
                        perguntas++;
                    }
                }
            });

            // Calcular média da categoria (0-100)
            const media = perguntas > 0 ? (pontos / perguntas) * 20 : 0;
            pontuacoesCategorias[categoria] = Math.round(media * 10) / 10;
            
            pontuacaoTotal += media;
            totalPerguntas += perguntas;
        });

        // Calcular média geral
        const mediaGeral = Math.round((pontuacaoTotal / categorias.length) * 10) / 10;

        // ============================================
        // RETORNAR RESULTADO
        // ============================================
        
        const resultado = {
            pontuacaoTotal: mediaGeral,
            pontuacoesCategorias: pontuacoesCategorias,
            totalPerguntas: totalPerguntas,
            porte: porte,
            setor: setor,
            timestamp: new Date().toISOString()
        };

        console.log('✅ Diagnóstico calculado com sucesso!');
        console.log(`   Pontuação total: ${mediaGeral}%`);
        
        res.json(resultado);

    } catch (erro) {
        console.error('❌ Erro ao calcular diagnóstico:', erro);
        res.status(500).json({ 
            erro: 'Erro ao processar diagnóstico',
            detalhes: erro.message 
        });
    }
});

// ============================================
// ROTA 4: CALCULAR PERDAS ESTIMADAS (SEM AUTH)
// ============================================
// Estima perdas financeiras baseado na pontuação

app.post('/perdas', async (req, res) => {
    try {
        console.log('💰 Calculando perdas estimadas...');
        
        const { pontuacao, faturamento } = req.body;

        // Validação
        if (!pontuacao || !faturamento) {
            return res.status(400).json({ 
                erro: 'Dados inválidos: pontuacao e faturamento são obrigatórios' 
            });
        }

        // ============================================
        // LÓGICA DE CÁLCULO DE PERDAS
        // ============================================
        
        // Quanto MENOR a pontuação, MAIOR a perda
        // Pontuação 100% = 0% de perda
        // Pontuação 0% = 20% de perda
        
        const percentualPerda = (100 - parseFloat(pontuacao)) * 0.2;
        const valorFaturamento = parseFloat(faturamento);
        const perdaEstimada = (valorFaturamento * percentualPerda) / 100;

        const resultado = {
            faturamentoAnual: valorFaturamento,
            pontuacaoDiagnostico: parseFloat(pontuacao),
            percentualPerda: Math.round(percentualPerda * 10) / 10,
            perdaEstimada: Math.round(perdaEstimada * 100) / 100,
            timestamp: new Date().toISOString()
        };

        console.log('✅ Perdas calculadas com sucesso!');
        console.log(`   Perda estimada: R$ ${resultado.perdaEstimada.toLocaleString('pt-BR')}`);
        
        res.json(resultado);

    } catch (erro) {
        console.error('❌ Erro ao calcular perdas:', erro);
        res.status(500).json({ 
            erro: 'Erro ao calcular perdas',
            detalhes: erro.message 
        });
    }
});

// ============================================
// ROTA 404: Rota não encontrada
// ============================================

app.use((req, res) => {
    res.status(404).json({ 
        erro: 'Rota não encontrada',
        rota: req.path,
        metodo: req.method
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ================================');
    console.log('🚀 GESTOR FINANCEIRO 360°');
    console.log('🚀 Servidor Backend ONLINE!');
    console.log('🚀 ================================');
    console.log(`🚀 Porta: ${PORT}`);
    console.log(`🚀 Supabase: ${SUPABASE_URL}`);
    console.log(`🚀 Rotas disponíveis:`);
    console.log(`🚀   GET  /health`);
    console.log(`🚀   POST /calcular`);
    console.log(`🚀   POST /perdas`);
    console.log(`🚀   POST /api/auth/verificar-whitelist`);
    console.log('🚀 ================================');
    console.log('');
});

// ============================================
// EXPORT (para Vercel)
// ============================================

module.exports = app;
