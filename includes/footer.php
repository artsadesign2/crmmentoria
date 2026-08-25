</main>
</div> <!-- .main-container -->

<!-- MODAL: GERAR MEMBERS BOOK PDF -->
<div class="overlay" id="mo-confirm-pdf">
  <div class="modal" style="max-width:420px">
    <div style="text-align:center;padding:24px 20px 16px">
      <i class="ti ti-file-type-pdf" style="font-size:48px;color:var(--gold);display:block;margin-bottom:12px"></i>
      <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text)">Gerar Members Book PDF</h3>
      <p style="color:var(--muted);font-size:13px;line-height:1.5;margin-bottom:20px" id="pdf-modal-desc">
        Deseja gerar o <strong style="color:var(--gold)">Members Book</strong> com a ficha completa de todos os membros ativos?<br>
        <span style="font-size:11px;opacity:0.7">O download iniciará automaticamente. Isso pode levar alguns segundos.</span>
      </p>
      
      <!-- Container de Progresso -->
      <div id="pdf-progress-container" style="display:none; margin: 10px 0 20px; text-align:left;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:var(--text)">
          <span id="pdf-progress-status" style="font-weight:500;">Inicializando gerador...</span>
          <span id="pdf-progress-percent" style="color:var(--gold); font-weight:bold;">0%</span>
        </div>
        <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
          <div id="pdf-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, var(--gold), #e0c068); transition:width 0.1s linear; border-radius:4px;"></div>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center" id="pdf-modal-actions">
        <button class="btn-cancel" onclick="closeModal('mo-confirm-pdf')">Cancelar</button>
        <button class="btn-save" onclick="executePDFGeneration()" id="btn-generate-pdf">
          <i class="ti ti-download"></i> Gerar PDF
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: NOVO / EDITAR CURSO DA ACADEMY -->
<div class="overlay" id="mo-academy-course">
  <div class="modal" style="max-width:600px; width:100%;">
    <div class="m-head">
      <h3 id="academy-course-modal-title">Novo Curso — Rocket Academy</h3>
      <button class="close" onclick="closeModal('mo-academy-course')">&times;</button>
    </div>
    <form id="academy-course-form" onsubmit="saveAcademyCourse(event)" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
      <input type="hidden" id="academy-course-id" />
      
      <div class="field">
        <label>Título do Curso *</label>
        <input type="text" id="academy-course-title" required placeholder="Ex: Mentoria de Vendas & Escala 10X" style="width:100%;" />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div class="field">
          <label>Categoria</label>
          <select id="academy-course-category" style="width:100%;">
            <option value="Mentorias">Mentorias</option>
            <option value="Imersões">Imersões</option>
            <option value="Vendas">Vendas & Escala</option>
            <option value="Encontros">Encontros de Quinta</option>
            <option value="Geral">Geral</option>
          </select>
        </div>
        <div class="field">
          <label>Nível / Público</label>
          <select id="academy-course-level" style="width:100%;">
            <option value="Geral">Geral</option>
            <option value="Iniciante">Iniciante</option>
            <option value="Intermediário">Intermediário</option>
            <option value="Avançado">Avançado / Master</option>
          </select>
        </div>
        <div class="field">
          <label>Ordem / Posição</label>
          <input type="number" id="academy-course-position" value="0" min="0" style="width:100%;" />
        </div>
      </div>

      <div class="field">
        <label>Descrição do Curso</label>
        <textarea id="academy-course-description" rows="3" placeholder="Resumo e objetivos do curso..." style="width:100%; background:var(--bg3); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:10px; font-size:13px;"></textarea>
      </div>

      <!-- COMPONENTE DE UPLOAD DE CAPA DO CURSO -->
      <div class="field">
        <label>Imagem de Capa do Curso</label>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="academy-course-cover" placeholder="https://... ou faça upload da imagem" style="flex:1;" oninput="updateCourseCoverPreview(this.value)" />
            <label class="btn" style="background:var(--bg3); border:1px solid var(--border); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12.5px;">
              <i class="ti ti-upload" style="color:var(--gold);"></i> Upload Imagem
              <input type="file" id="academy-course-cover-file" accept="image/*" style="display:none;" onchange="uploadAcademyCourseCoverFile(this)" />
            </label>
          </div>
          <div id="academy-course-cover-preview-box" style="display:none; margin-top:4px; width:100%; height:120px; border-radius:8px; border:1px solid var(--border); overflow:hidden; background:#000;">
            <img id="academy-course-cover-preview" src="" style="width:100%; height:100%; object-fit:cover;" />
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <div class="field" style="margin:0;">
          <label style="display:inline-flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="academy-course-status-check" checked style="accent-color:var(--gold);" />
            <span>Publicado na Rocket Academy</span>
          </label>
        </div>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn" onclick="closeModal('mo-academy-course')">Cancelar</button>
          <button type="submit" class="btn gold"><i class="ti ti-device-floppy"></i> Salvar Curso</button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: NOVO / EDITAR MÓDULO -->
<div class="overlay" id="mo-academy-module">
  <div class="modal" style="max-width:500px; width:100%;">
    <div class="m-head">
      <h3 id="academy-module-modal-title">Novo Módulo</h3>
      <button class="close" onclick="closeModal('mo-academy-module')">&times;</button>
    </div>
    <form id="academy-module-form" onsubmit="saveAcademyModule(event)" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
      <input type="hidden" id="academy-module-id" />
      <input type="hidden" id="academy-module-course-id" />
      <div class="field">
        <label>Título do Módulo *</label>
        <input type="text" id="academy-module-title" required placeholder="Ex: Módulo 1 — Boas-Vindas & Alinhamento" style="width:100%;" />
      </div>
      <div class="field">
        <label>Ordem / Posição</label>
        <input type="number" id="academy-module-position" value="0" min="0" style="width:100%;" />
      </div>
      <div class="field">
        <label>Descrição Breve</label>
        <input type="text" id="academy-module-description" placeholder="Ex: Fundamentos e introdução às metodologias" style="width:100%;" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button type="button" class="btn" onclick="closeModal('mo-academy-module')">Cancelar</button>
        <button type="submit" class="btn gold"><i class="ti ti-device-floppy"></i> Salvar Módulo</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: NOVO / EDITAR AULA -->
