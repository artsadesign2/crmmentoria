<?php
$currentPage = 'academy';
$pageTitle = 'Rocket Academy — Sala de Aula & Cursos';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<!-- VIEW DEDICADA: ROCKET ACADEMY -->
<section id="view-academy" class="view-panel active" style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%; height:100%;">
  
  <!-- VISÃO 1: CATÁLOGO DE CURSOS (HOME ACADEMY) -->
  <div id="academy-courses-view" style="display:flex; flex-direction:column; gap:20px; padding:24px 28px; overflow-y:auto; flex:1; width:100%;">
    
    <!-- BARRA SUPERIOR: BUSCA, FILTROS E AÇÃO ADMIN -->
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; width:100%; background:var(--bg2); padding:16px 20px; border-radius:14px; border:1px solid var(--border);">
      
      <!-- Pílulas de Categoria -->
      <div id="academy-category-pills" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-sm active-pill" onclick="filterAcademyCategory('all', this)" style="border-radius:20px; padding:6px 14px; font-size:12px;">Todos os Cursos</button>
        <button class="btn btn-sm" onclick="filterAcademyCategory('Mentorias', this)" style="border-radius:20px; padding:6px 14px; font-size:12px; background:var(--bg2); color:var(--muted);">Mentorias Gravadas</button>
        <button class="btn btn-sm" onclick="filterAcademyCategory('Vendas', this)" style="border-radius:20px; padding:6px 14px; font-size:12px; background:var(--bg2); color:var(--muted);">Vendas & Escala</button>
        <button class="btn btn-sm" onclick="filterAcademyCategory('Posicionamento', this)" style="border-radius:20px; padding:6px 14px; font-size:12px; background:var(--bg2); color:var(--muted);">Posicionamento</button>
        <button class="btn btn-sm" onclick="filterAcademyCategory('Gestão', this)" style="border-radius:20px; padding:6px 14px; font-size:12px; background:var(--bg2); color:var(--muted);">Gestão & Processos</button>
        <button class="btn btn-sm" onclick="filterAcademyCategory('Imersões', this)" style="border-radius:20px; padding:6px 14px; font-size:12px; background:var(--bg2); color:var(--muted);">Imersões Presenciais</button>
      </div>

      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <!-- Busca Dinâmica -->
        <div style="position:relative; width:240px;">
          <i class="ti ti-search" style="position:absolute; left:10px; top:9px; color:var(--muted); font-size:15px;"></i>
          <input type="text" id="academy-search-input" oninput="renderAcademyCoursesGrid()" placeholder="Buscar curso ou aula..." style="width:100%; padding-left:32px; height:34px; font-size:12.5px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--text);" />
        </div>

        <!-- Botão Admin Novo Curso -->
        <button class="btn gold btn-sm" id="btn-academy-new-course" onclick="openCourseModal()" style="display:none; height:34px; border-radius:8px; font-weight:600;">
          <i class="ti ti-plus"></i> Novo Curso
        </button>
      </div>
    </div>

    <!-- GRID DE CARDS DOS CURSOS -->
    <div id="academy-courses-grid" class="academy-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px; width:100%;">
      <!-- Preenchido via JS -->
    </div>
  </div>

  <!-- VISÃO 2: PLAYER DO CURSO E SALA DE AULA (LAYOUT SPLIT) -->
  <div id="academy-player-view" style="display:none; flex:1; height:100%; overflow:hidden; width:100%;">
    
    <!-- LADO ESQUERDO: PLAYER & CONTEÚDO -->
    <div style="flex:1; display:flex; flex-direction:column; overflow-y:auto; padding:20px 24px; gap:20px; border-right:1px solid var(--border);">
      
      <!-- Header de Navegação do Player (Breadcrumb) -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; border-bottom:1px solid var(--border); padding-bottom:14px;">
        <nav class="academy-breadcrumb" style="display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:500; color:var(--muted); flex-wrap:wrap;">
          <button onclick="backToAcademyCourses()" style="background:rgba(223,178,108,0.1); border:1px solid rgba(223,178,108,0.3); color:var(--gold); padding:4px 10px; border-radius:6px; font-weight:600; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(223,178,108,0.2)'" onmouseout="this.style.background='rgba(223,178,108,0.1)'">
            <i class="ti ti-arrow-left" style="font-size:14px;"></i> Cursos
          </button>
          <i class="ti ti-chevron-right" style="font-size:13px; opacity:0.4; color:var(--muted);"></i>
          <span id="academy-breadcrumb-course" style="color:var(--text); font-weight:700; font-size:14px;">Título do Curso</span>
          <span id="academy-breadcrumb-sep-lesson" style="display:none; align-items:center; gap:8px;">
            <i class="ti ti-chevron-right" style="font-size:13px; opacity:0.4; color:var(--muted);"></i>
            <span id="academy-breadcrumb-lesson" style="color:var(--gold); font-weight:600; font-size:13.5px;">Aula Atual</span>
          </span>
        </nav>

        <!-- Ações Admin (Editar Curso / Adicionar Módulo / Adicionar Aula) -->
        <div id="academy-admin-course-actions" style="display:none; gap:8px; align-items:center;">
          <button class="btn btn-sm" onclick="openCourseModal(currentAcademyCourse ? currentAcademyCourse.id : null)" title="Editar Curso">
            <i class="ti ti-pencil"></i> Editar Curso
          </button>
          <button class="btn btn-sm gold" onclick="openModuleModal()" title="Adicionar Módulo">
            <i class="ti ti-folder-plus"></i> + Módulo
          </button>
          <button class="btn btn-sm gold" onclick="openLessonModal()" title="Adicionar Aula">
            <i class="ti ti-video-plus"></i> + Aula
          </button>
        </div>
      </div>

      <!-- INFORMAÇÕES DA AULA & BOTÃO CONCLUIR -->
      <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px; background:var(--bg2); padding:16px 20px; border-radius:12px; border:1px solid var(--border);">
        <div>
          <div style="display:flex; align-items:center; gap:10px;">
            <h2 id="academy-lesson-title" style="font-size:18px; font-weight:700; color:var(--text); margin:0;">Nome da Aula</h2>
            <span id="academy-lesson-duration" class="badge" style="background:rgba(223,178,108,0.1); color:var(--gold); border-color:rgba(223,178,108,0.3); font-size:11px;">0 min</span>
          </div>
        </div>

        <button id="btn-toggle-lesson-complete" class="btn" onclick="toggleAcademyLessonComplete()" style="border-radius:8px; font-weight:600; display:inline-flex; align-items:center; gap:8px;">
          <i class="ti ti-circle-check"></i>
          <span>Marcar como Concluída</span>
        </button>
      </div>

      <!-- CONTAINER RESPONSIVO DO PLAYER DE VÍDEO (16:9) COM PLYR -->
      <div class="academy-video-wrapper" id="academy-video-wrapper" style="position:relative; width:100%; min-height:380px; background:#000; border-radius:14px; overflow:hidden; border:1px solid var(--border); box-shadow:0 8px 24px rgba(0,0,0,0.5);">
        <div id="academy-plyr-target" style="width:100%; height:100%;"></div>
      </div>

      <!-- ABAS DE NAVEGAÇÃO DO CONTEÚDO (DESCRIÇÃO / ANOTAÇÕES / ANEXOS / COMENTÁRIOS) -->
      <div style="display:flex; flex-direction:column; gap:14px; background:var(--bg2); border-radius:12px; border:1px solid var(--border); padding:16px 20px;">
        <div style="display:flex; gap:16px; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <button class="academy-tab-btn active" id="tab-btn-desc" onclick="switchAcademyPlayerTab('desc')" style="background:none; border:none; color:var(--gold); font-weight:600; font-size:13px; cursor:pointer; padding-bottom:4px; border-bottom:2px solid var(--gold);">
            <i class="ti ti-file-text"></i> Visão Geral & Descrição
          </button>
          <button class="academy-tab-btn" id="tab-btn-notes" onclick="switchAcademyPlayerTab('notes')" style="background:none; border:none; color:var(--muted); font-weight:600; font-size:13px; cursor:pointer; padding-bottom:4px;">
            <i class="ti ti-notes"></i> Minhas Anotações Salvas
          </button>
          <button class="academy-tab-btn" id="tab-btn-attachments" onclick="switchAcademyPlayerTab('attachments')" style="background:none; border:none; color:var(--muted); font-weight:600; font-size:13px; cursor:pointer; padding-bottom:4px;">
            <i class="ti ti-paperclip"></i> Materiais & Anexos
          </button>
          <button class="academy-tab-btn" id="tab-btn-comments" onclick="switchAcademyPlayerTab('comments')" style="background:none; border:none; color:var(--muted); font-weight:600; font-size:13px; cursor:pointer; padding-bottom:4px;">
            <i class="ti ti-messages"></i> Dúvidas & Comentários (<span id="academy-comments-count">0</span>)
          </button>
        </div>

        <div id="academy-tab-content-desc" style="font-size:13px; color:var(--text); line-height:1.6;">
          <p id="academy-lesson-description" style="margin:0; opacity:0.9;">Descrição da aula...</p>
        </div>

        <div id="academy-tab-content-notes" style="display:none; flex-direction:column; gap:12px;">
          <p style="font-size:12px; color:var(--muted); margin:0;">Escreva suas anotações pessoais desta aula. Elas são salvas automaticamente na sua conta.</p>
          <textarea id="academy-student-notes" style="width:100%; min-height:120px; padding:12px; font-size:13px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--text); font-family:inherit;" placeholder="Digite aqui suas anotações e insights da aula..."></textarea>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn gold btn-sm" onclick="saveAcademyStudentNotes()">
              <i class="ti ti-device-floppy"></i> Salvar Anotações
            </button>
          </div>
        </div>

        <div id="academy-attachments-container" style="display:none; flex-direction:column; gap:10px;">
          <div id="academy-attachments-list" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>

        <div id="academy-tab-content-comments" style="display:none; flex-direction:column; gap:16px;">
          <p style="font-size:12px; color:var(--muted); margin:0;">Tire suas dúvidas sobre esta aula ou deixe suas observações. A equipe e outros tripulantes poderão responder.</p>
          
          <div style="display:flex; flex-direction:column; gap:10px; background:var(--bg3); padding:14px; border-radius:10px; border:1px solid var(--border);">
            <div id="comment-reply-notice" style="display:none; align-items:center; justify-content:space-between; font-size:12px; color:var(--gold); background:rgba(223,178,108,0.1); padding:6px 12px; border-radius:6px;">
              <span>Respondendo a <strong id="comment-reply-author">--</strong></span>
              <button onclick="cancelCommentReply()" style="background:none; border:none; color:var(--muted); cursor:pointer; font-size:12px;"><i class="ti ti-x"></i> Cancelar</button>
            </div>
            <input type="hidden" id="academy-comment-parent-id" value="" />
            <textarea id="academy-comment-input" style="width:100%; min-height:80px; padding:10px; font-size:13px; border-radius:8px; background:var(--bg2); border:1px solid var(--border); color:var(--text); font-family:inherit;" placeholder="Escreva aqui sua dúvida ou comentário..."></textarea>
            <div style="display:flex; justify-content:flex-end;">
              <button class="btn gold btn-sm" onclick="sendAcademyComment()">
                <i class="ti ti-send"></i> Enviar Dúvida / Comentário
              </button>
            </div>
          </div>

          <div id="academy-comments-list" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;"></div>
        </div>
      </div>
    </div>

    <!-- LADO DIREITO: SIDEBAR DE MÓDULOS E AULAS -->
    <div style="width:340px; flex-shrink:0; background:var(--bg2); display:flex; flex-direction:column; overflow:hidden;">
      <div style="padding:16px 20px; border-bottom:1px solid var(--border); background:var(--bg3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px;">PROGRESSO DO CURSO</span>
          <span id="academy-sidebar-progress-text" style="font-size:12px; font-weight:700; color:var(--gold);">0%</span>
        </div>
        <div style="height:6px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
          <div id="academy-sidebar-progress-bar" style="height:100%; width:0%; background:var(--gold); border-radius:4px; transition:width 0.3s ease;"></div>
        </div>
      </div>

      <div id="academy-sidebar-modules-list" style="flex:1; overflow-y:auto; padding:12px 16px; display:flex; flex-direction:column; gap:10px;"></div>
    </div>

  </div>

</section>

<?php
require_once __DIR__ . '/includes/footer.php';
?>
