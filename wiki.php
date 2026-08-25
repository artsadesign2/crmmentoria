<?php
$currentPage = 'wiki';
$pageTitle = 'Wiki & Base de Conhecimento — Rocket Club';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<!-- ESTILOS EXCLUSIVOS DA WIKI & BASE DE CONHECIMENTO -->
<style>
.wiki-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
  width: 100%;
  background: var(--bg);
}

/* Header Superior de Métricas e Pílulas */
.wiki-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  gap: 16px;
  flex-wrap: wrap;
}

.wiki-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.wiki-pill {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.wiki-pill:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
}

.wiki-pill.active {
  background: rgba(223, 178, 108, 0.12);
  color: var(--gold);
  border-color: rgba(223, 178, 108, 0.35);
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(223, 178, 108, 0.08);
}

/* Layout Principal Split */
.wiki-main-split {
  display: flex;
  flex: 1;
  height: calc(100% - 65px);
  overflow: hidden;
  width: 100%;
}

/* Sidebar com Lista de Artigos */
.wiki-sidebar {
  width: 320px;
  min-width: 280px;
  border-right: 1px solid var(--border);
  background: rgba(15, 17, 26, 0.95);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}

.wiki-sidebar-search {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}

.wiki-search-box {
  position: relative;
  width: 100%;
}

.wiki-search-box input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  font-size: 13px;
  border-radius: 8px;
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.wiki-search-box input:focus {
  border-color: var(--gold);
}

.wiki-search-box i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 15px;
}

.wiki-articles-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wiki-article-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg2);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wiki-article-card:hover {
  border-color: rgba(223, 178, 108, 0.3);
  background: rgba(255, 255, 255, 0.03);
  transform: translateY(-1px);
}

.wiki-article-card.active {
  background: linear-gradient(135deg, rgba(223, 178, 108, 0.12) 0%, rgba(15, 17, 26, 0.95) 100%);
  border-color: var(--gold);
  box-shadow: 0 4px 16px rgba(223, 178, 108, 0.06);
}

.wiki-article-card-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.wiki-article-card.active .wiki-article-card-title {
  color: var(--gold);
}

.wiki-article-card-summary {
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wiki-article-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 2px;
}

/* Leitor da Wiki */
.wiki-reader {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
  position: relative;
}

.wiki-reader-header {
  padding: 24px 32px 18px 32px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wiki-reader-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.wiki-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}

.wiki-reader-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.25;
}

.wiki-author-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
  flex-wrap: wrap;
}

.wiki-author-info span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.wiki-reader-body-split {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Conteúdo Formatado */
.wiki-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  color: var(--text);
  line-height: 1.75;
  font-size: 15px;
}

.wiki-formatted-body h1, 
.wiki-formatted-body h2, 
.wiki-formatted-body h3, 
.wiki-formatted-body h4 {
  color: var(--text);
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 12px;
  scroll-margin-top: 20px;
}

.wiki-formatted-body h2 {
  font-size: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
  color: var(--gold);
}

.wiki-formatted-body h3 {
  font-size: 17px;
  color: #e2e8f0;
}

.wiki-formatted-body h4 {
  font-size: 15px;
  color: #cbd5e1;
}

.wiki-formatted-body p {
  margin-bottom: 16px;
  color: #cbd5e1;
}

.wiki-formatted-body ul, 
.wiki-formatted-body ol {
  margin-bottom: 18px;
  padding-left: 24px;
  color: #cbd5e1;
}

.wiki-formatted-body li {
  margin-bottom: 6px;
}

.wiki-formatted-body blockquote {
  border-left: 3px solid var(--gold);
  background: rgba(223, 178, 108, 0.05);
  padding: 12px 18px;
  border-radius: 0 8px 8px 0;
  margin: 16px 0;
  color: #e2e8f0;
  font-style: italic;
}