<div class="overlay" id="mo-academy-lesson">
  <div class="modal" style="max-width:650px; width:100%;">
    <div class="m-head">
      <h3 id="academy-lesson-modal-title">Nova Aula — Rocket Academy</h3>
      <button class="close" onclick="closeModal('mo-academy-lesson')">&times;</button>
    </div>
    <form id="academy-lesson-form" onsubmit="saveAcademyLesson(event)" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
      <input type="hidden" id="academy-lesson-id" />
      <input type="hidden" id="academy-lesson-module-id" />
      
      <div class="field">
        <label>Título da Aula / Encontro *</label>
        <input type="text" id="academy-lesson-title-input" required placeholder="Ex: Aula 01 — Estrutura de Pitch Indestrutível" style="width:100%;" />
      </div>

      <div style="display:grid; grid-template-columns:2fr 1fr; gap:12px;">
        <div class="field">
          <label>URL do Vídeo / Link (YouTube / Vimeo / Drive / MP4) *</label>
          <input type="text" id="academy-lesson-url" required placeholder="Cole aqui o link do YouTube ou Vimeo..." style="width:100%;" oninput="detectAcademyVideoProvider(this.value)" />
        </div>
        <div class="field">
          <label>Provedor Detectado</label>
          <select id="academy-lesson-provider" style="width:100%;">
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="gdrive">Google Drive</option>
            <option value="mp4">Vídeo MP4 Direto</option>
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="field">
          <label>Duração (minutos)</label>
          <input type="number" id="academy-lesson-duration-input" placeholder="Ex: 45" min="0" style="width:100%;" />
        </div>
        <div class="field">
          <label>Ordem / Posição</label>
          <input type="number" id="academy-lesson-position-input" value="0" min="0" style="width:100%;" />
        </div>
      </div>

      <!-- COMPONENTE DE UPLOAD DE THUMBNAIL DA AULA -->
      <div class="field">
        <label>Thumbnail / Capa da Aula (Opcional)</label>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="academy-lesson-cover-input" placeholder="https://... ou faça upload da thumbnail" style="flex:1;" oninput="updateLessonCoverPreview(this.value)" />
            <label class="btn" style="background:var(--bg3); border:1px solid var(--border); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12.5px;">
              <i class="ti ti-upload" style="color:var(--gold);"></i> Upload Imagem
              <input type="file" id="academy-lesson-cover-file" accept="image/*" style="display:none;" onchange="uploadAcademyLessonCoverFile(this)" />
            </label>
          </div>
          <div id="academy-lesson-cover-preview-box" style="display:none; margin-top:4px; width:100%; height:110px; border-radius:8px; border:1px solid var(--border); overflow:hidden; background:#000;">
            <img id="academy-lesson-cover-preview" src="" style="width:100%; height:100%; object-fit:cover;" />
          </div>
        </div>
      </div>

      <div class="field">
        <label>Descrição / Conteúdo da Aula</label>
        <textarea id="academy-lesson-desc-input" rows="3" placeholder="Resumo dos pontos abordados nesta aula..." style="width:100%; background:var(--bg3); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:10px; font-size:13px;"></textarea>
      </div>

      <div class="field">
        <label>Materiais de Apoio (URLs separadas por vírgula)</label>
        <input type="text" id="academy-lesson-attachments-input" placeholder="Ex: https://link.com/slides.pdf, https://link.com/planilha.xlsx" style="width:100%;" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button type="button" class="btn" onclick="closeModal('mo-academy-lesson')">Cancelar</button>
        <button type="submit" class="btn gold"><i class="ti ti-device-floppy"></i> Salvar Aula</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: MEU PERFIL / USUÁRIO -->
<div class="overlay" id="mo-user">
  <div class="modal" style="max-width:480px; width:100%;">
    <div class="m-head">
      <h3>Meu Perfil — Tripulante</h3>
      <button class="close" onclick="closeModal('mo-user')">&times;</button>
    </div>
    <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">
      <div class="field">
        <label>Nome Completo</label>
        <input type="text" id="user-profile-name" value="<?= htmlspecialchars($currentUser['name'] ?? '') ?>" readonly style="width:100%; opacity:0.8;" />
      </div>
      <div class="field">
        <label>E-mail de Acesso</label>
        <input type="email" id="user-profile-email" value="<?= htmlspecialchars($currentUser['email'] ?? '') ?>" readonly style="width:100%; opacity:0.8;" />
      </div>
      <div class="field">
        <label>Cargo / Perfil</label>
        <input type="text" id="user-profile-role" value="<?= strtoupper(htmlspecialchars($currentUser['role'] ?? 'funcionario')) ?>" readonly style="width:100%; opacity:0.8; font-weight:700; color:var(--gold);" />
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:10px;">
        <button type="button" class="btn" onclick="closeModal('mo-user')">Fechar</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: detalhe (Ficha do Membro Unificada - Executive Profile) -->
