# 🚀 Quick Start - Backend QuickPainel

## ⚡ Início Rápido

Este guia te ajudará a configurar e executar o backend do QuickPainel em poucos minutos.

## 📋 Pré-requisitos

- ✅ Node.js 16+ instalado
- ✅ MySQL 8.0+ configurado
- ✅ Git instalado

## 🚀 Passos Rápidos

### 1. Clone e Configure

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd lancheria-pedidos-ninja/api

# Instale as dependências
npm install
```

### 2. Configure o Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite com suas configurações
nano .env
```

**Configuração mínima do `.env`:**
```env
DB_HOST=srv1074.hstgr.io
DB_USER=u328800108_food
DB_PASSWORD=Vit@r1324
DB_NAME=u328800108_food_fly
JWT_SECRET=quickdeliver_secret_key_2024
PORT=3001
```

### 3. Configure o Banco

```bash
# Teste a conexão
npm run test:db

# Se der erro, configure o banco:
mysql -u seu_usuario -p quickpainel < ../Dump20250619.sql
```

### 4. Inicie o Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

### 5. Teste a API

```bash
# Verifique se está funcionando
curl http://localhost:3001/api

# Resposta esperada:
# {"message":"QuickPainel API está funcionando!","version":"1.0.0"}
```

## 🎯 Próximos Passos

1. **Configure o Frontend**
   ```bash
   cd ..
   npm install
   npm run dev
   ```

2. **Acesse o Sistema**
   - Frontend: http://localhost:8080
   - Backend: http://localhost:3001

3. **Faça Login**
   - Email: manoelvitor253@gmail.com
   - Senha: 12345678

## 🔧 Comandos Úteis

```bash
# Verificar status do sistema
node check-system-status.js

# Debug de variáveis
node debug-env.js

# Testar conexão
npm run test:db

# Ver logs
npm run dev
```

## 🆘 Troubleshooting

### Erro de Conexão com Banco
```bash
# Verifique as variáveis
cat .env

# Teste a conexão
npm run test:db
```

### Erro de Porta
```bash
# Verifique se a porta está livre
netstat -an | grep 3001

# Mude a porta no .env
PORT=3002
```

### Erro de Dependências
```bash
# Limpe o cache
npm cache clean --force

# Reinstale
rm -rf node_modules package-lock.json
npm install
```

## 📞 Suporte

Se precisar de ajuda:
- 📧 Email: suporte@quickpainel.com
- 🐛 Issues: [GitHub](https://github.com/quickpainel/issues)
- 📖 Docs: [Documentação Completa](README.md)

---

**🚀 Pronto! Seu backend QuickPainel está funcionando!** 