/* Embed de Vídeos Responsivo (16:9) */
.wiki-video-embed {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  border-radius: 12px;
  overflow: hidden;
  margin: 20px 0;
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  background: #000;
}

.wiki-video-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Caixas de Alerta (Callouts) */
.wiki-callout {
  padding: 14px 18px;
  border-radius: 10px;
  margin: 18px 0;
  display: flex;
  gap: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.wiki-callout-note {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #93c5fd;
}

.wiki-callout-tip {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
}

.wiki-callout-warning {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #fde047;
}

.wiki-callout i {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.wiki-formatted-body code {
  background: var(--bg3);
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 5px;
  font-family: monospace;
  font-size: 13px;
  color: var(--gold);
}

.wiki-formatted-body pre {
  background: #0b0d14;
  border: 1px solid var(--border);
  padding: 16px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 18px 0;
}

.wiki-formatted-body pre code {
  background: transparent;
  border: none;
  padding: 0;
  color: #e2e8f0;
}

.wiki-formatted-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 13.5px;
}

.wiki-formatted-body th, 
.wiki-formatted-body td {
  padding: 10px 14px;
  border: 1px solid var(--border);
  text-align: left;
}

.wiki-formatted-body th {
  background: var(--bg2);
  color: var(--gold);
  font-weight: 600;
}

/* Sumário Flutuante (TOC) */
.wiki-toc-sidebar {
  width: 240px;
  border-left: 1px solid var(--border);
  padding: 24px 18px;
  background: rgba(15, 17, 26, 0.6);
  overflow-y: auto;
}

.wiki-toc-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--gold);
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.wiki-toc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.wiki-toc-item a {
  font-size: 12.5px;
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
  border-left: 2px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wiki-toc-item a:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.03);
}

.wiki-toc-item.h3 a {
  padding-left: 18px;
  font-size: 12px;
}

.wiki-toc-item.active a {
  color: var(--gold);
  border-left-color: var(--gold);
  background: rgba(223, 178, 108, 0.08);
  font-weight: 500;
}
</style>