<div class="overlay" id="mo-detail">
  <div class="modal" style="max-width:880px; width:100%; padding:0; overflow:hidden; border-radius:16px;">
    <input type="file" id="cover-file-input" accept="image/*" style="display:none" onchange="if(this.files.length) handleCoverFile(this.files[0])"/>
    
    <!-- Executive Profile Banner Header -->
    <div class="member-exec-banner" style="display:flex; align-items:center; justify-content:space-between; gap:16px; padding:20px 24px; background:linear-gradient(135deg, rgba(223,178,108,0.06) 0%, rgba(15,17,26,0.98) 100%), var(--bg2); border-bottom:1px solid var(--border);">
      
      <div style="display:flex; align-items:center; gap:16px; min-width:0; flex:1;">
        <div class="member-exec-avatar-wrapper" onclick="document.getElementById('cover-file-input').click()" title="Alterar Foto de Perfil">
          <div class="member-exec-avatar" id="member-exec-avatar-preview">
            <i class="ti ti-user" id="member-exec-avatar-icon"></i>
          </div>
          <div class="member-exec-avatar-upload-badge" title="Upload de Foto">
            <i class="ti ti-camera"></i>
          </div>
        </div>
        
        <div class="member-exec-info" style="min-width:0;">
          <h2 id="detail-name-exec" class="member-exec-name" style="font-size:18px; font-weight:700; color:var(--text); margin:0; line-height:1.2; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Nome do Membro</h2>
          
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap;">
            <span id="detail-status-badge" class="member-exec-badge" style="font-size:10px; padding:2px 8px; border-radius:12px; font-weight:700; text-transform:uppercase;">Status</span>
            <span id="detail-health-badge" style="font-size:10px; font-weight:600; padding:2px 8px; border-radius:12px; background:rgba(16,185,129,0.12); color:var(--green); border:1px solid rgba(16,185,129,0.25);">🟢 Health: 100%</span>
            <span id="detail-expiration-badge" style="font-size:10px; font-weight:600; padding:2px 8px; border-radius:12px; background:rgba(223,178,108,0.12); color:var(--gold); border:1px solid rgba(223,178,108,0.25); display:none;">⏳ Anuidade: —</span>
          </div>

          <div id="detail-spec-exec" class="member-exec-spec" style="font-size:12.5px; color:var(--gold); margin-top:3px; font-weight:500; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Especialidade / Cargo</div>
          
          <div class="member-exec-meta" style="font-size:11px; color:var(--muted); margin-top:4px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <span><i class="ti ti-calendar" style="color:var(--gold)"></i> <span id="detail-meta-last">Último contato: —</span></span>
            <span><i class="ti ti-phone" style="color:var(--green)"></i> <span id="detail-meta-phone">—</span></span>
          </div>
        </div>
      </div>

      <!-- Action Buttons Column -->
      <div class="member-exec-actions" style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
        
        <!-- Botão Toggle Members Book (PDF) -->
        <button type="button" class="btn btn-sm" id="btn-toggle-exclude-book" onclick="toggleExcludeBook()" style="height:34px; padding:0 12px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px; color:var(--gold); border-color:rgba(223,178,108,0.3); background:rgba(223,178,108,0.12); cursor:pointer; transition:all 0.2s ease;">
          <i class="ti ti-book" style="font-size:15px;"></i> No Members Book
        </button>
        <input type="checkbox" id="f-exclude_from_book" style="display:none;" />

        <!-- Primary Action: WhatsApp com Dropdown de Templates -->
        <div style="position:relative; display:inline-block;">
          <button type="button" class="btn btn-sm btn-wa" id="btn-exec-wa" style="color:var(--green); border-color:rgba(16,185,129,0.3); background:rgba(16,185,129,0.12); display:none; height:34px; padding:0 12px; font-size:12px; font-weight:600;" onclick="toggleWaMenu(event)">
            <i class="ti ti-brand-whatsapp" style="font-size:15px;"></i> WhatsApp <i class="ti ti-chevron-down" style="font-size:10px; margin-left:2px;"></i>
          </button>
          <div id="wa-template-menu" style="display:none; position:absolute; right:0; top:38px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; width:220px; z-index:1500; box-shadow:0 10px 25px rgba(0,0,0,0.5); padding:6px 0;">
            <div style="font-size:10px; font-weight:700; color:var(--gold); padding:6px 12px; text-transform:uppercase; letter-spacing:0.5px;">Modelos de WhatsApp</div>
            <div onclick="sendWaTemplate('bday')" style="padding:8px 12px; font-size:12px; color:var(--text); cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-cake" style="color:var(--gold);"></i> Feliz Aniversário</div>
            <div onclick="sendWaTemplate('goal')" style="padding:8px 12px; font-size:12px; color:var(--text); cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-target-arrow" style="color:#3b82f6;"></i> Follow-up de Meta</div>
            <div onclick="sendWaTemplate('welcome')" style="padding:8px 12px; font-size:12px; color:var(--text); cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-rocket" style="color:#10b981;"></i> Boas-Vindas ao Club</div>
            <div onclick="sendWaTemplate('meeting')" style="padding:8px 12px; font-size:12px; color:var(--text); cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-calendar-event" style="color:#a855f7;"></i> Lembrete de Mentoria</div>
            <div onclick="sendWaTemplate('direct')" style="padding:8px 12px; font-size:12px; color:var(--muted); border-top:1px solid var(--border); margin-top:4px; cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-message"></i> Conversa Direta</div>
          </div>
        </div>

        <!-- Secondary Actions Dropdown Menu (Ações Rápidas) -->
        <div style="position:relative; display:inline-block;">
          <button type="button" class="btn btn-sm" id="btn-exec-actions-toggle" style="color:var(--text); border-color:var(--border); background:var(--bg3); height:34px; padding:0 10px; font-size:12px; font-weight:600;" onclick="toggleExecActionsMenu(event)">
            <i class="ti ti-dots-vertical" style="font-size:14px;"></i> <i class="ti ti-chevron-down" style="font-size:10px;"></i>
          </button>
          <div id="exec-actions-menu" style="display:none; position:absolute; right:0; top:38px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; width:200px; z-index:1500; box-shadow:0 10px 25px rgba(0,0,0,0.5); padding:6px 0;">
            <div style="font-size:10px; font-weight:700; color:var(--gold); padding:6px 12px; text-transform:uppercase; letter-spacing:0.5px;">Ações Rápidas</div>
            <div onclick="downloadSinglePDF(); closeExecActionsMenu();" style="padding:8px 12px; font-size:12px; color:var(--text); cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-file-text" style="color:var(--gold);"></i> PDF Individual</div>
            <div id="btn-menu-bday" onclick="generateBirthdayCard(detailId); closeExecActionsMenu();" style="padding:8px 12px; font-size:12px; color:var(--text); cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-cake" style="color:var(--gold);"></i> Card Aniversário</div>
            <div id="btn-menu-remove-photo" onclick="removeCover(event); closeExecActionsMenu();" style="padding:8px 12px; font-size:12px; color:var(--red); border-top:1px solid var(--border); margin-top:4px; cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'"><i class="ti ti-trash"></i> Remover Foto</div>
          </div>
        </div>

        <button class="m-close" onclick="closeModal('mo-detail')" title="Fechar" style="height:34px; width:34px; display:flex; align-items:center; justify-content:center;"><i class="ti ti-x"></i></button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab on" onclick="tab('profile')">Perfil</button>
      <button class="tab" onclick="tab('contacts')">Abordagens</button>
      <button class="tab" onclick="tab('goals')">Metas</button>
      <button class="tab" onclick="tab('milestones')">Conquistas</button>
      <button class="tab" onclick="tab('deals')">Negócios (ROI)</button>
      <button class="tab" onclick="tab('networking')">Networking</button>
      <button class="tab" onclick="tab('history')">Histórico</button>
    </div>

    <!-- Corpo do Modal com Rolar Independente -->
    <div class="m-body" style="max-height: calc(82vh - 160px); overflow-y: auto; padding: 24px 28px;">

      <!-- Aba: Perfil (Editar/Salvar Dados do Membro) -->
      <div class="tp on" id="tp-profile">

      <!-- Seção 1: Informações Pessoais -->
      <div class="accordion-section open" id="sec-personal">
        <div class="accordion-header" onclick="toggleSection('sec-personal')">
          <span><i class="ti ti-user-circle"></i> Informações Pessoais</span>
          <i class="ti ti-chevron-down chevron"></i>
        </div>
        <div class="accordion-content">
          <div class="field"><label>Nome completo</label><input id="f-name" type="text" placeholder="Ex: Maria Silva"/></div>
          <div class="grid-2">
            <div class="field"><label>Data de Nascimento</label><input id="f-birthdate" type="date"/></div>
            <div class="field"><label>Idade</label><input id="f-age" type="text" placeholder="Preenchida automaticamente"/></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>E-mail</label><input id="f-email" type="email" placeholder="exemplo@email.com"/></div>
            <div class="field"><label>Telefone</label><input id="f-phone" type="text" placeholder="(21) 99999-9999"/></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>CPF</label><input id="f-cpf" type="text" placeholder="000.000.000-00"/></div>
            <div class="field"><label>RG</label><input id="f-rg" type="text" placeholder="0.000.000"/></div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label>Estado Civil</label>
              <select id="f-marital_status" style="width:100%; height:38px; font-size:13px; border-radius:6px; background:var(--bg2); border:1px solid var(--border); color:var(--text); padding:0 10px; cursor:pointer;">
                <option value="">Selecione...</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="União Estável">União Estável</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="Separado(a)">Separado(a)</option>
              </select>
            </div>
            <div class="field">
              <label>Contato de Emergência (Nome e Telefone)</label>
              <input id="f-emergency_contact" type="text" placeholder="Nome - (21) 99999-9999"/>
            </div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Cidade Natal</label><input id="f-birthplace" type="text" placeholder="Petrópolis/RJ"/></div>
            <div class="field"><label>Residência Atual</label><input id="f-residence" type="text" placeholder="Rio de Janeiro/RJ"/></div>
          </div>
        </div>
      </div>

      <!-- Seção 2: Profissional & PJ -->
      <div class="accordion-section" id="sec-professional">
        <div class="accordion-header" onclick="toggleSection('sec-professional')">
          <span><i class="ti ti-briefcase"></i> Profissional & PJ</span>
          <i class="ti ti-chevron-down chevron"></i>
        </div>
        <div class="accordion-content">
          <div class="grid-2">
            <div class="field"><label>Especialidade</label><input id="f-spec" type="text" placeholder="Ex: Cardiologista"/></div>
            <div class="field"><label>Registro Profissional</label><input id="f-professional_register" type="text" placeholder="CRM-RJ 123456"/></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Tempo de Atuação</label><input id="f-professional_experience" type="text" placeholder="Ex: 10 anos"/></div>
            <div class="field"><label>Faturamento Mensal</label><input id="f-monthly_revenue" type="text" placeholder="Ex: R$ 30.000"/></div>
          </div>
          <div class="field"><label>Locais de Trabalho</label><textarea id="f-work_locations" placeholder="Hospital X, Consultório Y..." style="min-height:50px"></textarea></div>
          <div class="field"><label>Descrição das Atividades & Carga Horária</label><textarea id="f-work_description_hours" placeholder="Descreva suas funções e carga horária semanal..." style="min-height:60px"></textarea></div>
          <div class="grid-2">
            <div class="field"><label>Deseja cadastrar PJ?</label><input id="f-register_pj" type="text" placeholder="Sim/Não"/></div>
            <div class="field"><label>CNPJ</label><input id="f-cnpj" type="text" placeholder="00.000.000/0000-00"/></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Razão Social</label><input id="f-company_name" type="text" placeholder="Razão Social da Empresa"/></div>
            <div class="field"><label>Nome Fantasia</label><input id="f-trade_name" type="text" placeholder="Nome Fantasia"/></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Inscrição Municipal</label><input id="f-municipal_register" type="text" placeholder="Inscrição Municipal"/></div>
            <div class="field"><label>Endereço Comercial</label><input id="f-commercial_address" type="text" placeholder="Endereço Comercial Completo"/></div>
          </div>
        </div>
      </div>

      <!-- Seção: Redes Sociais -->
      <div class="accordion-section" id="sec-social">
        <div class="accordion-header" onclick="toggleSection('sec-social')">
          <span><i class="ti ti-share"></i> Redes Sociais</span>
          <i class="ti ti-chevron-down chevron"></i>
        </div>
        <div class="accordion-content">
          <div class="field">
            <label>Instagram</label>
            <div style="position:relative;">
              <i class="ti ti-brand-instagram" style="position:absolute; left:12px; top:10px; color:var(--gold); font-size:16px;"></i>
              <input id="f-instagram" type="text" placeholder="@usuario" style="padding-left:36px;"/>
            </div>
          </div>
          <div class="field">
            <label>LinkedIn</label>
            <div style="position:relative;">
              <i class="ti ti-brand-linkedin" style="position:absolute; left:12px; top:10px; color:var(--gold); font-size:16px;"></i>
              <input id="f-linkedin" type="text" placeholder="https://linkedin.com/in/usuario" style="padding-left:36px;"/>
            </div>
          </div>
          <div class="field">
            <label>Facebook</label>
            <div style="position:relative;">
              <i class="ti ti-brand-facebook" style="position:absolute; left:12px; top:10px; color:var(--gold); font-size:16px;"></i>
              <input id="f-facebook" type="text" placeholder="https://facebook.com/usuario" style="padding-left:36px;"/>
            </div>
          </div>
          <div class="field">
            <label>YouTube</label>
            <div style="position:relative;">
              <i class="ti ti-brand-youtube" style="position:absolute; left:12px; top:10px; color:var(--gold); font-size:16px;"></i>
              <input id="f-youtube" type="text" placeholder="https://youtube.com/@canal" style="padding-left:36px;"/>
            </div>
          </div>
          <div class="field">
            <label>X (Twitter)</label>
            <div style="position:relative;">
              <i class="ti ti-brand-twitter" style="position:absolute; left:12px; top:10px; color:var(--gold); font-size:16px;"></i>
              <input id="f-twitter" type="text" placeholder="https://x.com/usuario" style="padding-left:36px;"/>
            </div>
          </div>
          <div class="field">
            <label>Outras Redes (Links)</label>
            <div style="position:relative;">
              <i class="ti ti-share" style="position:absolute; left:12px; top:10px; color:var(--gold); font-size:16px;"></i>
              <input id="f-social_media" type="text" placeholder="Outras redes sociais, separadas por vírgula..." style="padding-left:36px;"/>
            </div>
          </div>
          <div class="field">
            <label>Website</label>
            <div style="position:relative;">
              <i class="ti ti-world" style="position:absolute; left:12px; top:10px; color:var(--gold); font-size:16px;"></i>
              <input id="f-website" type="text" placeholder="www.seusite.com.br" style="padding-left:36px;"/>
            </div>
          </div>
        </div>
      </div>

      <!-- Seção: Vida Pessoal & Família -->
      <div class="accordion-section" id="sec-family">
        <div class="accordion-header" onclick="toggleSection('sec-family')">
          <span><i class="ti ti-home-heart"></i> Vida Pessoal & Família</span>
          <i class="ti ti-chevron-down chevron"></i>
        </div>
        <div class="accordion-content">
          <div class="field"><label>Cônjuge / Companheiro(a) (Nome e Idade)</label><input id="f-spouse_info" type="text" placeholder="Ex: João Silva, 35 anos"/></div>
          <div class="field"><label>Filhos (Nomes e Idades)</label><textarea id="f-children_info" placeholder="Ex: Pedro (5 anos), Ana (2 anos)" style="min-height:50px"></textarea></div>
          <div class="field"><label>Pets (Nomes e Espécies)</label><textarea id="f-pets_info" placeholder="Ex: Rex (Cão), Luna (Gata)" style="min-height:50px"></textarea></div>
          <div class="field"><label>Hobbies</label><textarea id="f-hobbies" placeholder="Hobbies para compartilhar com a tripulação..." style="min-height:50px"></textarea></div>
          <div class="field"><label>Esportes Praticados</label><textarea id="f-sports_info" placeholder="Ex: Corrida, Tênis, Musculação" style="min-height:50px"></textarea></div>
        </div>
      </div>

      <!-- Seção 4: Mentoria & Objetivos -->
      <div class="accordion-section" id="sec-mentorship">
        <div class="accordion-header" onclick="toggleSection('sec-mentorship')">
          <span><i class="ti ti-target-arrow"></i> Mentoria & Objetivos</span>
          <i class="ti ti-chevron-down chevron"></i>
        </div>
        <div class="accordion-content">
          <div class="grid-2">
            <div class="field"><label>Último contato</label><input id="f-last" type="date"/></div>
            <div class="field"><label>Status</label>
              <select id="f-status">
                <option value="cinza">Não alocado</option>
                <option value="azul">Iniciante</option>
                <option value="verde">Engajado</option>
                <option value="amarela">Morno</option>
                <option value="vermelha">Atenção urgente</option>
              </select>
            </div>
          </div>
          <div class="field"><label>Interesse na Mentoria</label><textarea id="f-mentorship_interest" placeholder="O que despertou seu interesse na mentoria?" style="min-height:60px"></textarea></div>
          <div class="field"><label>Maior Objetivo Profissional Hoje</label><textarea id="f-main_goal" placeholder="Qual o seu maior objetivo hoje?" style="min-height:60px"></textarea></div>
          <div class="field"><label>Maior Desafio & Dificuldades</label><textarea id="f-biggest_challenge" placeholder="Quais são os maiores desafios e dificuldades?" style="min-height:60px"></textarea></div>
          <div class="field"><label>Conteúdo que Consome</label><textarea id="f-content_consumption" placeholder="Que tipo de conteúdo consome regularmente? (YouTube, Spotify, etc)" style="min-height:50px"></textarea></div>
          <div class="grid-2">
            <div class="field"><label>Disponibilidade de Tempo</label><input id="f-weekly_availability" type="text" placeholder="Ex: 4h semanais"/></div>
            <div class="field"><label>Como nos conheceu?</label><input id="f-how_did_you_find_us" type="text" placeholder="Ex: Indicação, Instagram"/></div>
          </div>
          <div class="field"><label>Outras Áreas de Interesse</label><textarea id="f-interests" placeholder="Interesses, mentoria, vendas..." style="min-height:50px"></textarea></div>
          <div class="field"><label>Notas / Observações</label><textarea id="f-notes" placeholder="Observações..."></textarea></div>
        </div>
      </div>
      
    </div>

    <div class="tp" id="tp-contacts">
      <!-- Formulário Novo Registro de Abordagem -->
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:20px;">
        <div style="font-size:13px; font-weight:600; color:var(--gold); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <i class="ti ti-plus"></i> Registrar Nova Abordagem
        </div>
        <div class="grid-2" style="margin-bottom:12px;">
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Canal de Contato</label>
            <select id="c-type" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;">
              <option value="message">💬 Mensagem / WhatsApp</option>
              <option value="call">📞 Ligação Telefônica</option>
              <option value="meeting">🤝 Reunião Presencial/Online</option>
              <option value="email">✉️ E-mail</option>
              <option value="other">📝 Outro Registro</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Data do Contato</label>
            <input id="c-date" type="date" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
          </div>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Data de Próximo Retorno (Follow-up - Opcional)</label>
          <input id="c-followup" type="date" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Resumo da Conversa / Nota</label>
          <textarea id="c-note" placeholder="Descreva o que foi conversado, acordado ou próximos passos..." style="min-height:70px; width:100%; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:10px; font-size:13px; font-family:inherit;"></textarea>
        </div>
        <button class="btn gold" style="width:100%; height:38px; font-size:13px; font-weight:600; justify-content:center;" onclick="addContact()">
          <i class="ti ti-check"></i> Salvar Abordagem
        </button>
      </div>

      <!-- Barra de Filtros e Busca no Histórico de Abordagens -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:200px;">
          <div style="position:relative; flex:1;">
            <i class="ti ti-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:14px;"></i>
            <input type="text" id="c-filter-search" oninput="filterContactsList()" placeholder="Buscar nas notas..." style="width:100%; height:32px; padding-left:30px; font-size:12px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text);" />
          </div>
          <select id="c-filter-type" onchange="filterContactsList()" style="height:32px; font-size:12px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:0 8px; cursor:pointer;">
            <option value="">Todos os canais</option>
            <option value="message">Mensagem</option>
            <option value="call">Ligação</option>
            <option value="meeting">Reunião</option>
            <option value="email">E-mail</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div style="font-size:12px; color:var(--muted); font-weight:500;" id="c-count-label">0 abordagens</div>
      </div>

      <!-- Lista / Timeline de Abordagens -->
      <div id="contacts-list" style="display:flex; flex-direction:column; gap:12px; max-height:450px; overflow-y:auto; padding-right:4px;"></div>
    </div>

    <div class="tp" id="tp-goals">
      <!-- Formulário Novo Registro de Meta -->
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:20px;">
        <div style="font-size:13px; font-weight:600; color:var(--gold); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <i class="ti ti-target-arrow"></i> Adicionar Nova Meta do Membro
        </div>
        
        <div class="grid-2" style="margin-bottom:12px;">
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Pilar da Mentoria</label>
            <select id="g-pillar" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;">
              <option value="1">🧠 1 — Mentalidade Empreendedora</option>
              <option value="2">📈 2 — Crescimento Comercial</option>
              <option value="3">⭐ 3 — Posicionamento e Autoridade</option>
              <option value="4">🏢 4 — Estruturação Profissional</option>
              <option value="5">⚖️ 5 — Qualidade de Vida</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Prazo de Conclusão</label>
            <input id="g-due" type="date" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
          </div>
        </div>

        <div class="field" style="margin-bottom:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Título da Meta</label>
          <input id="g-title" type="text" placeholder="Ex: Atingir R$ 100k de faturamento mensal..." style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
        </div>

        <div class="field" style="margin-bottom:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Detalhamento / Plano de Ação (Opcional)</label>
          <textarea id="g-desc" placeholder="Passos necessários para alcançar esta meta..." style="min-height:50px; width:100%; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:10px; font-size:13px; font-family:inherit;"></textarea>
        </div>

        <button class="btn gold" style="width:100%; height:38px; font-size:13px; font-weight:600; justify-content:center;" onclick="addGoal()">
          <i class="ti ti-plus"></i> Salvar Meta
        </button>
      </div>

      <!-- Card de Progresso e Métricas das Metas -->
      <div id="goals-summary-card" style="background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:600; color:var(--text); text-transform:uppercase; letter-spacing:0.5px;">Progresso das Metas</span>
          <span style="font-size:12px; font-weight:700; color:var(--gold);" id="goals-percent-text">0% Concluído</span>
        </div>
        <div style="width:100%; height:8px; background:var(--bg3); border-radius:4px; overflow:hidden; margin-bottom:10px;">
          <div id="goals-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, var(--gold), #10b981); transition:width 0.4s ease;"></div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:var(--muted);" id="goals-stats-pills">
        </div>
      </div>

      <!-- Barra de Filtros por Status e Pilar -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:200px;">
          <select id="g-filter-status" onchange="filterGoalsList()" style="height:32px; font-size:12px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:0 8px; cursor:pointer;">
            <option value="">Todos os status</option>
            <option value="open">Em Aberto (Pendentes)</option>
            <option value="done">Concluídas</option>
            <option value="overdue">Atrasadas / Vencidas</option>
          </select>
          <select id="g-filter-pillar" onchange="filterGoalsList()" style="height:32px; font-size:12px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:0 8px; cursor:pointer;">
            <option value="">Todos os pilares</option>
            <option value="1">Pilar 1 — Mentalidade</option>
            <option value="2">Pilar 2 — Vendas/Comercial</option>
            <option value="3">Pilar 3 — Posicionamento</option>
            <option value="4">Pilar 4 — Estruturação</option>
            <option value="5">Pilar 5 — Qualidade de Vida</option>
          </select>
        </div>
      </div>

      <!-- Lista de Metas -->
      <div id="goals-list" style="display:flex; flex-direction:column; gap:10px; max-height:400px; overflow-y:auto; padding-right:4px;"></div>
    </div>

    <div class="tp" id="tp-milestones">
      <!-- Formulário Novo Registro de Conquista -->
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:20px;">
        <div style="font-size:13px; font-weight:600; color:var(--gold); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <i class="ti ti-trophy"></i> Registrar Novo Marco / Conquista
        </div>
        
        <div class="grid-2" style="margin-bottom:12px;">
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Pilar do Marco</label>
            <select id="m-pillar" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;">
              <option value="1">🧠 1 — Mentalidade Empreendedora</option>
              <option value="2">📈 2 — Crescimento Comercial</option>
              <option value="3">⭐ 3 — Posicionamento e Autoridade</option>
              <option value="4">🏢 4 — Estruturação Profissional</option>
              <option value="5">⚖️ 5 — Qualidade de Vida</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Data do Feito</label>
            <input id="m-date" type="date" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
          </div>
        </div>

        <div class="field" style="margin-bottom:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Título da Conquista</label>
          <input id="m-title" type="text" placeholder="Ex: Bateu R$ 500k de faturamento em um único mês..." style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
        </div>

        <div class="field" style="margin-bottom:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">História / Contexto da Conquista (Opcional)</label>
          <textarea id="m-desc" placeholder="Detalhes do feito, impacto no negócio, depoimento do membro..." style="min-height:60px; width:100%; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:10px; font-size:13px; font-family:inherit;"></textarea>
        </div>

        <button class="btn gold" style="width:100%; height:38px; font-size:13px; font-weight:600; justify-content:center;" onclick="addMilestone()">
          <i class="ti ti-trophy"></i> Celebrar e Salvar Conquista
        </button>
      </div>

      <!-- Barra de Estatísticas & Filtros de Conquistas -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:200px;">
          <div style="position:relative; flex:1;">
            <i class="ti ti-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:14px;"></i>
            <input type="text" id="m-filter-search" oninput="filterMilestonesList()" placeholder="Buscar nas conquistas..." style="width:100%; height:32px; padding-left:30px; font-size:12px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text);" />
          </div>
          <select id="m-filter-pillar" onchange="filterMilestonesList()" style="height:32px; font-size:12px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:0 8px; cursor:pointer;">
            <option value="">Todos os pilares</option>
            <option value="1">Pilar 1 — Mentalidade</option>
            <option value="2">Pilar 2 — Comercial</option>
            <option value="3">Pilar 3 — Posicionamento</option>
            <option value="4">Pilar 4 — Estruturação</option>
            <option value="5">Pilar 5 — Qualidade de Vida</option>
          </select>
        </div>
        <div style="font-size:12px; color:var(--gold); font-weight:600;" id="m-count-label">🏆 0 conquistas</div>
      </div>

      <!-- Timeline de Troféus / Conquistas -->
      <div id="milestones-list" style="display:flex; flex-direction:column; gap:12px; max-height:450px; overflow-y:auto; padding-right:4px;"></div>
    </div>

    <!-- Aba: Negócios (ROI do Membro no Club) -->
    <div class="tp" id="tp-deals">
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:20px;">
        <div style="font-size:13px; font-weight:600; color:var(--gold); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <i class="ti ti-currency-dollar"></i> Registrar Negócio / Parceria Gerada no Club
        </div>
        
        <div class="grid-2" style="margin-bottom:12px;">
          <div class="field" style="margin-bottom:0; position:relative;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Membro Parceiro (Com quem fechou?)</label>
            <div style="position:relative;">
              <input id="dl-partner-search" type="text" placeholder="Digite para buscar mentorado ou parceiro..." autocomplete="off" oninput="onPartnerSearchInput()" onfocus="onPartnerSearchFocus()" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 30px 0 32px; font-size:13px;" />
              <i class="ti ti-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:14px; pointer-events:none;"></i>
              <button type="button" id="dl-partner-clear" onclick="clearPartnerSearch()" style="display:none; position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--muted); cursor:pointer; font-size:14px; padding:2px;"><i class="ti ti-x"></i></button>
            </div>
            <input type="hidden" id="dl-partner" name="dl-partner" />

            <!-- Floating Results Dropdown -->
            <div id="dl-partner-dropdown" style="display:none; position:absolute; left:0; right:0; top:62px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; max-height:220px; overflow-y:auto; z-index:1600; box-shadow:0 10px 25px rgba(0,0,0,0.6); padding:4px 0;"></div>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Valor Estimado do Negócio (R$)</label>
            <input id="dl-value" type="number" step="0.01" placeholder="50000.00" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:12px;">
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Título do Negócio / Projeto</label>
            <input id="dl-title" type="text" placeholder="Ex: Contrato de Prestação de Serviços..." style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Data do Fechamento</label>
            <input id="dl-date" type="date" style="width:100%; height:36px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:13px;"/>
          </div>
        </div>

        <div class="field" style="margin-bottom:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:600;">Observações / Detalhes (Opcional)</label>
          <textarea id="dl-notes" placeholder="Detalhes do contrato, duração, escopo..." style="min-height:50px; width:100%; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:10px; font-size:13px; font-family:inherit;"></textarea>
        </div>

        <button class="btn gold" style="width:100%; height:38px; font-size:13px; font-weight:600; justify-content:center;" onclick="addDeal()">
          <i class="ti ti-check"></i> Registrar Negócio no ROI
        </button>
      </div>

      <!-- Totalizador de ROI -->
      <div style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(223, 178, 108, 0.15)); border:1px solid rgba(16, 185, 129, 0.3); border-radius:10px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--muted); letter-spacing:0.5px;">Retorno Gerado no Rocket Club (ROI)</div>
          <div style="font-size:22px; font-weight:800; color:var(--green); margin-top:2px;" id="deals-total-roi">R$ 0,00</div>
        </div>
        <div style="width:40px; height:40px; border-radius:10px; background:rgba(16, 185, 129, 0.2); color:var(--green); display:flex; align-items:center; justify-content:center; font-size:20px;">
          <i class="ti ti-chart-dots"></i>
        </div>
      </div>

      <!-- Lista de Negócios -->
      <div id="deals-list" style="display:flex; flex-direction:column; gap:10px; max-height:400px; overflow-y:auto; padding-right:4px;"></div>
    </div>

    <!-- Aba: Networking & Smart Matching por Endereço -->
    <div class="tp" id="tp-networking">
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:14px; font-weight:700; color:var(--gold); display:flex; align-items:center; gap:8px;">
              <i class="ti ti-topology-full"></i> Smart Matching — Conexões por Endereço & Região
            </div>
            <div style="font-size:12px; color:var(--muted); margin-top:2px;">
              Membros sugeridos por proximidade de residência (cidade/estado), atuação e especialidade complementar.
            </div>
          </div>
          <div id="networking-current-loc-badge" style="background:var(--bg3); border:1px solid var(--border); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; color:var(--text); display:flex; align-items:center; gap:6px;">
            <i class="ti ti-map-pin" style="color:var(--gold);"></i>
            <span id="networking-loc-text">Carregando endereço...</span>
          </div>
        </div>

        <!-- Filtros Rápidos de Networking -->
        <div style="display:flex; align-items:center; gap:8px; margin-top:14px; flex-wrap:wrap;" id="networking-filter-buttons">
          <button type="button" class="net-filter-btn active" onclick="setNetworkingFilter('all', this)" style="background:var(--bg3); border:1px solid var(--border-focus); color:var(--gold); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <i class="ti ti-grid-dots"></i> Todos (<span id="net-count-all">0</span>)
          </button>
          <button type="button" class="net-filter-btn" onclick="setNetworkingFilter('city', this)" style="background:var(--bg3); border:1px solid var(--border); color:var(--muted); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <i class="ti ti-map-pin-filled" style="color:var(--gold);"></i> Mesma Cidade (<span id="net-count-city">0</span>)
          </button>
          <button type="button" class="net-filter-btn" onclick="setNetworkingFilter('state', this)" style="background:var(--bg3); border:1px solid var(--border); color:var(--muted); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <i class="ti ti-map-pin" style="color:var(--blue);"></i> Mesmo Estado (<span id="net-count-state">0</span>)
          </button>
          <button type="button" class="net-filter-btn" onclick="setNetworkingFilter('specialty', this)" style="background:var(--bg3); border:1px solid var(--border); color:var(--muted); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <i class="ti ti-briefcase" style="color:var(--green);"></i> Mesma Especialidade (<span id="net-count-spec">0</span>)
          </button>
        </div>
      </div>

      <div id="networking-matches-list" style="display:flex; flex-direction:column; gap:12px; max-height:480px; overflow-y:auto; padding-right:4px;"></div>
    </div>

    <div class="tp" id="tp-history">
      <!-- Barra de Filtros e Contador do Histórico -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
        <div style="position:relative; flex:1; min-width:200px;">
          <i class="ti ti-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:14px;"></i>
          <input type="text" id="h-filter-search" oninput="filterHistoryList()" placeholder="Buscar no histórico de alterações..." style="width:100%; height:32px; padding-left:30px; font-size:12px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text);" />
        </div>
        <div style="font-size:12px; color:var(--muted); font-weight:500;" id="h-count-label">0 registros</div>
      </div>

      <!-- Lista / Timeline do Histórico de Alterações -->
      <div id="history-list" style="display:flex; flex-direction:column; gap:10px; max-height:450px; overflow-y:auto; padding-right:4px;"></div>
    </div>

    </div> <!-- Fim de .m-body -->

    <!-- Rodapé Fixo de Ações -->
    <div class="m-foot" style="padding: 16px 28px; background: var(--bg3); border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="display:flex; gap:10px; align-items:center;">
        <button class="btn" id="btn-profile-birthday-card" style="display:none; background:rgba(223, 178, 108, 0.1); border-color:var(--gold); color:var(--gold);" onclick="generateBirthdayCard(editId)"><i class="ti ti-cake"></i> Gerar Card</button>
        <button class="btn-del" id="btn-profile-del" style="display:none" onclick="confirmDeleteCurrentMember()"><i class="ti ti-trash"></i> Remover Ficha</button>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <button class="btn-cancel" onclick="closeModal('mo-detail')">Fechar</button>
        <button class="btn-save" id="btn-profile-save" onclick="saveMember()"><i class="ti ti-device-floppy"></i> Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Confirmar Exclusão Moderna -->
