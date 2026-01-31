// ============================================
// GESTOR FINANCEIRO 360° - SERVIDOR BACKEND
// Versão LIMPA (sem Supabase)
// ============================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get('/health', (req, res) => {
    res.json({ 
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'Servidor funcionando perfeitamente!'
    });
});

// ============================================
// ROTA 2: CALCULAR DIAGNÓSTICO
// ============================================
// Recebe respostas do diagnóstico e retorna pontuações

app.post('/calcular', (req, res) => {
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
// ROTA 3: CALCULAR PERDAS ESTIMADAS
// ============================================
// Estima perdas financeiras baseado na pontuação

app.post('/perdas', (req, res) => {
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
    console.log(`🚀 Rotas disponíveis:`);
    console.log(`🚀   GET  /health`);
    console.log(`🚀   POST /calcular`);
    console.log(`🚀   POST /perdas`);
    console.log('🚀 ================================');
    console.log('');
});

// ============================================
// EXPORT (para Vercel)
// ============================================

module.exports = app;
