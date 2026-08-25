<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();
$id = $_GET['id'] ?? null;

// Função auxiliar para popular mock data no banco se a tabela estiver vazia
function seed_mock_wiki_articles() {
    try {
        $countRow = neon_first("SELECT COUNT(*) as total FROM wiki_articles");
        if ($countRow && intval($countRow['total']) > 0) {
            return;
        }

        // Buscar departamentos
        $depts = neon("SELECT id, name FROM departments");
        $deptMap = [];
        foreach ($depts as $d) {
            $deptMap[$d['name']] = $d['id'];
        }

        $mocks = [
            [
                'title' => 'SOP 01 — Processo de Onboarding de Novos Clientes',
                'summary' => 'Procedimento operacional padrão para recepcionar, cadastrar e alinhar a jornada dos novos participantes do Rocket Club.',
                'category' => 'SOPs & Processos',
                'dept' => 'Operacional',
                'is_public' => 'true',
                'content' => "## 📌 Objetivo do Processo\nEste **Procedimento Operacional Padrão (SOP)** estabelece o fluxo exato de integração de novos empresários e alunos no ecossistema **Rocket Club**.\n\n> [!NOTE]\n> Todos os novos membros devem passar por esta etapa em até **48 horas úteis** após a confirmação da matrícula.\n\n---\n\n## 🚀 Etapas do Onboarding\n\n### 1. Boas-Vindas & Acesso à Plataforma\n- [x] Enviar mensagem oficial de boas-vindas pelo WhatsApp.\n- [x] Liberar credenciais de acesso ao painel do aluno (**Rocket Academy**).\n- [x] Convidar para o grupo restrito de membros no WhatsApp/Telegram.\n\n### 2. Mapeamento Inicial & Anamnese\n- [ ] Enviar link do formulário de diagnóstico empresarial (**Ficha Executive**).\n- [ ] Validar faturamento atual, nicho de atuação e principal gargalo do negócio.\n- [ ] Agendar reunião de alinhamento inicial com o mentor responsável.\n\n> [!TIP]\n> Durante a anamnese, certifique-se de perguntar sobre datas comemorativas e hobbies do cliente para personalizar os cards do Members Book.\n\n---\n\n## 📊 Matriz de Responsabilidades\n\n| Etapa | Responsável | Prazo Máximo | Canal |\n| :--- | :--- | :--- | :--- |\n| Envio de Boas-Vindas | Sucesso do Cliente | 2 horas | WhatsApp |\n| Liberação da Plataforma | Suporte Técnico | 4 horas | E-mail |\n| Reunião de Alinhamento | Mentoria | 48 horas | Zoom / Presencial |\n\n```json\n{\n  \"status\": \"onboarding_active\",\n  \"sla_hours\": 48,\n  \"automation\": \"enabled\"\n}\n```\n\n---\n\n### ⚠️ Ações de Riscos (SLA Vencido)\nSe o aluno não responder no prazo de 24 horas, acionar o gestor comercial para contato telefônico direto."
            ],
            [
                'title' => 'Manual do Comercial — Script de Vendas & Objeções 10X',
                'summary' => 'Guia prático para fechamento de mentorias, estratégias de contorno de objeções de preço e escassez.',
                'category' => 'Manuais & Guias',
                'dept' => 'Comercial',
                'is_public' => 'true',
                'content' => "## 🎯 Diretrizes Comerciais Rocket Club\nEste manual reúne o posicionamento comercial oficial para conversão de mentores, empresários e alunos de alta performance.\n\n---\n\n## 🗣️ Estrutura da Ligação de Vendas (Pitch de 4 Passos)\n\n### 1. Conexão & Diagnóstico (10 min)\n- Entenda a fundo a dor atual do prospect.\n- Faça perguntas abertas: *\"Qual o seu faturamento médio mensal hoje e onde você quer chegar nos próximos 12 meses?\"*\n\n### 2. Apresentação da Solução (15 min)\n- Demonstre o valor do ecossistema e networking do **Rocket Club**.\n- Mostre casos reais de sucesso de membros do mesmo setor.\n\n### 3. Apresentação da Oferta & Escassez (5 min)\n> [!WARNING]\n> Nunca ofereça desconto direto. Trabalhe sempre com bônus de aceleração ou extensão de acompanhamento.\n\n### 4. Fechamento & Matrícula (10 min)\n- Apresente as formas de pagamento disponíveis.\n\n---\n\n## 💡 Como Contornar Objeções Frequentes\n\n> [!TIP]\n> **Objeção:** *\"Preciso falar com meu sócio/esposa antes.\"*\n> **Resposta recomendada:** *\"Perfeito! Entendo perfeitamente. O que acha de agendarmos 10 minutos amanhã cedo para tirarmos as dúvidas de vocês dois juntos?\"*"
            ],
            [
                'title' => 'Diretrizes Financeiras — Reembolsos, NF & Cobranças',
                'summary' => 'Instruções para prestação de contas da equipe, solicitação de reembolsos e emissão de notas fiscais de mentorias.',
                'category' => 'Políticas & Regras',
                'dept' => 'Financeiro',
                'is_public' => 'true',
                'content' => "## 💳 Política Financeira Interna\nInstruções obrigatórias para toda a equipe sobre controle de caixa, emissão de notas e solicitações de ressarcimento.\n\n---\n\n## 📝 Regras de Reembolso\n1. Todas as notas fiscais de despesas devem ser enviadas até o dia 25 de cada mês.\n2. Despesas acima de R$ 500,00 exigem pré-aprovação da diretoria.\n3. Não são aceitos recibos simples sem CNPJ do fornecedor.\n\n> [!NOTE]\n> O prazo médio de pagamento dos reembolsos aprovados é de **3 dias úteis**."
            ],
            [
                'title' => 'Guia de TI & Segurança — Gestão de Senhas e Ferramentas',
                'summary' => 'Protocolo de segurança para armazenamento de credenciais, acessos a servidores e ferramentas da empresa.',
                'category' => 'Manuais & Guias',
                'dept' => 'Tecnologia & Growth',
                'is_public' => 'true',
                'content' => "## 🔐 Diretrizes de Segurança da Informação\nInstruções de TI para manter o ambiente digital do **Rocket Club** blindado contra vazamentos e acessos indevidos.\n\n---\n\n## 🛡️ Boas Práticas Obrigatórias\n- [x] Utilizar autenticação em duas etapas (2FA) em todos os e-mails e serviços da empresa.\n- [x] Não reutilizar senhas pessoais em ferramentas do trabalho.\n- [ ] Trocar a senha do banco de dados a cada 90 dias.\n\n> [!WARNING]\n> É estritamente proibido compartilhar credenciais por mensagens sem criptografia ou em blocos de anotações abertos."
            ],
            [
                'title' => 'Manual Jurídico — Contratos de Mentoria e NDAs',
                'summary' => 'Modelos e orientações jurídicas sobre elaboração de termos de confidencialidade, direitos de imagem e contratos de prestação de serviço.',
                'category' => 'Políticas & Regras',
                'dept' => 'Jurídico',
                'is_public' => 'true',
                'content' => "## ⚖️ Conformidade & Proteção Jurídica\nOrientações para elaboração e gestão contratual no ecossistema Rocket Club.\n\n---\n\n### 1. Termo de Confidencialidade (NDA)\nTodos os membros que participam de grupos de Mastermind devem assinar o termo de sigilo sobre as estratégias discutidas.\n\n### 2. Uso de Imagem e Voz\n> [!NOTE]\n> A gravação de mentorias presenciais exige a assinatura prévia do termo de cessão de imagem."
            ],
            [
                'title' => 'SOP 02 — Organização de Eventos & Imersões Presenciais',
                'summary' => 'Checklist operacional completo para infraestrutura, credenciamento, coffee break e produção de eventos presenciais do club.',
                'category' => 'SOPs & Processos',
                'dept' => 'Operacional',
                'is_public' => 'true',
                'content' => "## 🎪 Produção de Imersões Presenciais\nEste procedimento orienta a equipe de operações na montagem e execução de imersões presenciais de alta experiência.\n\n---\n\n## 📋 Cronograma de Preparação (D-30 ao D-0)\n\n### D-30: Reserva de Espaço & Hotelaria\n- Confirmar capacidade do auditório para até 150 pessoas.\n- Validar equipamentos de áudio, microfones sem fio e projetores 4K.\n\n### D-7: Kit do Aluno & Credenciamento\n- Confirmar impressão de crachás personalizados.\n- Montar as pastas exclusivas da mentoria com bloco de anotações e caneta premium.\n\n> [!TIP]\n> Certifique-se de realizar a passagem de som com os palestrantes 1 hora antes do início do evento."
            ]
        ];

        foreach ($mocks as $m) {
            $uuid = gen_uuid();
            $dept_id = $deptMap[$m['dept']] ?? null;
            neon(
                "INSERT INTO wiki_articles (id, title, summary, content, category, department_id, is_public, views_count, created_by) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [$uuid, $m['title'], $m['summary'], $m['content'], $m['category'], $dept_id, $m['is_public'], rand(25, 200), $currentUser['id']]
            );
        }
    } catch (Exception $e) {
        // Ignorar erros de seed se a tabela não existir ou já tiver dados
    }
}