<div class="overlay" id="mo-confirm-delete">
  <div class="modal" style="max-width: 400px; text-align: center;">
    <div style="margin-bottom: 20px; display: inline-block;">
      <div class="warning-icon-glow">
        <i class="ti ti-alert-triangle" style="font-size: 38px; color: var(--red);"></i>
      </div>
    </div>
    <h3 style="font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 12px;">Excluir Ficha Permanentemente?</h3>
    <p style="font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 24px;">
      Você está prestes a remover a ficha de <strong id="del-member-name" style="color: var(--text)"></strong>. Esta ação é <strong style="color: var(--red)">irreversível</strong> e apagará todos os contatos, metas e conquistas associadas.
    </p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button class="btn-cancel" onclick="closeConfirmModal()" style="flex: 1;">Cancelar</button>
      <button class="btn-save" id="btn-confirm-delete-action" style="background: var(--red); color: #fff; flex: 1; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);">
        Excluir (5s)
      </button>
    </div>
  </div>
</div>

<!-- Modal: Confirmação Genérica de Ações Destrutivas (Design System) -->
<div class="overlay" id="mo-confirm-action">
  <div class="modal" style="max-width: 420px; text-align: center;">
    <div style="margin-bottom: 16px; display: inline-block;">
      <div class="warning-icon-glow">
        <i class="ti ti-alert-triangle" style="font-size: 38px; color: var(--red);"></i>
      </div>
    </div>
    <h3 id="mo-confirm-title" style="font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 10px;">Confirmar Exclusão</h3>
    <p id="mo-confirm-message" style="font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 24px; padding: 0 10px;">
      Tem certeza que deseja remover este item? Esta ação não poderá ser desfeita.
    </p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button class="btn-cancel" onclick="closeConfirmActionModal()" style="flex: 1;">Cancelar</button>
      <button class="btn-save" id="btn-confirm-action-submit" style="background: var(--red); color: #fff; flex: 1; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
        <i class="ti ti-trash"></i> Confirmar Exclusão
      </button>
    </div>
  </div>
