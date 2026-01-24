// ═══════════════════════════════════════════════════════════════════
// 🚀 SERVIDOR DO GESTOR 360° (VERSÃO SIMPLES)
// ═══════════════════════════════════════════════════════════════════

// 📦 Importar bibliotecas necessárias
const express = require('express');
const cors = require('cors');

// 🏗️ Criar o servidor
const app = express();

// 🔧 Configurar o servidor
app.use(cors()); // Permite que o frontend acesse o backend
app.use(express.json()); // Permite receber dados em JSON

// 🎯 Porta onde o servidor vai rodar
const PORTA = 3000;

// ═══════════════════════════════════════════════════════════════════
// 📍 ROTAS (Endereços que o servidor responde)
// ═══════════════════════════════════════════════════════════════════

// ROTA 1: Página inicial
// Quando você abre localhost:3000 no navegador
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Gestor 360° API</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 20px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                    }
                    h1 { font-size: 3em; margin: 0; }
                    p { font-size: 1.5em; margin: 20px 0; }
                    .status { color: #4ade80; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 GESTOR 360° API</h1>
                    <p class="status">✅ FUNCIONANDO!</p>
                    <p>Backend está online e pronto para usar!</p>
                </div>
            </body>
        </html>
    `);
});

// ROTA 2: Verificar se está funcionando (health check)
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        mensagem: 'Backend Gestor 360° funcionando perfeitamente!',
        data: new Date().toLocaleString('pt-BR')
    });
});

// ROTA 3: Calcular pontuação do diagnóstico
app.post('/calcular', (req, res) => {
    try {
        // Recebe os dados do frontend
        const { respostas, config } = req.body;
        
        // Aqui vai a lógica de cálculo (vamos fazer depois)
        // Por enquanto, só retorna um exemplo
        
        const resultado = {
            sucesso: true,
            pontuacao: {
                total: 150,
                percentual: 62,
                nivel: 'Estruturado'
            },
            mensagem: 'Cálculo realizado com sucesso!'
        };
        
        res.json(resultado);
        
    } catch (erro) {
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao calcular',
            erro: erro.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 INICIAR O SERVIDOR
// ═══════════════════════════════════════════════════════════════════

app.listen(PORTA, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║  🚀 GESTOR 360° ONLINE                            ║
║                                                    ║
║  Status: ✅ Funcionando                           ║
║  Porta:  ${PORTA}                                 ║
║                                                    ║
║  Abra no navegador:                               ║
║  👉 http://localhost:${PORTA}                     ║
║                                                    ║
║  Para parar: Ctrl + C                             ║
║                                                    ║
╚════════════════════════════════════════════════════╝
    `);
});