<section id="view-wiki" class="view-panel active" style="flex:1; display:flex; flex-direction:column; height:100%; overflow:hidden; width:100%;">
  
  <div class="wiki-container">
    
    <!-- BARRA SUPERIOR: MÉTRICAS & FILTROS POR DEPARTAMENTO -->
    <div class="wiki-top-bar">
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:10px; background:rgba(223,178,108,0.12); border:1px solid rgba(223,178,108,0.3); display:flex; align-items:center; justify-content:center; color:var(--gold);">
            <i class="ti ti-books" style="font-size:20px;"></i>
          </div>
          <div>
            <h2 style="font-size:16px; font-weight:700; color:var(--text); margin:0;">Base de Conhecimento</h2>
            <div style="font-size:11px; color:var(--muted);" id="wiki-stats-summary">Carregando métricas...</div>
          </div>
        </div>
      </div>

      <!-- Pílulas de Filtro Rápido por Departamento / Categoria -->
      <div class="wiki-pills" id="wiki-dept-pills">
        <button class="wiki-pill active" onclick="filterWikiByDept('all', this)">
          <i class="ti ti-apps"></i> Todos os Artigos
        </button>
      </div>

      <!-- Ações de Gerenciamento -->
      <div style="display:flex; align-items:center; gap:10px;">
        <button class="btn btn-sm" onclick="openDeptManagerModal()" style="border-radius:8px; font-size:12px; border-color:var(--border);" title="Gerenciar Departamentos">
          <i class="ti ti-folder-cog"></i> Departamentos
        </button>
        <button class="btn gold btn-sm" id="btn-wiki-new-article" onclick="openWikiModal()" style="border-radius:8px; font-weight:600; height:34px;">
          <i class="ti ti-plus"></i> Novo Artigo
        </button>
      </div>
    </div>

    <!-- MAIN SPLIT LAYOUT -->
    <div class="wiki-main-split">
      
      <!-- SIDEBAR ESQUERDA: BUSCA E LISTA DE ARTIGOS -->
      <div class="wiki-sidebar">
        <div class="wiki-sidebar-search">
          <div class="wiki-search-box">
            <i class="ti ti-search"></i>
            <input type="text" id="wiki-search-input" oninput="onWikiSearchInput()" placeholder="Pesquisar artigos, SOPs, manuais..." />
          </div>
        </div>

        <div class="wiki-articles-list" id="wiki-articles-list">
          <!-- Injetados dinamicamente via JS -->
        </div>
      </div>

      <!-- LEITOR DE ARTIGO -->
      <div class="wiki-reader" id="wiki-reader">
        
        <!-- ESTADO VAZIO / INICIAL (Sem Artigo Selecionado) -->
        <div id="wiki-empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:40px; text-align:center; color:var(--muted);">
          <div style="width:72px; height:72px; border-radius:50%; background:rgba(223,178,108,0.1); border:1px solid rgba(223,178,108,0.25); display:flex; align-items:center; justify-content:center; color:var(--gold); margin-bottom:20px;">
            <i class="ti ti-book" style="font-size:36px;"></i>
          </div>
          <h3 style="font-size:18px; font-weight:700; color:var(--text); margin-bottom:6px;">Wiki & SOPs Rocket Club</h3>
          <p style="font-size:13.5px; max-width:420px; line-height:1.6; margin-bottom:24px;">
            Selecione um artigo na lista lateral para iniciar a leitura ou utilize os filtros por departamento para encontrar manuais, processos e diretrizes.
          </p>
          <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
            <button class="btn btn-sm" onclick="filterWikiByDept('SOPs & Processos')" style="border-radius:20px;"><i class="ti ti-list-check"></i> SOPs & Processos</button>
            <button class="btn btn-sm" onclick="filterWikiByDept('Operacional')" style="border-radius:20px;"><i class="ti ti-settings"></i> Operacional</button>
            <button class="btn btn-sm" onclick="filterWikiByDept('Comercial')" style="border-radius:20px;"><i class="ti ti-chart-dots"></i> Comercial</button>
          </div>
        </div>

        <!-- ESTRUTURA DO ARTIGO ATIVO -->
        <div id="wiki-active-article-view" style="display:none; flex-direction:column; height:100%; width:100%; overflow:hidden;">
          
          <!-- CABEÇALHO DO ARTIGO -->
          <div class="wiki-reader-header">
            <div class="wiki-reader-meta-bar">
              <nav class="wiki-breadcrumb">
                <span id="wiki-article-dept-badge" class="badge badge-gold" style="font-size:11px;">—</span>
                <i class="ti ti-chevron-right" style="font-size:12px; opacity:0.4;"></i>
                <span id="wiki-article-category-badge" class="badge" style="background:var(--bg3); color:var(--muted); border:1px solid var(--border); font-size:11px;">SOP</span>
                <span id="wiki-article-vis-badge" class="badge badge-blue" style="font-size:10.5px;">Público</span>
              </nav>

              <!-- BARRA DE AÇÕES DO ARTIGO -->
              <div style="display:flex; align-items:center; gap:8px;" id="wiki-article-actions">
                <button class="btn btn-sm" onclick="copyWikiArticleLink()" title="Copiar Link Direto" style="height:32px; font-size:12px;">
                  <i class="ti ti-link"></i> Copiar Link
                </button>
                <button class="btn btn-sm" onclick="printWikiArticle()" title="Imprimir / Exportar" style="height:32px; font-size:12px;">
                  <i class="ti ti-printer"></i> Imprimir
                </button>
                <button class="btn btn-sm" id="btn-wiki-like" onclick="toggleWikiLike()" title="Marcar como Útil" style="height:32px; font-size:12px; color:var(--gold);">
                  <i class="ti ti-thumb-up"></i> <span id="wiki-like-count">Útil</span>
                </button>
                <button class="btn btn-sm" id="btn-wiki-edit" onclick="openWikiModal(currentWikiArticleId)" title="Editar Artigo" style="height:32px; font-size:12px;">
                  <i class="ti ti-pencil"></i> Editar
                </button>
                <button class="btn btn-sm" id="btn-wiki-delete" onclick="deleteWikiArticle(currentWikiArticleId)" title="Excluir Artigo" style="height:32px; font-size:12px; color:var(--red);">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>

            <!-- TÍTULO & INFORMACÕES DE AUTORIA -->
            <h1 id="wiki-article-title" class="wiki-reader-title">Título do Artigo</h1>
            
            <div id="wiki-article-summary-box" style="font-size:13.5px; color:var(--muted); line-height:1.5; background:var(--bg3); padding:10px 14px; border-radius:8px; border-left:3px solid var(--gold); margin-top:2px;">
              Resumo do artigo...
            </div>

            <div class="wiki-author-info">
              <span><i class="ti ti-user-circle" style="color:var(--gold);"></i> <strong id="wiki-article-author">—</strong></span>
              <span>•</span>
              <span><i class="ti ti-calendar" style="color:var(--muted);"></i> Atualizado em <span id="wiki-article-date">—</span></span>
              <span>•</span>
              <span><i class="ti ti-clock" style="color:var(--muted);"></i> <span id="wiki-article-reading-time">3 min de leitura</span></span>
              <span>•</span>
              <span><i class="ti ti-eye" style="color:var(--muted);"></i> <span id="wiki-article-views">0 visualizações</span></span>
            </div>
          </div>

          <!-- CORPO & SUMÁRIO (SPLIT) -->
          <div class="wiki-reader-body-split">
            
            <!-- CONTEÚDO FORMATADO -->
            <div class="wiki-content-wrapper">
              <div class="wiki-formatted-body" id="wiki-article-formatted-body">
                <!-- Conteúdo HTML/Markdown renderizado via JS -->
              </div>
            </div>

            <!-- SIDEBAR DIREITA: SUMÁRIO NAVEGÁVEL (TOC) -->
            <div class="wiki-toc-sidebar">
              <div class="wiki-toc-title">
                <i class="ti ti-list"></i> Neste Artigo
              </div>
              <ul class="wiki-toc-list" id="wiki-toc-list">
                <!-- Preenchido dinamicamente via JS -->
              </ul>
            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>