</div>

<!-- Modal: Aniversário Card Preview -->
<div class="overlay" id="mo-birthday-card">
  <div class="modal" style="max-width:480px; text-align:center;">
    <div class="m-head">
      <div class="m-title" style="display:flex; align-items:center; gap:6px;"><i class="ti ti-gift" style="color:var(--gold)"></i> Card de Aniversário</div>
      <button class="m-close" onclick="closeModal('mo-birthday-card')"><i class="ti ti-x"></i></button>
    </div>
    <div style="padding:16px; display:flex; flex-direction:column; align-items:center; gap:14px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; width:100%; box-sizing:border-box; background:var(--bg3); padding:14px 16px; border-radius:12px; border:1px solid var(--border);">
        <div>
          <label for="mo-card-model-select" style="font-size:11.5px; color:var(--muted); font-weight:600; display:block; margin-bottom:6px; text-align:left;">
            <i class="ti ti-layout-grid" style="color:var(--gold)"></i> Modelo Visual:
          </label>
          <select id="mo-card-model-select" onchange="changeBirthdayCardModel(this.value)" style="width:100%; height:38px; box-sizing:border-box; background:var(--bg2); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:0 10px; font-size:12px; font-weight:600; cursor:pointer;">
            <option value="model1">Modelo 1 — Fundo Inteiro</option>
            <option value="model2">Modelo 2 — Moldura</option>
          </select>
        </div>

        <div>
          <label for="mo-card-align-select" style="font-size:11.5px; color:var(--muted); font-weight:600; display:block; margin-bottom:6px; text-align:left;">
            <i class="ti ti-align-center" style="color:var(--gold)"></i> Posição da Foto:
          </label>
          <select id="mo-card-align-select" onchange="changeBirthdayCardAlign(this.value)" style="width:100%; height:38px; box-sizing:border-box; background:var(--bg2); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:0 10px; font-size:12px; font-weight:600; cursor:pointer;">
            <option value="top">Topo Centro</option>
            <option value="center">Centro Centro</option>
            <option value="bottom">Centro Base</option>
          </select>
        </div>
      </div>

      <div id="birthday-card-loading" style="font-size:14px; color:var(--gold); padding:20px 0;">
        <i class="ti ti-loader animate-spin" style="font-size:24px; display:block; margin:0 auto 10px;"></i> Gerando card de alta resolução...
      </div>
      <div id="birthday-card-preview-container" style="width:100%; max-width:320px; border-radius:12px; overflow:hidden; border:1px solid var(--border); box-shadow:0 10px 25px rgba(0,0,0,0.5); display:none;">
        <img id="birthday-card-img" style="width:100%; height:auto; display:block;" />
      </div>
      <div style="display:flex; gap:10px; width:100%; flex-wrap:wrap; margin-top:4px;">
        <button class="btn-cancel" onclick="closeModal('mo-birthday-card')" style="flex:0.8; min-width:90px; white-space:nowrap;">Fechar</button>
        <button class="btn" id="btn-gdrive-single-upload" onclick="sendCurrentCardToGoogleDrive()" style="flex:1.3; background:rgba(66,133,244,0.15); border:1px solid #4285F4; color:#fff; white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-weight:600; font-size:12.5px;">
          <i class="ti ti-brand-google-drive" style="color:#4285F4; font-size:16px;"></i> Enviar p/ Drive
        </button>
        <button class="btn-save" id="btn-download-birthday-card" style="flex:1.2; white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-size:12.5px;">
          <i class="ti ti-download"></i> Baixar Imagem
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Confirmação & Progresso de Exportação do Google Drive -->
<div class="overlay" id="mo-gdrive-export">
  <div class="modal" style="max-width: 520px; width: 92%;">
    <div style="text-align:center; padding: 24px 20px 16px;">
      <i class="ti ti-brand-google-drive" style="font-size:48px; color:#4285F4; display:block; margin-bottom:12px;"></i>
      <h3 style="font-size:16px; font-weight:600; margin-bottom:8px; color:var(--text)">Exportar Cards de Aniversário</h3>
      <p style="color:var(--muted); font-size:13px; line-height:1.5; margin-bottom:20px" id="gdrive-export-desc">
        Deseja gerar os cards de aniversário de alta resolução (<strong style="color:var(--gold)">1080x1920</strong>) de toda a tripulação e exportar para o <strong style="color:#4285F4">Google Drive</strong>?<br>
        <span style="font-size:11px; opacity:0.7">O processamento será realizado em lote e salvo automaticamente.</span>
      </p>

      <div id="gdrive-progress-container" style="display:none; margin: 10px 0 20px; text-align:left;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:var(--text)">
          <span id="gdrive-export-status" style="font-weight:500;">Inicializando gerador...</span>
          <span id="gdrive-export-percent" style="color:var(--gold); font-weight:bold;">0%</span>
        </div>
        <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
          <div id="gdrive-export-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #4285F4, var(--gold)); transition:width 0.2s ease; border-radius:4px;"></div>
        </div>
      </div>

      <div style="display:flex; gap:10px; justify-content:center; align-items:center;" id="gdrive-modal-actions">
        <button class="btn-cancel" onclick="closeModal('mo-gdrive-export')">Cancelar</button>
        <button class="btn gold" onclick="executeBirthdayCardsExport()" id="btn-start-gdrive-export" style="box-shadow:0 4px 14px rgba(66,133,244,0.3); white-space:nowrap;">
          <i class="ti ti-brand-google-drive"></i> Sim, Exportar Cards
        </button>
      </div>

      <div style="display:none; gap:12px; justify-content:center; align-items:center; margin-top:14px;" id="gdrive-modal-done-actions">
        <button class="btn-cancel" onclick="closeModal('mo-gdrive-export')" style="flex:0.8; min-width:110px; white-space:nowrap; height:42px;">Fechar</button>
        <button class="btn gold" id="btn-download-cards-batch" onclick="downloadAllCardsZip()" style="flex:1.5; white-space:nowrap; height:42px; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
          <i class="ti ti-file-zip"></i> Baixar Todos em ZIP (.zip)
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL COMMAND PALETTE (CTRL + K) -->
<div class="overlay" id="mo-command-palette" onclick="if(event.target===this) closeCommandPalette()">
  <div class="modal" style="max-width: 640px; width: 100%; padding: 0; overflow: hidden; border-radius: 16px; background: var(--bg2); border: 1px solid var(--border); box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(223,178,108,0.1);">
    <div style="display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--bg3); gap: 12px;">
      <i class="ti ti-search" style="font-size: 20px; color: var(--gold);"></i>
      <input type="text" id="cmd-palette-input" placeholder="Digite um comando, nome de membro ou artigo da wiki..." style="flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 15px; font-family: inherit;" oninput="onCommandPaletteInput(this.value)" onkeydown="onCommandPaletteKeydown(event)" />
      <kbd style="background: rgba(255,255,255,0.08); border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px; font-size: 11px; color: var(--muted); font-family: monospace;">ESC</kbd>
    </div>
    <div id="cmd-palette-results" style="max-height: 380px; overflow-y: auto; padding: 8px 12px;"></div>
    <div style="padding: 10px 20px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--muted);">
      <span><i class="ti ti-arrows-vertical" style="font-size: 14px;"></i> Navegar com setas</span>
      <span><i class="ti ti-corner-down-left" style="font-size: 14px;"></i> Selecionar</span>
    </div>
  </div>
