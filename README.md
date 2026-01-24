# 🚀 GESTOR 360° - BACKEND SIMPLES

**Versão para iniciantes - Passo de bebê** 👶

---

## 📦 O QUE TEM NESTA PASTA?

```
gestor360-simples/
│
├── 📄 COMEÇAR_AQUI.txt    ← Leia este PRIMEIRO!
├── 📄 README.md           ← Este arquivo (instruções extras)
├── 📄 package.json        ← Lista do que precisa instalar
└── 📄 servidor.js         ← O servidor (código principal)
```

**São só 4 arquivos!** Bem simples! 😊

---

## ⚡ INÍCIO RÁPIDO (3 comandos)

**No Prompt de Comando, dentro desta pasta:**

```
1️⃣ npm install     (instala o necessário)
2️⃣ npm start       (liga o servidor)
3️⃣ Abra: localhost:3000 no navegador
```

**Pronto! Funcionando!** ✅

---

## 🎯 O QUE ESTE BACKEND FAZ?

### **AGORA (versão simples):**
- ✅ Servidor funciona
- ✅ Você vê no navegador que está online
- ✅ Tem 3 rotas funcionando:
  - `/` - Página inicial bonita
  - `/health` - Verifica se está funcionando
  - `/calcular` - Calcula pontuação (exemplo)

### **DEPOIS (vamos adicionar):**
- 🔜 Cálculo real de pontuação
- 🔜 Cálculo de perdas financeiras
- 🔜 Autenticação (login)
- 🔜 Conexão com banco de dados
- 🔜 Deploy na internet

**Um passo de cada vez!** 🐾

---

## 🧪 TESTAR SE ESTÁ FUNCIONANDO

### **Teste 1: Página inicial**
```
1. Servidor rodando (npm start)
2. Abra navegador
3. Digite: localhost:3000
4. Deve aparecer página roxa escrito "GESTOR 360° API - FUNCIONANDO!"
```

### **Teste 2: Health check**
```
1. No navegador, digite: localhost:3000/health
2. Deve aparecer:
   {
     "status": "online",
     "mensagem": "Backend Gestor 360° funcionando perfeitamente!",
     "data": "..."
   }
```

**Se os 2 testes funcionaram = SUCESSO!** 🎉

---

## 🆘 PROBLEMAS?

### **"npm não é reconhecido"**
❌ Node.js não está instalado ou terminal precisa ser reiniciado
✅ Feche o terminal e abra de novo

### **"Porta 3000 já está em uso"**
❌ Outro programa está usando a porta 3000
✅ Feche outros programas ou mude a porta no arquivo servidor.js

### **Muitos erros vermelhos no "npm install"**
❌ Problema na instalação
✅ Tente: `npm cache clean --force` e depois `npm install` de novo

### **Não abre localhost:3000**
❌ Servidor não está rodando
✅ Verifique se a janela preta ainda está aberta com o servidor

---

## 📚 ENTENDENDO OS ARQUIVOS

### **package.json**
```
O que é: Lista de coisas que o projeto precisa
Como funciona: npm install lê este arquivo e baixa tudo
```

### **servidor.js**
```
O que é: O código que faz o servidor funcionar
Como funciona: 
  1. Cria um servidor web
  2. Define rotas (/, /health, /calcular)
  3. Fica esperando requisições
  4. Responde quando alguém acessa
```

### **node_modules/** (aparece depois do npm install)
```
O que é: Pasta com todas as dependências instaladas
Tamanho: ~50MB com várias pastas
Não mexer: Deixa ela quieta! O npm gerencia isso.
```

---

## 🎓 CONCEITOS IMPORTANTES

### **O que é um servidor?**
É um programa que fica "escutando" e respondendo requisições.
- Você pede: "Me dá a página inicial"
- Servidor responde: "Aqui está!"

### **O que é localhost?**
É o "endereço" do seu próprio computador.
- localhost = seu computador
- 3000 = porta (como um canal de TV)

### **O que é uma rota?**
É um "caminho" no servidor.
- / = rota raiz (página inicial)
- /health = rota de verificação
- /calcular = rota de cálculo

### **O que é JSON?**
É um formato de dados.
```json
{
  "nome": "Vinicius",
  "idade": 30
}
```
Fácil para computadores lerem e escreverem.

---

## 🎯 PRÓXIMOS PASSOS

### **✅ Você está aqui:**
- [x] Backend simples funcionando localmente

### **🔜 Próximos:**
1. [ ] Adicionar cálculo real de pontuação
2. [ ] Integrar com seu frontend (HTML)
3. [ ] Adicionar autenticação (login)
4. [ ] Colocar na internet (deploy)

**Um passo de cada vez!** 👶

---

## 💬 CONSEGUIU?

**Me mande:**
"Backend funcionando! Consegui abrir localhost:3000!"

**E eu te mostro o próximo passo!** 🚀

---

**Feito com ❤️ por Vinicius + Claude**  
**Versão: 1.0 - Simples**  
**Data: 22/01/2026**
