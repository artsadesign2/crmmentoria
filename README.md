# Rocket Club — PHP + Neon PostgreSQL

Sistema de gestão da tripulação. Deploy em 3 passos no hPanel da Hostinger.

## Estrutura

```
rocket-club-php/
├── index.html        ← Kanban (abre no navegador)
├── api/
│   ├── db.php        ← Conexão Neon (edite a senha aqui)
│   ├── helpers.php   ← Funções compartilhadas
│   ├── setup.php     ← Cria as tabelas (roda uma vez)
│   ├── members.php   ← CRUD de membros
│   ├── contacts.php  ← Registro de contatos
│   ├── goals.php     ← Metas por pilar
│   ├── milestones.php← Conquistas
│   └── dashboard.php ← Estatísticas e histórico
└── README.md
```

## Deploy na Hostinger (3 passos)

### Passo 1 — Atualizar a senha no db.php
Antes de fazer upload, abra `api/db.php` e troque a senha
pela nova que você gerou no painel do Neon.

### Passo 2 — Upload via hPanel
1. Acesse hPanel → Gerenciador de Arquivos
2. Navegue até `public_html/` (ou a pasta do seu domínio)
3. Crie uma pasta chamada `rocket-club`
4. Faça upload de todos os arquivos mantendo a estrutura:
   - `index.html` na raiz de `rocket-club/`
   - Pasta `api/` com todos os arquivos .php dentro

### Passo 3 — Criar as tabelas (uma única vez)
Acesse no navegador:
```
https://seudominio.com/rocket-club/api/setup.php
```
Você verá: `{"ok":true,"message":"Tabelas criadas com sucesso"}`

Pronto. Acesse `https://seudominio.com/rocket-club/` para usar o sistema.

## Requisitos
- PHP 8.0+ (Hostinger já inclui)
- Extensão PDO_PGSQL habilitada (Hostinger já inclui)
- Neon PostgreSQL (connection string no db.php)

## Segurança pós-deploy
1. Resetar senha do Neon após testes
2. Deletar ou proteger `api/setup.php` com senha após criar as tabelas
3. Considerar adicionar autenticação HTTP básica na pasta `api/`