</div>

<!-- TELA DE LOGIN OVERLAY (MODELO REFERÊNCIA TEMA ESCURO) -->
<div id="login-overlay" class="login-overlay-backdrop" style="display:none;">
  <div class="login-split-card">
    <div class="login-hero-panel">
      <img src="login_rocket.webp" alt="Rocket Launch" class="login-hero-img" />
      <div class="login-hero-overlay"></div>
      <div class="login-hero-content">
        <div class="login-logo-wrapper" style="width:100%; max-width:280px; margin:0 auto 20px auto; display:flex; align-items:center; justify-content:center;">
          <img src="api/system_logo.webp" id="login-system-logo" alt="Logo do Sistema" style="width:100%; height:auto; max-height:110px; object-fit:contain; filter:drop-shadow(0 4px 16px rgba(0,0,0,0.7)); display:block;" />
        </div>
        <h1 class="login-hero-title">Bem-vindo</h1>
        <p class="login-hero-subtitle">Ao ecossistema dos grandes líderes e de eventos exclusivos</p>
      </div>
    </div>

    <div class="login-form-panel">
      <form id="login-form" onsubmit="handleLogin(event)" class="login-form-body">
        <div id="login-error-msg" class="login-error-box" style="display:none;">
          <i class="ti ti-alert-circle" style="font-size:18px; flex-shrink:0;"></i>
          <span id="login-error-text"></span>
        </div>

        <div class="login-field-group">
          <label class="login-field-label"><span style="color:var(--gold)">*</span> Email</label>
          <div class="login-input-wrapper">
            <i class="ti ti-mail login-input-icon"></i>
            <input type="email" id="login-email" required placeholder="suporte.dgmentoria@gmail.com" class="login-input-control" />
          </div>
        </div>

        <div class="login-field-group">
          <label class="login-field-label"><span style="color:var(--gold)">*</span> Senha</label>
          <div class="login-input-wrapper">
            <i class="ti ti-lock login-input-icon"></i>
            <input type="password" id="login-password" required placeholder="••••••••" minlength="6" class="login-input-control" />
            <button type="button" class="login-password-toggle" onclick="togglePasswordVisibility('login-password', this)" aria-label="Mostrar ou ocultar senha" title="Mostrar/ocultar senha">
              <i class="ti ti-eye"></i>
            </button>
          </div>
        </div>

        <div class="login-action-wrapper">
          <button type="submit" class="login-btn-primary" id="btn-login-submit">
            Login
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.polyfilled.js"></script>
<script src="assets/js/app.js?v=2.2.0"></script>
</body>
</html>