// GET /api/wiki.php — Lista os artigos ou traz um específico
if (method() === 'GET') {
    try {
        $canReadAll = has_permission('wiki_read');
        $canReadPublic = has_permission('wiki_read_public');

        if (!$canReadAll && !$canReadPublic) {
            error('Acesso negado: privilégios insuficientes', 403);
        }

        // Tentar alimentar o banco com dados de teste se a tabela estiver vazia
        seed_mock_wiki_articles();

        if ($id) {
            // Incrementar contador de visualizações
            try {
                neon("UPDATE wiki_articles SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1", [$id]);
            } catch (Exception $e) {
                // Ignore se coluna não existir ainda
            }

            // Busca artigo único
            $row = neon_first(
                "SELECT a.*, d.name as department_name, u.name as creator_name 
                 FROM wiki_articles a 
                 LEFT JOIN departments d ON a.department_id = d.id 
                 LEFT JOIN users u ON a.created_by = u.id 
                 WHERE a.id = $1", 
                [$id]
            );
            if (!$row) {
                error('Artigo não encontrado', 404);
            }
            if (!$canReadAll && !$row['is_public']) {
                error('Acesso negado: este artigo é privado', 403);
            }
            respond($row);
        } else {
            // Lista todos os artigos visíveis com suporte a busca e departamento
            $deptFilter = $_GET['department_id'] ?? null;
            $search = trim($_GET['search'] ?? '');
            
            $sql = "SELECT a.id, a.title, a.summary, a.category, a.department_id, a.is_public, 
                           COALESCE(a.views_count, 0) as views_count, a.created_at, a.updated_at, 
                           d.name as department_name, u.name as creator_name 
                    FROM wiki_articles a 
                    LEFT JOIN departments d ON a.department_id = d.id
                    LEFT JOIN users u ON a.created_by = u.id
                    WHERE 1=1";
            $params = [];
            $paramIdx = 1;
            
            if (!$canReadAll) {
                $sql .= " AND a.is_public = TRUE";
            }
            
            if ($deptFilter && $deptFilter !== 'all') {
                $sql .= " AND (a.department_id = $" . $paramIdx . " OR d.name = $" . $paramIdx . ")";
                $params[] = $deptFilter;
                $paramIdx++;
            }

            if (!empty($search)) {
                $sql .= " AND (a.title ILIKE $" . $paramIdx . " OR a.summary ILIKE $" . $paramIdx . " OR a.content ILIKE $" . $paramIdx . ")";
                $params[] = '%' . $search . '%';
                $paramIdx++;
            }
            
            $sql .= " ORDER BY d.name ASC, a.updated_at DESC, a.title ASC";
            $rows = neon($sql, $params);
            
            // Buscar departamentos para filtro fácil
            $departments = neon("SELECT id, name, is_fixed FROM departments ORDER BY name ASC");

            respond([
                'articles' => $rows,
                'departments' => $departments
            ]);
        }
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// POST /api/wiki.php — Cria novo artigo
if (method() === 'POST') {
    if (!has_permission('wiki_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    $b = body();
    $title = trim($b['title'] ?? '');
    $summary = trim($b['summary'] ?? '');
    $content = trim($b['content'] ?? '');
    $category = trim($b['category'] ?? 'SOPs & Processos');
    $department_id = $b['department_id'] ?? null;
    $is_public = (isset($b['is_public']) && $b['is_public']) ? 'true' : 'false';

    if (empty($title) || empty($content)) {
        error('Título e conteúdo são obrigatórios');
    }

    try {
        if ($department_id) {
            $dept = neon_first("SELECT 1 FROM departments WHERE id = $1", [$department_id]);
            if (!$dept) {
                error('Departamento inválido');
            }
        }

        $uuid = gen_uuid();
        neon(
            "INSERT INTO wiki_articles (id, title, summary, content, category, department_id, is_public, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [$uuid, $title, $summary, $content, $category, $department_id, $is_public, $currentUser['id']]
        );

        $created = neon_first("SELECT a.*, d.name as department_name FROM wiki_articles a LEFT JOIN departments d ON a.department_id = d.id WHERE a.id = $1", [$uuid]);
        respond($created, 201);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// PATCH /api/wiki.php?id= — Edita um artigo
if (method() === 'PATCH' && $id) {
    if (!has_permission('wiki_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    $b = body();
    
    $article = neon_first("SELECT id FROM wiki_articles WHERE id = $1", [$id]);
    if (!$article) {
        error('Artigo não encontrado', 404);
    }

    $sets = [];
    $vals = [];
    $idx = 1;

    if (isset($b['title'])) {
        $sets[] = "title = \$$idx"; $vals[] = trim($b['title']); $idx++;
    }
    if (isset($b['summary'])) {
        $sets[] = "summary = \$$idx"; $vals[] = trim($b['summary']); $idx++;
    }
    if (isset($b['content'])) {
        $sets[] = "content = \$$idx"; $vals[] = trim($b['content']); $idx++;
    }
    if (isset($b['category'])) {
        $sets[] = "category = \$$idx"; $vals[] = trim($b['category']); $idx++;
    }
    if (array_key_exists('department_id', $b)) {
        $dept_id = $b['department_id'];
        if ($dept_id) {
            $dept = neon_first("SELECT 1 FROM departments WHERE id = $1", [$dept_id]);
            if (!$dept) error('Departamento inválido');
        }
        $sets[] = "department_id = \$$idx"; $vals[] = $dept_id; $idx++;
    }
    if (isset($b['is_public'])) {
        $sets[] = "is_public = \$$idx"; $vals[] = $b['is_public'] ? 'true' : 'false'; $idx++;
    }

    if (empty($sets)) {
        error('Nada para atualizar');
    }

    $sets[] = "updated_at = NOW()";
    $vals[] = $id;
    try {
        neon("UPDATE wiki_articles SET " . implode(', ', $sets) . " WHERE id = \$$idx", $vals);
        $updated = neon_first("SELECT a.*, d.name as department_name FROM wiki_articles a LEFT JOIN departments d ON a.department_id = d.id WHERE a.id = $1", [$id]);
        respond($updated);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// DELETE /api/wiki.php?id= — Remove um artigo
if (method() === 'DELETE' && $id) {
    if (!has_permission('wiki_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    try {
        $article = neon_first("SELECT id FROM wiki_articles WHERE id = $1", [$id]);
        if (!$article) {
            error('Artigo não encontrado', 404);
        }

        neon("DELETE FROM wiki_articles WHERE id = $1", [$id]);
        respond(null, 204);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

error('Rota não encontrada', 404);
