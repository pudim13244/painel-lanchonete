# QuickPainel API

API backend para o sistema de cardápio digital QuickPainel, desenvolvida em Node.js com Express e MySQL.

## 🚀 Funcionalidades

- ✅ Autenticação JWT
- ✅ CRUD de usuários (clientes, estabelecimentos, entregadores)
- ✅ CRUD de produtos e categorias
- ✅ Sistema de pedidos completo
- ✅ Dashboard com estatísticas
- ✅ Controle de entregadores
- ✅ WebSocket para atualizações em tempo real
- ✅ Upload de imagens
- ✅ Validação de dados
- ✅ Middleware de segurança

## 📋 Pré-requisitos

- Node.js 16+ 
- MySQL 8.0+
- npm ou yarn

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd lancheria-pedidos-ninja/api
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações do Banco de Dados
DB_HOST=srv1074.hstgr.io
DB_USER=u328800108_food
DB_PASSWORD=Vit@r1324
DB_NAME=u328800108_food_fly

# Configurações JWT
JWT_SECRET=quickdeliver_secret_key_2024

# Configurações do Servidor
PORT=3001
NODE_ENV=development

# Configurações de Segurança
CORS_ORIGIN=http://localhost:8080
```

### 4. Configure o banco de dados

```bash
# Acesse o MySQL
mysql -u seu_usuario -p

# Crie o banco (se não existir)
CREATE DATABASE IF NOT EXISTS quickpainel;

# Importe o dump
mysql -u seu_usuario -p quickpainel < ../Dump20250619.sql
```

### 5. Inicie o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📁 Estrutura do Projeto

```
api/
├── config/
│   └── database.js          # Configuração do banco
├── routes/
│   ├── auth.js              # Autenticação
│   ├── users.js             # Usuários
│   ├── products.js          # Produtos
│   ├── orders.js            # Pedidos
│   ├── categories.js        # Categorias
│   ├── establishment.js     # Estabelecimento
│   ├── establishments.js    # Estabelecimentos
│   ├── acrescimos.js        # Acréscimos
│   ├── option-groups.js     # Grupos de opções
│   └── options.js           # Opções
├── middleware/
│   ├── auth.js              # Autenticação
│   └── validation.js        # Validação
├── utils/
│   └── database.js          # Utilitários DB
├── app.js                   # App Express
├── server.js                # Servidor
├── start.js                 # Inicialização
└── package.json
```

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_HOST` | Host do banco | `localhost` |
| `DB_USER` | Usuário do banco | `root` |
| `DB_PASSWORD` | Senha do banco | - |
| `DB_NAME` | Nome do banco | `quickpainel` |
| `JWT_SECRET` | Chave secreta JWT | - |
| `PORT` | Porta do servidor | `3001` |
| `NODE_ENV` | Ambiente | `development` |
| `CORS_ORIGIN` | Origem CORS | `http://localhost:8080` |

### Banco de Dados

O sistema utiliza as seguintes tabelas principais:

- `users` - Usuários (clientes, estabelecimentos, entregadores)
- `products` - Produtos do cardápio
- `categories` - Categorias de produtos
- `orders` - Pedidos
- `order_items` - Itens dos pedidos
- `establishments` - Informações dos estabelecimentos
- `acrescimos` - Acréscimos/adicionais
- `option_groups` - Grupos de opções
- `options` - Opções disponíveis

## 📡 Rotas da API

### Autenticação
```
POST /api/auth/login          # Login
POST /api/auth/register       # Registro
GET  /api/auth/me            # Dados do usuário
```

### Usuários
```
GET    /api/users            # Listar usuários
GET    /api/users/:id        # Obter usuário
PUT    /api/users/:id        # Atualizar usuário
DELETE /api/users/:id        # Deletar usuário
```

### Produtos
```
GET    /api/products         # Listar produtos
POST   /api/products         # Criar produto
PUT    /api/products/:id     # Atualizar produto
DELETE /api/products/:id     # Deletar produto
```

### Pedidos
```
GET    /api/orders           # Listar pedidos
POST   /api/orders           # Criar pedido
PUT    /api/orders/:id       # Atualizar pedido
GET    /api/orders/:id       # Obter pedido
```

### Estabelecimento
```
GET /api/establishment/dashboard    # Dashboard
GET /api/establishment/profile      # Perfil
PUT /api/establishment/profile      # Atualizar perfil
```

## 🔒 Segurança

### Autenticação JWT
- Tokens com expiração
- Refresh tokens
- Middleware de autenticação

### Validação
- Express-validator
- Sanitização de dados
- Prevenção de SQL injection

### Headers de Segurança
- Helmet.js
- CORS configurado
- Rate limiting

## 🧪 Testes

```bash
# Testar conexão com banco
npm run test:db

# Verificar status do sistema
node check-system-status.js

# Debug de variáveis
node debug-env.js
```

## 📊 Monitoramento

### Logs
```bash
# Desenvolvimento
npm run dev

# Produção
npm start 2>&1 | tee app.log
```

### Status do Sistema
```bash
node check-system-status.js
```

## 🚀 Deploy

### Produção
```bash
# Instalar dependências
npm install --production

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env

# Iniciar servidor
npm start
```

### Docker (opcional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para suporte, entre em contato:
- Email: suporte@quickpainel.com
- Issues: [GitHub Issues](https://github.com/quickpainel/issues)

## 📈 Roadmap

- [ ] Cache Redis
- [ ] Logs estruturados
- [ ] Métricas Prometheus
- [ ] API GraphQL
- [ ] Microserviços
- [ ] Kubernetes 