<!-- MODAL COMPLETO DE CRIAÇÃO E EDIÇÃO DE ARTIGOS WIKI (COM MÍDIAS & PREVIEW) -->
<div class="overlay" id="mo-wiki-article" style="z-index:9999;">
  <div class="modal" style="max-width:920px; width:100%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; border-radius:16px;">
    <div class="m-head" style="padding:16px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <i class="ti ti-edit" style="font-size:22px; color:var(--gold);"></i>
        <h3 id="wiki-modal-title" style="margin:0; font-size:16px;">Novo Artigo — Base de Conhecimento</h3>
      </div>
      <button class="close" onclick="closeModal('mo-wiki-article')">&times;</button>
    </div>

    <form id="wiki-article-form" onsubmit="saveWikiArticle(event)" style="padding:20px 24px; display:flex; flex-direction:column; gap:14px; overflow-y:auto; flex:1;">
      <input type="hidden" id="wiki-form-article-id" />

      <div class="field">
        <label style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--muted);">Título do Artigo *</label>
        <input type="text" id="wiki-form-title" required placeholder="Ex: SOP 01 — Processo de Onboarding de Novos Membros" style="width:100%; font-size:14.5px; font-weight:600; padding:10px 14px;" />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div class="field">
          <label style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--muted);">Categoria / Tipo</label>
          <select id="wiki-form-category" style="width:100%; height:38px;">
            <option value="SOPs & Processos">SOPs & Processos</option>
            <option value="Manuais & Guias">Manuais & Guias</option>
            <option value="Políticas & Regras">Políticas & Regras</option>
            <option value="Treinamentos">Treinamentos</option>
            <option value="FAQ / Dúvidas">FAQ / Dúvidas</option>
          </select>
        </div>

        <div class="field" style="display:flex; flex-direction:column; justify-content:center;">
          <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; margin-top:16px; font-size:13px;" title="Se desmarcado, selecione o departamento com acesso exclusivo">
            <input type="checkbox" id="wiki-form-public" checked onchange="toggleWikiPublicCheckbox()" style="accent-color:var(--gold); width:16px; height:16px;" />
            <span style="color:var(--text); font-weight:500;">Visível para Toda a Equipe</span>
          </label>
        </div>

        <!-- SELECT DE DEPARTAMENTO EXCLUSIVO (Aparece apenas quando 'Visível para Toda a Equipe' estiver DESMARCADO) -->
        <div class="field" id="wiki-dept-select-wrapper" style="display:none;">
          <label style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--gold);">Departamento com Acesso Exclusivo *</label>
          <select id="wiki-form-dept" style="width:100%; height:38px;">
            <!-- Opções alimentadas via JS -->
          </select>
        </div>
      </div>

      <div class="field">
        <label style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--muted);">Resumo Curto (Descrição nos cards)</label>
        <input type="text" id="wiki-form-summary" placeholder="Ex: Passo a passo completo para homologação e onboarding de novos membros no club..." style="width:100%; font-size:13px; padding:8px 12px;" />
      </div>

      <!-- EDITOR DE CONTEÚDO COM TOOLBAR DE MÍDIAS & ABAS EDITAR/PREVIEW -->
      <div class="field" style="display:flex; flex-direction:column; gap:8px;">
        
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <!-- ABAS DE NAVEGAÇÃO DO EDITOR -->
          <div style="display:flex; gap:4px; background:var(--bg2); padding:3px; border-radius:8px; border:1px solid var(--border);">
            <button type="button" class="btn btn-sm active" id="btn-wiki-tab-edit" onclick="switchWikiEditorTab('edit')" style="border-radius:6px; font-size:12px; height:28px;">
              <i class="ti ti-edit"></i> Editar
            </button>
            <button type="button" class="btn btn-sm" id="btn-wiki-tab-preview" onclick="switchWikiEditorTab('preview')" style="border-radius:6px; font-size:12px; height:28px; background:transparent; color:var(--muted);">
              <i class="ti ti-eye"></i> Pré-visualizar
            </button>
          </div>

          <!-- FERRAMENTAS DO EDITOR (TÍTULOS, MÍDIAS, ALERTAS, TABELAS) -->
          <div id="wiki-editor-toolbar" style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('## ')" title="Título H2"><i class="ti ti-h-2"></i></button>
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('### ')" title="Subtítulo H3"><i class="ti ti-h-3"></i></button>
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('**', '**')" title="Negrito"><i class="ti ti-bold"></i></button>
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('*', '*')" title="Itálico"><i class="ti ti-italic"></i></button>
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('- ')" title="Lista"><i class="ti ti-list"></i></button>
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('- [ ] ')" title="Checklist"><i class="ti ti-checkbox"></i></button>
            
            <span style="color:var(--border); margin:0 2px;">|</span>
            
            <!-- UPLOAD DE IMAGEM -->
            <label class="btn btn-sm" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; background:rgba(223,178,108,0.12); color:var(--gold); border-color:rgba(223,178,108,0.3); font-size:12px;" title="Inserir ou Fazer Upload de Imagem">
              <i class="ti ti-photo"></i> Imagem
              <input type="file" accept="image/*" style="display:none;" onchange="uploadWikiImageFile(this)" />
            </label>
            
            <!-- INSERIR VÍDEO -->
            <button type="button" class="btn btn-sm" onclick="promptInsertWikiVideo()" style="background:rgba(59,130,246,0.12); color:var(--blue); border-color:rgba(59,130,246,0.3); font-size:12px;" title="Inserir Vídeo (YouTube / Vimeo / MP4)">
              <i class="ti ti-video"></i> Vídeo
            </button>
            
            <!-- INSERIR LINK -->
            <button type="button" class="btn btn-sm" onclick="promptInsertWikiLink()" style="font-size:12px;" title="Inserir Link">
              <i class="ti ti-link"></i> Link
            </button>

            <span style="color:var(--border); margin:0 2px;">|</span>

            <!-- CAIXAS DE ALERTA -->
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('> [!NOTE]\n> ')" title="Alerta Nota"><i class="ti ti-info-circle" style="color:#93c5fd;"></i></button>
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('> [!TIP]\n> ')" title="Alerta Dica"><i class="ti ti-bulb" style="color:#6ee7b7;"></i></button>
            <button type="button" class="btn btn-sm" onclick="insertWikiMarkdown('> [!WARNING]\n> ')" title="Alerta Aviso"><i class="ti ti-alert-triangle" style="color:#fde047;"></i></button>
          </div>
        </div>

        <!-- PAINEL 1: TEXTAREA DO EDITOR -->
        <div id="wiki-editor-tab-edit">
          <textarea id="wiki-form-content" required rows="14" placeholder="Escreva o conteúdo do artigo aqui. Utilize a barra de ferramentas acima para adicionar Imagens, Vídeos, Links, Títulos, Checklists e Alertas..." style="width:100%; background:var(--bg3); color:var(--text); border:1px solid var(--border); border-radius:10px; padding:14px; font-size:13.5px; font-family:inherit; line-height:1.6; outline:none; resize:vertical;"></textarea>
        </div>

        <!-- PAINEL 2: PRÉ-VISUALIZAÇÃO AO VIVO -->
        <div id="wiki-editor-tab-preview" style="display:none; width:100%; min-height:280px; max-height:420px; overflow-y:auto; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:20px;" class="wiki-formatted-body">
          <!-- Renderizado via JS -->
        </div>

      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:12px; border-top:1px solid var(--border); margin-top:8px;">
        <button type="button" class="btn" onclick="closeModal('mo-wiki-article')">Cancelar</button>
        <button type="submit" class="btn gold" style="font-weight:600; height:38px; padding:0 20px;"><i class="ti ti-device-floppy"></i> Salvar Artigo</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: GERENCIAR DEPARTAMENTOS DA WIKI -->
<div class="overlay" id="mo-wiki-dept" style="z-index:9999;">
  <div class="modal" style="max-width:480px; width:100%; border-radius:14px;">
    <div class="m-head" style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
      <h3 style="margin:0; font-size:15px;">Gerenciar Departamentos & Categorias</h3>
      <button class="close" onclick="closeModal('mo-wiki-dept')">&times;</button>
    </div>
    <div style="padding:20px; display:flex; flex-direction:column; gap:16px;">
      
      <!-- Formulário de Novo Departamento -->
      <form id="wiki-dept-form" onsubmit="saveWikiDepartment(event)" style="display:flex; gap:8px;">
        <input type="text" id="wiki-new-dept-name" required placeholder="Nome do novo departamento..." style="flex:1; height:36px; border-radius:8px; font-size:13px;" />
        <button type="submit" class="btn gold btn-sm" style="height:36px; padding:0 14px; font-weight:600;"><i class="ti ti-plus"></i> Adicionar</button>
      </form>

      <!-- Lista de Departamentos Existentes -->
      <div style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto;" id="wiki-dept-manager-list">
        <!-- Preenchido via JS -->
      </div>

      <div style="display:flex; justify-content:flex-end; margin-top:10px;">
        <button type="button" class="btn" onclick="closeModal('mo-wiki-dept')">Fechar</button>
      </div>
    </div>
  </div>
</div>

<?php
require_once __DIR__ . '/includes/footer.php';
?>
