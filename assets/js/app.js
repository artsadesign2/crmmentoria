function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeName(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const API = 'api';
let PILLARS = {1:'Mentalidade',2:'Comercial',3:'Posicionamento',4:'Estruturação',5:'Qualidade de Vida'};
const STATUS_LABEL = {cinza:'Não alocado',azul:'Iniciante',verde:'Engajado',amarela:'Morno',vermelha:'Atenção urgente'};
const STATUS_COLOR = {cinza:'var(--gray)',azul:'var(--blue)',verde:'var(--green)',amarela:'var(--yellow)',vermelha:'var(--red)'};
let MEMBERS_LIST = [];
let MEMBERS_BOOK_COVER = '';
let tempMBCoverBase64 = null;
let SYSTEM_LOGO = '';
let tempLogoBase64 = null;
let MEMBERS_BOOK_LOGO = '';
let tempMBLogoBase64 = null;
let BIRTHDAY_CARD_LOGO = '';
let tempCardLogoBase64 = null;
let SYSTEM_FAVICON = '';
let tempFaviconBase64 = null;
let GDRIVE_FOLDER_ID = '';
let GDRIVE_API_KEY = '';
let GDRIVE_CLIENT_ID = '';
let GDRIVE_CLIENT_SECRET = '';
let GDRIVE_REFRESH_TOKEN = '';
let CARD_TEMPLATE_MODEL = 'model1';
let CARD_PHOTO_ALIGN = 'top';
let currentBirthdayCardMemberId = null;

let members = [], editId = null, detailId = null, dragId = null, impCbs = [];
let currentCoverBase64 = null;

// ── Navegação Nativa por Páginas (.php) ───────────
function navigate(view) {
  const validViews = ['dashboard', 'kanban', 'financial', 'events', 'settings', 'wiki', 'academy'];
  if (!validViews.includes(view)) view = 'dashboard';

  const targetPage = view + '.php';
  if (window.location.pathname.endsWith(targetPage) || window.location.pathname.endsWith('/' + view)) {
    return;
  }
  window.location.href = targetPage;
}

function toggleSidebarCollapse() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
    const collapseIcon = document.getElementById('collapse-icon');
    if (collapseIcon) {
      if (sidebar.classList.contains('collapsed')) {
        collapseIcon.className = 'ti ti-chevron-right';
      } else {
        collapseIcon.className = 'ti ti-chevron-left';
      }
    }
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  }
}

// ── Lógica de Dashboard de Métricas ─────────────────────────
async function renderDashboard() {
  try {
    const stats = await req('/dashboard.php');
    
    // Set metrics card numbers
    document.getElementById('dash-m-total').textContent = stats.total || 0;
    document.getElementById('dash-g-done').textContent = stats.goals_done || 0;
    document.getElementById('dash-m-milestones').textContent = stats.milestones_total || 0;
    document.getElementById('dash-m-urgent').textContent = stats.vermelha || 0;

    renderDashboardChart(stats);

    // Renders the status progress distribution
    const distContainer = document.getElementById('dash-status-dist');
    const colorsList = ['cinza', 'azul', 'verde', 'amarela', 'vermelha'];
    
    distContainer.innerHTML = colorsList.map(statusKey => {
      const count = stats[statusKey] || 0;
      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
      const label = STATUS_LABEL[statusKey];
      const color = STATUS_COLOR[statusKey];
      
      return `
        <div class="status-progress-item">
          <div class="spi-meta">
            <span class="spi-label"><span class="dot" style="background:${color}; color:${color}"></span> ${label}</span>
            <span class="spi-value">${count} (${pct}%)</span>
          </div>
          <div class="spi-bar-bg">
            <div class="spi-bar-fill" style="width: ${pct}%; background: ${color}"></div>
          </div>
        </div>
      `;
    }).join('');

    // Fetch recent status history from API for the activity list
    const recentActivityContainer = document.getElementById('dash-recent-activity');
    recentActivityContainer.innerHTML = '<div class="empty">Carregando atividades...</div>';

    const sortedMembers = [...members]
      .filter(m => m.last_contact)
      .sort((a, b) => new Date(b.last_contact) - new Date(a.last_contact))
      .slice(0, 5);

    if (!sortedMembers.length) {
      recentActivityContainer.innerHTML = '<div class="empty">Nenhuma atividade recente registrada.</div>';
    } else {
      recentActivityContainer.innerHTML = sortedMembers.map(m => `
        <div class="activity-item">
          <div class="act-meta">
            <span>${m.name}</span>
            <span>Último Contato: ${fmtDate(m.last_contact)}</span>
          </div>
          <div class="act-text">
            Membro com especialidade <strong style="color:var(--gold)">${escapeHtml(m.specialty || 'Não informada')}</strong> está na coluna <span style="color:${STATUS_COLOR[m.status]}">${STATUS_LABEL[m.status]}</span>.
            ${m.notes ? `<div style="font-style:italic; opacity:0.8; margin-top:4px">"${escapeHtml(m.notes.slice(0, 90))}"</div>` : ''}
          </div>
        </div>
      `).join('');
    }

    // ── Birthday Lists ───────────────────────────────────────
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();
    
    let nextMonth = currentMonth + 1;
    if (nextMonth > 12) nextMonth = 1;

    let nextMonth2 = nextMonth + 1;
    if (nextMonth2 > 12) nextMonth2 = 1;
    
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    document.getElementById('birthdays-current-month-name').textContent = monthNames[currentMonth - 1];
    document.getElementById('birthdays-next-month-name').textContent = monthNames[nextMonth - 1];
    document.getElementById('birthdays-next2-month-name').textContent = monthNames[nextMonth2 - 1];
    
    const currentMonthBirthdays = [];
    const nextMonthBirthdays = [];
    const nextMonth2Birthdays = [];
    
    members.forEach(m => {
      if (m.birthdate) {
        const parts = m.birthdate.split('-');
        if (parts.length === 3) {
          const bMonth = parseInt(parts[1], 10);
          const bDay = parseInt(parts[2], 10);
          
          if (bMonth === currentMonth) {
            // Incluir todos os aniversariantes do mês atual, independentemente do dia ter passado
            currentMonthBirthdays.push({ member: m, day: bDay });
          } else if (bMonth === nextMonth) {
            nextMonthBirthdays.push({ member: m, day: bDay });
          } else if (bMonth === nextMonth2) {
            nextMonth2Birthdays.push({ member: m, day: bDay });
          }
        }
      }
    });
    
    currentMonthBirthdays.sort((a, b) => a.day - b.day);
    nextMonthBirthdays.sort((a, b) => a.day - b.day);
    nextMonth2Birthdays.sort((a, b) => a.day - b.day);
    
    const currentContainer = document.getElementById('dash-birthdays-current');
    const nextContainer = document.getElementById('dash-birthdays-next');
    const next2Container = document.getElementById('dash-birthdays-next2');
    
    const renderBirthdayList = (list, isCurrent) => {
      if (!list.length) {
        return '<div class="empty" style="padding:16px;">Nenhum aniversariante.</div>';
      }
      return list.map(item => {
        const m = item.member;
        const day = item.day;
        const isToday = isCurrent && day === currentDay;
        const hasPassed = isCurrent && day < currentDay;
        const dayStr = `Dia ${String(day).padStart(2, '0')}`;
        
        let cardStyle = '';
        if (isToday) {
          cardStyle = 'border: 1px solid rgba(223, 178, 108, 0.5); box-shadow: 0 0 10px rgba(223, 178, 108, 0.15); background: linear-gradient(135deg, var(--bg2) 0%, rgba(223, 178, 108, 0.04) 100%) !important;';
        } else if (hasPassed) {
          cardStyle = 'opacity: 0.65;';
        }
          
        return `
          <div class="birthday-item" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg3); border-radius:8px; margin-bottom:8px; border:1px solid var(--border); ${cardStyle}">
            <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1; margin-right:10px;">
              <div class="ava" style="width:28px; height:28px; font-size:11px; line-height:28px; flex-shrink:0;">${ini(m.name)}</div>
              <div style="min-width:0; flex:1;">
                <div style="font-size:13px; font-weight:500; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">${escapeHtml(m.name)}</div>
                <div style="font-size:11px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">${escapeHtml(m.specialty || 'Membro')}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
              <div style="text-align:right;">
                <span style="font-size:12px; font-weight:600; color:${hasPassed ? 'var(--muted)' : 'var(--gold)'};">${dayStr}</span>
                ${isToday ? `<span style="display:block; font-size:9px; color:var(--green); font-weight:700; margin-top:2px;">HOJE! 🎂</span>` : ''}
              </div>
              ${!hasPassed ? `
                <button class="btn" style="padding:4px 8px; font-size:11px; height:24px; min-width:unset; background:rgba(223,178,108,0.1); border-color:var(--gold); color:var(--gold); display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer;" title="Gerar Card de Aniversário" onclick="generateBirthdayCard('${m.id}')">
                  <i class="ti ti-cake" style="font-size:12px;"></i>
                  <span>Card</span>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    };
    
    currentContainer.innerHTML = renderBirthdayList(currentMonthBirthdays, true);
    nextContainer.innerHTML = renderBirthdayList(nextMonthBirthdays, false);
    next2Container.innerHTML = renderBirthdayList(nextMonth2Birthdays, false);
  } catch (e) {
    console.error('Erro ao renderizar Dashboard:', e);
  }
}

function updateFileLabel(inputId, labelId) {
  const fileInput = document.getElementById(inputId);
  const labelEl = document.getElementById(labelId);
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const sizeKb = (file.size / 1024).toFixed(1);
    labelEl.innerHTML = `<strong style="color:var(--gold);">📄 ${file.name}</strong> (${sizeKb} KB)`;
  } else if (labelEl) {
    labelEl.textContent = 'Clique para selecionar o arquivo .csv';
  }
}

// ── Lógica de Configurações ─────────────────────────
function populateSettingsForm() {
  for (let i = 1; i <= 5; i++) {
    document.getElementById('set-pillar-' + i).value = PILLARS[i] || '';
  }

  // Popular aba do Members Book (se existir no DOM)
  const preview = document.getElementById('settings-mb-cover-preview');
  const removeBtn = document.getElementById('settings-mb-btn-remove-cover');
  const placeholder = document.getElementById('settings-mb-cover-placeholder');
  
  tempMBCoverBase64 = null; // Reset do upload temporário
  
  if (preview && removeBtn && placeholder) {
    if (MEMBERS_BOOK_COVER) {
      preview.src = MEMBERS_BOOK_COVER + '?t=' + new Date().getTime();
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      removeBtn.style.display = 'inline-flex';
    } else {
      preview.src = '';
      preview.style.display = 'none';
      placeholder.style.display = 'flex';
      removeBtn.style.display = 'none';
    }
  }

  // Popular logotipo do sistema
  const logoPreview = document.getElementById('settings-logo-preview');
  const logoPlaceholder = document.getElementById('settings-logo-placeholder');
  const logoRemoveBtn = document.getElementById('settings-btn-remove-logo');
  
  tempLogoBase64 = null;
  
  if (SYSTEM_LOGO) {
    logoPreview.src = SYSTEM_LOGO + '?t=' + new Date().getTime();
    logoPreview.style.display = 'block';
    logoPlaceholder.style.display = 'none';
    logoRemoveBtn.style.display = 'inline-flex';
  } else {
    logoPreview.src = '';
    logoPreview.style.display = 'none';
    logoPlaceholder.style.display = 'block';
    logoRemoveBtn.style.display = 'none';
  }

  // Popular logotipo do Members Book
  const mbLogoPreview = document.getElementById('settings-mb-logo-preview');
  const mbLogoPlaceholder = document.getElementById('settings-mb-logo-placeholder');
  const mbLogoRemoveBtn = document.getElementById('settings-btn-remove-mb-logo');
  
  tempMBLogoBase64 = null;
  
  if (MEMBERS_BOOK_LOGO) {
    mbLogoPreview.src = MEMBERS_BOOK_LOGO + '?t=' + new Date().getTime();
    mbLogoPreview.style.display = 'block';
    mbLogoPlaceholder.style.display = 'none';
    mbLogoRemoveBtn.style.display = 'inline-flex';
  } else {
    mbLogoPreview.src = '';
    mbLogoPreview.style.display = 'none';
    mbLogoPlaceholder.style.display = 'block';
    mbLogoRemoveBtn.style.display = 'none';
  }

  // Popular logotipo do Card de Aniversário
  const cardLogoPreview = document.getElementById('settings-card-logo-preview');
  const cardLogoPlaceholder = document.getElementById('settings-card-logo-placeholder');
  const cardLogoRemoveBtn = document.getElementById('settings-btn-remove-card-logo');
  
  tempCardLogoBase64 = null;
  
  if (BIRTHDAY_CARD_LOGO) {
    if (cardLogoPreview) { cardLogoPreview.src = BIRTHDAY_CARD_LOGO + '?t=' + new Date().getTime(); cardLogoPreview.style.display = 'block'; }
    if (cardLogoPlaceholder) cardLogoPlaceholder.style.display = 'none';
    if (cardLogoRemoveBtn) cardLogoRemoveBtn.style.display = 'inline-flex';
  } else {
    if (cardLogoPreview) { cardLogoPreview.src = ''; cardLogoPreview.style.display = 'none'; }
    if (cardLogoPlaceholder) cardLogoPlaceholder.style.display = 'block';
    if (cardLogoRemoveBtn) cardLogoRemoveBtn.style.display = 'none';
  }

  // Popular Favicon do Sistema
  const faviconPreview = document.getElementById('settings-favicon-preview');
  const faviconPlaceholder = document.getElementById('settings-favicon-placeholder');
  const faviconRemoveBtn = document.getElementById('settings-btn-remove-favicon');
  
  tempFaviconBase64 = null;
  
  if (SYSTEM_FAVICON) {
    if (faviconPreview) { faviconPreview.src = SYSTEM_FAVICON + '?t=' + new Date().getTime(); faviconPreview.style.display = 'block'; }
    if (faviconPlaceholder) faviconPlaceholder.style.display = 'none';
    if (faviconRemoveBtn) faviconRemoveBtn.style.display = 'inline-flex';
  } else {
    if (faviconPreview) { faviconPreview.src = ''; faviconPreview.style.display = 'none'; }
    if (faviconPlaceholder) faviconPlaceholder.style.display = 'block';
    if (faviconRemoveBtn) faviconRemoveBtn.style.display = 'none';
  }

  // Popular campos do Google Drive
  const gFolderInput = document.getElementById('set-gdrive-folder-id');
  const gKeyInput = document.getElementById('set-gdrive-api-key');
  const gClientIdInput = document.getElementById('set-gdrive-client-id');
  const gClientSecretInput = document.getElementById('set-gdrive-client-secret');
  const gRefreshTokenInput = document.getElementById('set-gdrive-refresh-token');

  if (gFolderInput) gFolderInput.value = GDRIVE_FOLDER_ID || '';
  if (gKeyInput) gKeyInput.value = GDRIVE_API_KEY || '';
  if (gClientIdInput) gClientIdInput.value = GDRIVE_CLIENT_ID || '';
  if (gClientSecretInput) gClientSecretInput.value = GDRIVE_CLIENT_SECRET || '';
  if (gRefreshTokenInput) gRefreshTokenInput.value = GDRIVE_REFRESH_TOKEN || '';

  // Popular modelo & alinhamento do card de aniversário
  const radioModel1 = document.querySelector('input[name="set_card_template_model"][value="model1"]');
  const radioModel2 = document.querySelector('input[name="set_card_template_model"][value="model2"]');
  if (CARD_TEMPLATE_MODEL === 'model2') {
    if (radioModel2) radioModel2.checked = true;
    updateCardModelSelection('model2');
  } else {
    if (radioModel1) radioModel1.checked = true;
    updateCardModelSelection('model1');
  }

  const alignSelect = document.getElementById('set-card-photo-align');
  if (alignSelect) alignSelect.value = CARD_PHOTO_ALIGN || 'top';
}

async function testGoogleDriveConnection() {
  try {
    const btn = document.getElementById('btn-test-gdrive-conn');
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="ti ti-loader animate-spin" style="color:#4285F4"></i> Testando...`;
    }

    const folderId = (document.getElementById('set-gdrive-folder-id')?.value || GDRIVE_FOLDER_ID || '').trim();
    const apiKey = (document.getElementById('set-gdrive-api-key')?.value || GDRIVE_API_KEY || '').trim();
    const clientId = (document.getElementById('set-gdrive-client-id')?.value || GDRIVE_CLIENT_ID || '').trim();
    const clientSecret = (document.getElementById('set-gdrive-client-secret')?.value || GDRIVE_CLIENT_SECRET || '').trim();
    const refreshToken = (document.getElementById('set-gdrive-refresh-token')?.value || GDRIVE_REFRESH_TOKEN || '').trim();

    const res = await req('/export_gdrive.php', {
      method: 'POST',
      body: {
        action: 'test_connection',
        folder_id: folderId,
        access_token: apiKey,
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      }
    });

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origText;
    }

    if (res.success) {
      toast(`🟢 ${res.message} (Pasta: ${res.folder_name || 'Conectada'})`);
    } else {
      toast(`🔴 ${res.message}`, false);
    }
  } catch (err) {
    console.error("Erro ao testar conexão com Google Drive:", err);
    toast("Erro ao testar conexão: " + err.message, false);
    const btn = document.getElementById('btn-test-gdrive-conn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ti ti-plug" style="color:#4285F4;"></i> Testar Conexão com Google Drive`;
    }
  }
}

async function saveSettings() {
  const newPillars = {};
  for (let i = 1; i <= 5; i++) {
    const val = document.getElementById('set-pillar-' + i).value.trim();
    if (!val) {
      toast('Por favor, defina o nome de todos os 5 pilares.', false);
      return;
    }
    newPillars[i] = val;
  }

  const gdriveFolderId = document.getElementById('set-gdrive-folder-id')?.value.trim() || '';
  const gdriveApiKey = document.getElementById('set-gdrive-api-key')?.value.trim() || '';
  const gdriveClientId = document.getElementById('set-gdrive-client-id')?.value.trim() || '';
  const gdriveClientSecret = document.getElementById('set-gdrive-client-secret')?.value.trim() || '';
  const gdriveRefreshToken = document.getElementById('set-gdrive-refresh-token')?.value.trim() || '';

  const payload = {
    pillars: newPillars,
    gdrive_folder_id: gdriveFolderId,
    gdrive_api_key: gdriveApiKey,
    gdrive_client_id: gdriveClientId,
    gdrive_client_secret: gdriveClientSecret,
    gdrive_refresh_token: gdriveRefreshToken
  };

  if (tempMBCoverBase64 !== null) {
    payload.members_book_cover = tempMBCoverBase64;
  }

  if (tempLogoBase64 !== null) {
    payload.system_logo = tempLogoBase64;
  }

  if (tempMBLogoBase64 !== null) {
    payload.members_book_logo = tempMBLogoBase64;
  }

  if (tempCardLogoBase64 !== null) {
    payload.birthday_card_logo = tempCardLogoBase64;
  }

  if (tempFaviconBase64 !== null) {
    payload.system_favicon = tempFaviconBase64;
  }

  try {
    await req('/settings.php', {
      method: 'POST',
      body: payload
    });

    GDRIVE_FOLDER_ID = gdriveFolderId;
    GDRIVE_API_KEY = gdriveApiKey;
    GDRIVE_CLIENT_ID = gdriveClientId;
    GDRIVE_CLIENT_SECRET = gdriveClientSecret;
    GDRIVE_REFRESH_TOKEN = gdriveRefreshToken;

    PILLARS = newPillars;
    
    if (tempMBCoverBase64 !== null) {
      MEMBERS_BOOK_COVER = tempMBCoverBase64 === '' ? '' : 'api/cover_background.webp';
      tempMBCoverBase64 = null;
    }

    if (tempLogoBase64 !== null) {
      if (tempLogoBase64 === '') {
        SYSTEM_LOGO = '';
      } else {
        const isSvg = tempLogoBase64.startsWith('data:image/svg+xml');
        SYSTEM_LOGO = isSvg ? 'api/system_logo.svg' : 'api/system_logo.webp';
      }
      tempLogoBase64 = null;
      updateSystemLogo();
    }

    if (tempMBLogoBase64 !== null) {
      if (tempMBLogoBase64 === '') {
        MEMBERS_BOOK_LOGO = '';
      } else {
        const isSvg = tempMBLogoBase64.startsWith('data:image/svg+xml');
        MEMBERS_BOOK_LOGO = isSvg ? 'api/members_book_logo.svg' : 'api/members_book_logo.webp';
      }
      tempMBLogoBase64 = null;
    }

    if (tempCardLogoBase64 !== null) {
      if (tempCardLogoBase64 === '') {
        BIRTHDAY_CARD_LOGO = '';
      } else {
        const isSvg = tempCardLogoBase64.startsWith('data:image/svg+xml');
        BIRTHDAY_CARD_LOGO = isSvg ? 'api/birthday_card_logo.svg' : 'api/birthday_card_logo.webp';
      }
      tempCardLogoBase64 = null;
    }

    if (tempFaviconBase64 !== null) {
      if (tempFaviconBase64 === '') {
        SYSTEM_FAVICON = '';
      } else {
        const isIco = tempFaviconBase64.includes('x-icon') || tempFaviconBase64.includes('vnd.microsoft.icon') || tempFaviconBase64.includes('ico');
        SYSTEM_FAVICON = isIco ? 'api/favicon.ico' : 'api/favicon.webp';
      }
      tempFaviconBase64 = null;
      updateAppFavicon();
    }
    
    // Update dropdown options
    updatePillarsUI();

    toast('Configurações salvas com sucesso!');
  } catch(e) {
    toast('Erro ao salvar: ' + e.message, false);
  }
}

function updatePillarsUI() {
  const optionsHtml = Object.keys(PILLARS).map(k => `<option value="${k}">${k} — ${PILLARS[k]}</option>`).join('');
  
  const gPillar = document.getElementById('g-pillar');
  if (gPillar) gPillar.innerHTML = optionsHtml;
  
  const mPillar = document.getElementById('m-pillar');
  if (mPillar) mPillar.innerHTML = optionsHtml;
}

// ── Funções de Importação de CSV ────────────────────────
let tempCSVImportData = null;

function normalizeNameJS(name) {
  if (!name) return "";
  let norm = name.toLowerCase();
  norm = norm.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos
  norm = norm.replace(/[^a-z0-9\s]/g, " ");
  norm = norm.replace(/\s+/g, " ").trim();
  return norm;
}

function normalizeNameCaseJS(name) {
  if (!name) return "";
  const words = name.trim().replace(/\s+/g, ' ').split(' ');
  const lowerExceptions = ['de', 'di', 'da', 'do', 'dos', 'das', 'e', 'la', 'lo'];
  const capitalizedWords = [];
  words.forEach((w, idx) => {
    const wLower = w.toLowerCase();
    if (lowerExceptions.includes(wLower) && idx > 0 && idx < words.length - 1) {
      capitalizedWords.push(wLower);
    } else {
      capitalizedWords.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }
  });
  return capitalizedWords.join(' ');
}

function normalizePhoneJS(phone) {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 10) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone.trim();
}

function normalizeCpfJS(cpf) {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf.trim();
}

function normalizeCnpjJS(cnpj) {
  if (!cnpj) return "";
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return cnpj.trim();
}

function normalizeInstagramJS(instagram) {
  if (!instagram) return "";
  let handle = instagram.trim();
  handle = handle.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '');
  handle = handle.replace(/\/$/, '');
  if (handle && !handle.startsWith('@')) {
    handle = '@' + handle;
  }
  return handle;
}

function normalizeMaritalStatusJS(status) {
  if (!status) return "";
  const s = status.trim().toLowerCase();
  if (s.includes('casado')) return 'Casado';
  if (s.includes('solteiro')) return 'Solteiro';
  if (s.includes('divorciado')) return 'Divorciado';
  if (s.includes('viúvo') || s.includes('viuvo')) return 'Viúvo';
  if (s.includes('união estável') || s.includes('uniao estavel')) return 'União Estável';
  return status.trim().charAt(0).toUpperCase() + status.trim().slice(1).toLowerCase();
}

function normalizeRegisterPjJS(val) {
  if (!val) return "";
  const v = val.trim().toLowerCase();
  if (v.includes('sim')) return 'Sim';
  if (v.includes('não') || v.includes('nao') || v.includes('necessário') || v.includes('necessario')) return 'Não';
  return val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase();
}

function normalizeCityStateJS(val) {
  if (!val) return "";
  val = val.replace(/\s+/g, ' ').trim();
  
  const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
                  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
                  
  const stateRegex = states.join('|');
  const regex = new RegExp('\\b([A-Za-zÀ-ÿ\\s]+?)\\s*[-\\/,;\\s]\\s*\\b(' + stateRegex + ')\\b', 'i');
  
  const match = val.match(regex);
  if (match) {
    const city = normalizeNameCaseJS(match[1].trim());
    const state = match[2].toUpperCase().trim();
    return `${city}/${state}`;
  } else {
    return normalizeNameCaseJS(val);
  }
}

function normalizeMemberUpdatesJS(item) {
  if (item.name) item.name = normalizeNameCaseJS(item.name);
  if (item.email) item.email = item.email.toLowerCase().trim();
  if (item.phone) item.phone = normalizePhoneJS(item.phone);
  if (item.cpf) item.cpf = normalizeCpfJS(item.cpf);
  if (item.cnpj) item.cnpj = normalizeCnpjJS(item.cnpj);
  if (item.instagram) item.instagram = normalizeInstagramJS(item.instagram);
  if (item.marital_status) item.marital_status = normalizeMaritalStatusJS(item.marital_status);
  if (item.register_pj) item.register_pj = normalizeRegisterPjJS(item.register_pj);
  if (item.birthplace) item.birthplace = normalizeCityStateJS(item.birthplace);
  if (item.residence) item.residence = normalizeCityStateJS(item.residence);
  return item;
}

function isNameMatchJS(dbName, csvName) {
  const dbNorm = normalizeNameJS(dbName);
  const csvNorm = normalizeNameJS(csvName);
  
  if (dbNorm === csvNorm) return true;
  if (dbNorm && csvNorm) {
    if (csvNorm.includes(dbNorm) || dbNorm.includes(csvNorm)) return true;
  }
  
  const dbWords = dbNorm.split(" ").filter(w => !["de", "da", "do", "e"].includes(w));
  const csvWords = csvNorm.split(" ").filter(w => !["de", "da", "do", "e"].includes(w));
  
  if (dbWords.length >= 2 && csvWords.length >= 2) {
    if (dbWords[0] === csvWords[0] && dbWords[dbWords.length - 1] === csvWords[csvWords.length - 1]) {
      return true;
    }
  }
  return false;
}

function parseCSV(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delim = semiCount > commaCount ? ';' : ',';

  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        row[row.length - 1] += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delim) {
        row.push('');
      } else if (c === '\r' || c === '\n') {
        lines.push(row);
        row = [''];
        if (c === '\r' && next === '\n') {
          i++;
        }
      } else {
        row[row.length - 1] += c;
      }
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }

  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (values.length === 1 && values[0] === '') continue;
    const obj = {};
    headers.forEach((header, index) => {
      let val = (values[index] !== undefined) ? values[index].trim() : '';
      val = val.replace(/^"|"$/g, '');
      obj[header] = val;
    });
    result.push(obj);
  }
  return result;
}

function parseDateJS(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  let parts = dateStr.split('/');
  if (parts.length === 3) {
    let day = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let year = parseInt(parts[2]);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return dateStr;
  }
  return null;
}

function calculateAgeJS(birthdateStr) {
  if (!birthdateStr) return '';
  const parts = birthdateStr.split('-');
  if (parts.length !== 3) return '';
  const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} anos` : '';
}

async function processCSVFiles() {
  const fileCadInput = document.getElementById('csv-file-cadastro');
  const fileDiagInput = document.getElementById('csv-file-diagnostico');
  
  if (!fileCadInput.files[0] && !fileDiagInput.files[0]) {
    toast('Selecione pelo menos um arquivo CSV (Cadastro ou Diagnóstico)', false);
    return;
  }
  
  const readText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file, 'UTF-8');
    });
  };
  
  try {
    let cadastroRows = [];
    let diagRows = [];
    
    if (fileCadInput.files[0]) {
      const text = await readText(fileCadInput.files[0]);
      cadastroRows = parseCSV(text);
    }
    if (fileDiagInput.files[0]) {
      const text = await readText(fileDiagInput.files[0]);
      diagRows = parseCSV(text);
    }
    
    // Consolidar por nome
    const csvMembers = {};
    const findMatchingKeyJS = (keys, name) => {
      for (let k of keys) {
        if (isNameMatchJS(k, name)) return k;
      }
      return null;
    };
    
    cadastroRows.forEach(r => {
      let name = r['Nome Completo'] || r['Nome Completo '] || '';
      name = name.trim();
      if (!name) return;
      const mKey = findMatchingKeyJS(Object.keys(csvMembers), name);
      if (mKey) {
        csvMembers[mKey].cadastro = r;
      } else {
        csvMembers[name] = { name: name, cadastro: r, diagnostico: null };
      }
    });
    
    diagRows.forEach(r => {
      let name = r['Nome completo'] || r['Nome completo '] || '';
      name = name.trim();
      if (!name) return;
      const mKey = findMatchingKeyJS(Object.keys(csvMembers), name);
      if (mKey) {
        csvMembers[mKey].diagnostico = r;
      } else {
        csvMembers[name] = { name: name, cadastro: null, diagnostico: r };
      }
    });
    
    const finalMembersList = [];
    
    Object.entries(csvMembers).forEach(([nameKey, data]) => {
      const item = { name: nameKey };
      
      const cad = data.cadastro;
      if (cad) {
        const getVal = (keys) => {
          for (let k of keys) {
            if (cad[k]) return cad[k].trim();
          }
          return '';
        };
        item.cpf = getVal(['CPF', 'CPF\n(Caso também deseje cadastrar-se como Pessoa Jurídica, abaixo teremos essa opção.)', 'CPF \n(Caso também deseje cadastrar-se como Pessoa Jurídica, abaixo teremos essa opção.)']);
        item.rg = getVal(['RG']);
        const bdateStr = getVal(['Data de Nascimento (dia, mês e ano)']);
        const bdate = parseDateJS(bdateStr);
        if (bdate) {
          item.birthdate = bdate;
          item.age = calculateAgeJS(bdate);
        }
        item.professional_register = getVal(['Registro Profissional (CRM, CRO, CFP)']);
        item.email = getVal(['E-mail']);
        item.phone = getVal(['Celular', 'Celular ']);
        item.residence = getVal(['Endereço Residencial\nPor favor, preencher com endereço completo (Rua, número, bairro, Cidade, Estado e CEP)', 'Endereço Residencial \nPor favor, preencher com endereço completo (Rua, número, bairro, Cidade, Estado e CEP)']);
        item.marital_status = getVal(['Estado Civil', 'Estado Civil ']);
        item.register_pj = getVal(['Deseja se cadastrar também como Pessoa Jurídica?', 'Deseja se cadastrar também como Pessoa Jurídica? ']);
        item.cnpj = getVal(['CNPJ', 'CNPJ ']);
        item.company_name = getVal(['Razão Social', 'Razão Social ']);
        item.trade_name = getVal(['Nome Fantasia', 'Nome Fantasia ']);
        item.municipal_register = getVal(['Inscrição Municipal']);
        item.commercial_address = getVal(['Endereço Comercial\nPor favor, preencher com endereço completo (Rua, número, bairro, Cidade, Estado e CEP)', 'Endereço Comercial \nPor favor, preencher com endereço completo (Rua, número, bairro, Cidade, Estado e CEP)']);
        item.nationality = getVal(['Nacionalidade', 'Nacionalidade ']);
        item.specialty = getVal(['Especialidade Profissional e área de atuação']);
        item.birthplace = getVal(['Cidade e Estado onde nasceu']);
      }
      
      const diag = data.diagnostico;
      if (diag) {
        const getValDiag = (keys) => {
          for (let k of keys) {
            if (diag[k]) return diag[k].trim();
          }
          return '';
        };
        if (!item.email) item.email = getValDiag(['Email', 'E-mail']);
        if (!item.phone) item.phone = getValDiag(['Celular/WhatsApp: (xx) xxxxx-xxxx', 'Celular']);
        if (!item.instagram) item.instagram = getValDiag(['Instagram: @', 'Instagram']);
        item.social_media = getValDiag(['Redes Sociais que possui (Informe os links de perfil em cada plataforma) - Instagram, site, LinkedIn.']);
        item.website = getValDiag(['Site']);
        const bdateStr = getValDiag(['Data de Nascimento (dia, mês e ano)']);
        const bdate = parseDateJS(bdateStr);
        if (bdate && !item.birthdate) {
          item.birthdate = bdate;
          item.age = calculateAgeJS(bdate);
        }
        if (!item.marital_status) item.marital_status = getValDiag(['Estado Civil']);
        if (!item.specialty) item.specialty = getValDiag(['Especialidade Profissional e área de atuação', 'Especialidade Profissional']);
        item.professional_experience = getValDiag(['Tempo de atuação profissional']);
        item.work_locations = getValDiag(['Quais são seus locais de trabalho (Hospital, Universidade, Consultório, Escritório etc)?']);
        item.work_description_hours = getValDiag(['Descreva de forma clara e objetiva o que você faz e qual sua carga horária de trabalho semanal (especificar por local)?']);
        item.monthly_revenue = getValDiag(['Qual é seu faturamento médio mensal (valor líquido)?', 'Qual é seu faturamento médio mensal (valor líquido)? ']);
        item.mentorship_interest = getValDiag(['O que despertou seu interesse em relação a uma mentoria voltada à mentalidade empresarial/empreendedora com enfoque comercial?']);
        item.main_goal = getValDiag(['Qual seu maior objetivo profissional hoje?', 'Qual seu maior objetivo profissional hoje? ']);
        item.biggest_challenge = getValDiag(['Qual o maior desafio para atingir este objetivo? Quais são suas maiores dificuldades como profissional?', 'Qual o maior desafio para atingir este objetivo? Quais são suas maiores dificuldades como profissional? ']);
        item.content_consumption = getValDiag(['Que tipo de conteúdo (informativo, profissional, entretenimento, influenciadores etc) você consome com regularidade? Especifique suas preferências de veículos, formatos e/ou canais (YouTube, Spotify, Instagram, TV etc).']);
        item.weekly_availability = getValDiag(['Qual sua disponibilidade de tempo semanal para se dedicar a atividades de mentoria?']);
        item.how_did_you_find_us = getValDiag(['Como você chegou até nós?']);
        item.spouse_info = getValDiag(['Nome e idade do cônjuge, companheiro(a), etc...']);
        item.children_info = getValDiag(['Possui filhos? Quantos? (Registre os nomes e idades)']);
        item.pets_info = getValDiag(['Possui pets? Quais? (Se puder, registre os nomes)']);
        item.emergency_contact = getValDiag(['Informe um contato de emergência (alguém de sua confiança: mãe, pai, cônjuge, companheiro(a), etc...informe nome e celular)']);
        item.sports_info = getValDiag(['Pratica esportes? Quais?']);
        if (!item.interests) item.interests = getValDiag(['Possui outras áreas de interesse profissional?']);
        item.hobbies = getValDiag(['Hobbies que gostaria de compartilhar com a tripulação:']);
      }
      
      normalizeMemberUpdatesJS(item);
      finalMembersList.push(item);
    });
    
    // Comparar com membros do banco carregados localmente
    let toUpdate = 0;
    let toCreate = 0;
    const tableBody = document.getElementById('csv-preview-table-body');
    tableBody.innerHTML = '';
    
    finalMembersList.forEach(item => {
      let dbMatch = null;
      for (let m of members) {
        if (isNameMatchJS(m.name, item.name)) {
          dbMatch = m;
          break;
        }
      }
      
      let actionText = '';
      let badgeStyle = '';
      if (dbMatch) {
        toUpdate++;
        actionText = 'Atualizar';
        badgeStyle = 'background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); color:#60a5fa;';
      } else {
        toCreate++;
        actionText = 'Novo';
        badgeStyle = 'background:rgba(212,163,89,0.1); border:1px solid rgba(212,163,89,0.3); color:var(--gold);';
      }
      
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      tr.innerHTML = `
        <td style="padding:10px 12px; font-weight:600">${item.name}</td>
        <td style="padding:10px 12px;"><span class="badge" style="${badgeStyle}">${actionText}</span></td>
        <td style="padding:10px 12px; color:var(--muted); font-size:12px">${item.email || item.phone || '-'}</td>
      `;
      tableBody.appendChild(tr);
    });
    
    tempCSVImportData = finalMembersList;
    document.getElementById('csv-preview-summary').innerHTML = `
      Foram detectados <strong>${finalMembersList.length}</strong> membros únicos nos CSVs.<br>
      Ação prevista: <strong style="color:#60a5fa">${toUpdate} a atualizar</strong> e <strong style="color:var(--gold)">${toCreate} novos a criar</strong>.
    `;
    
    document.getElementById('csv-preview-card').style.display = 'block';
    toast('Arquivos CSV processados com sucesso! Revise a lista abaixo.');
  } catch(err) {
    console.error(err);
    toast('Erro ao processar CSV: ' + err.message, false);
  }
}

function cancelCSVImport() {
  tempCSVImportData = null;
  document.getElementById('csv-preview-card').style.display = 'none';
  document.getElementById('csv-file-cadastro').value = '';
  document.getElementById('csv-file-diagnostico').value = '';
  toast('Importação cancelada.');
}

async function confirmCSVImport() {
  if (!tempCSVImportData || !tempCSVImportData.length) {
    toast('Nenhum dado para importar', false);
    return;
  }
  
  try {
    const res = await req('/members.php?action=csv_import', {
      method: 'POST',
      body: { members: tempCSVImportData }
    });
    
    toast(`Importação realizada! ${res.updated} atualizados, ${res.inserted} criados.`, true);
    
    // Recarregar os membros do sistema e renderizar
    const updatedMembersList = await req('/members.php');
    members = updatedMembersList;
    render();
    loadStats();
    
    // Limpar campos
    cancelCSVImport();
    
    // Redireciona para o Kanban
    navigate('kanban');
  } catch(e) {
    toast('Erro ao salvar no banco: ' + e.message, false);
  }
}

// ── Funções de Upload do Members Book Cover ──
function handleMBCoverUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Mantém alta resolução para impressão de folha A4 (300 DPI -> ~2480px)
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 2480;
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      const base64 = canvas.toDataURL('image/webp', 0.95);
      tempMBCoverBase64 = base64;
      
      const preview = document.getElementById('settings-mb-cover-preview');
      const placeholder = document.getElementById('settings-mb-cover-placeholder');
      const removeBtn = document.getElementById('settings-mb-btn-remove-cover');
      
      preview.src = base64;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      removeBtn.style.display = 'inline-flex';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeMBCover() {
  tempMBCoverBase64 = ''; // Marcado para remoção
  
  const preview = document.getElementById('settings-mb-cover-preview');
  const placeholder = document.getElementById('settings-mb-cover-placeholder');
  const removeBtn = document.getElementById('settings-mb-btn-remove-cover');
  const fileInput = document.getElementById('settings-mb-cover-file');
  
  preview.src = '';
  preview.style.display = 'none';
  placeholder.style.display = 'flex';
  removeBtn.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

// ── Funções de Upload do Logotipo do Sistema ──
function handleSystemLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    if (file.type === 'image/svg+xml') {
      const base64 = e.target.result;
      tempLogoBase64 = base64;
      showLocalLogoPreview(base64);
    } else {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 3000; // Ultra HD / 4K qualidade de impressão (300 DPI)
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL(file.type || 'image/png', 1.0);
        tempLogoBase64 = base64;
        showLocalLogoPreview(base64);
      };
      img.src = e.target.result;
    }
  };
  reader.readAsDataURL(file);
}

function showLocalLogoPreview(base64) {
  const logoPreview = document.getElementById('settings-logo-preview');
  const logoPlaceholder = document.getElementById('settings-logo-placeholder');
  const logoRemoveBtn = document.getElementById('settings-btn-remove-logo');
  
  logoPreview.src = base64;
  logoPreview.style.display = 'block';
  logoPlaceholder.style.display = 'none';
  logoRemoveBtn.style.display = 'inline-flex';
}

function removeSystemLogo() {
  tempLogoBase64 = ''; // Marcado para exclusão
  
  const logoPreview = document.getElementById('settings-logo-preview');
  const logoPlaceholder = document.getElementById('settings-logo-placeholder');
  const logoRemoveBtn = document.getElementById('settings-btn-remove-logo');
  const fileInput = document.getElementById('settings-logo-file');
  
  logoPreview.src = '';
  logoPreview.style.display = 'none';
  logoPlaceholder.style.display = 'block';
  logoRemoveBtn.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

// ── Funções de Upload do Logotipo do Members Book ──
function handleMBLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    if (file.type === 'image/svg+xml') {
      const base64 = e.target.result;
      tempMBLogoBase64 = base64;
      showLocalMBLogoPreview(base64);
    } else {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1000;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL(file.type || 'image/png');
        tempMBLogoBase64 = base64;
        showLocalMBLogoPreview(base64);
      };
      img.src = e.target.result;
    }
  };
  reader.readAsDataURL(file);
}

function showLocalMBLogoPreview(base64) {
  const logoPreview = document.getElementById('settings-mb-logo-preview');
  const logoPlaceholder = document.getElementById('settings-mb-logo-placeholder');
  const logoRemoveBtn = document.getElementById('settings-btn-remove-mb-logo');
  
  logoPreview.src = base64;
  logoPreview.style.display = 'block';
  logoPlaceholder.style.display = 'none';
  logoRemoveBtn.style.display = 'inline-flex';
}

function removeMBLogo() {
  tempMBLogoBase64 = ''; // Marcado para exclusão
  
  const logoPreview = document.getElementById('settings-mb-logo-preview');
  const logoPlaceholder = document.getElementById('settings-mb-logo-placeholder');
  const logoRemoveBtn = document.getElementById('settings-btn-remove-mb-logo');
  const fileInput = document.getElementById('settings-mb-logo-file');
  
  logoPreview.src = '';
  logoPreview.style.display = 'none';
  logoPlaceholder.style.display = 'block';
  logoPlaceholder.textContent = 'Sem Logo';
  logoRemoveBtn.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

// ── Funções de Upload do Logotipo do Card de Aniversário ──
function handleCardLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    if (file.type === 'image/svg+xml') {
      const base64 = e.target.result;
      tempCardLogoBase64 = base64;
      showLocalCardLogoPreview(base64);
    } else {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1000;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL(file.type || 'image/png');
        tempCardLogoBase64 = base64;
        showLocalCardLogoPreview(base64);
      };
      img.src = e.target.result;
    }
  };
  reader.readAsDataURL(file);
}

function showLocalCardLogoPreview(base64) {
  const logoPreview = document.getElementById('settings-card-logo-preview');
  const logoPlaceholder = document.getElementById('settings-card-logo-placeholder');
  const logoRemoveBtn = document.getElementById('settings-btn-remove-card-logo');
  
  logoPreview.src = base64;
  logoPreview.style.display = 'block';
  logoPlaceholder.style.display = 'none';
  logoRemoveBtn.style.display = 'inline-flex';
}

function removeCardLogo() {
  tempCardLogoBase64 = ''; // Marcado para exclusão
  
  const logoPreview = document.getElementById('settings-card-logo-preview');
  const logoPlaceholder = document.getElementById('settings-card-logo-placeholder');
  const logoRemoveBtn = document.getElementById('settings-btn-remove-card-logo');
  const fileInput = document.getElementById('settings-card-logo-file');
  
  if (logoPreview) { logoPreview.src = ''; logoPreview.style.display = 'none'; }
  if (logoPlaceholder) { logoPlaceholder.style.display = 'block'; logoPlaceholder.textContent = 'Sem Logo'; }
  if (logoRemoveBtn) logoRemoveBtn.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

// ── Funções do Favicon do Sistema ──
function updateAppFavicon() {
  let faviconLink = document.getElementById('app-favicon');
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.id = 'app-favicon';
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  if (SYSTEM_FAVICON) {
    faviconLink.href = SYSTEM_FAVICON + '?t=' + new Date().getTime();
  } else {
    faviconLink.href = 'api/favicon.ico';
  }
}

function handleFaviconUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    toast('O favicon deve ser menor que 2MB.', false);
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    tempFaviconBase64 = base64;
    showLocalFaviconPreview(base64);
  };
  reader.readAsDataURL(file);
}

function showLocalFaviconPreview(base64) {
  const preview = document.getElementById('settings-favicon-preview');
  const placeholder = document.getElementById('settings-favicon-placeholder');
  const removeBtn = document.getElementById('settings-btn-remove-favicon');
  
  if (preview) { preview.src = base64; preview.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';
  if (removeBtn) removeBtn.style.display = 'inline-flex';
}

function removeFavicon() {
  tempFaviconBase64 = ''; // Marcado para exclusão
  
  const preview = document.getElementById('settings-favicon-preview');
  const placeholder = document.getElementById('settings-favicon-placeholder');
  const removeBtn = document.getElementById('settings-btn-remove-favicon');
  const fileInput = document.getElementById('settings-favicon-file');
  
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

function updateSystemLogo() {
  const t = new Date().getTime();
  const logoPath = SYSTEM_LOGO || 'api/system_logo.webp';
  const logoSrc = `${logoPath}?t=${t}`;

  const loginLogo = document.getElementById('login-system-logo');
  if (loginLogo) {
    loginLogo.src = logoSrc;
  }

  const logoMarks = document.querySelectorAll('.logo-mark');
  logoMarks.forEach(el => {
    const existingImg = el.querySelector('img');
    if (existingImg) {
      existingImg.src = logoSrc;
      existingImg.style.display = 'block';
    } else {
      el.innerHTML = `<img src="${logoSrc}" alt="Logo" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.innerText='🚀';" />`;
    }
  });
}

// ── Controle de Sessão & Permissões ─────────────────────────
let currentUser = null;
let currentPermissions = [];

async function checkAuth() {
  try {
    const res = await fetch(API + '/auth.php?action=me', { credentials: 'include' });
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.user;
      currentPermissions = data.permissions;
      hideLoginUI();
      applyUserPermissionsUI();
      await load();
    } else {
      showLoginUI();
    }
  } catch (e) {
    showLoginUI();
  }
}

function showLoginUI() {
  const errContainer = document.getElementById('login-error-msg');
  if (errContainer) errContainer.style.display = 'none';
  updateSystemLogo();
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideLoginUI() {
  const errContainer = document.getElementById('login-error-msg');
  if (errContainer) errContainer.style.display = 'none';
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.style.display = 'none';
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btnEl ? btnEl.querySelector('i') : null;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.className = 'ti ti-eye-off';
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.className = 'ti ti-eye';
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login-submit');
  const errContainer = document.getElementById('login-error-msg');
  const errText = document.getElementById('login-error-text');

  if (errContainer) errContainer.style.display = 'none';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ti ti-loader spin"></i> Entrando...`;
  }

  try {
    const res = await fetch(API + '/auth.php?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Resposta do Servidor (não JSON):', responseText);
      const isStaticOrNoPhp = responseText.trim().startsWith('<?php') || 
                              res.status === 501 || 
                              responseText.includes('Unsupported method') || 
                              responseText.includes('501');
      if (isStaticOrNoPhp) {
        throw new Error('O servidor web atual não suporta PHP ou requisições POST (ex: Live Server ou servidor estático Python). Acesse via servidor PHP local (ex: php -S localhost:8000) ou hospede em servidor PHP.');
      }
      const cleanMessage = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanMessage) {
        throw new Error('Erro no servidor: ' + cleanMessage.substring(0, 150));
      }
      throw new Error('Resposta inválida do servidor.');
    }
    if (!res.ok) throw new Error(data.error || 'E-mail ou senha incorretos');

    toast('Login realizado com sucesso!');
    document.getElementById('login-form').reset();
    if (errContainer) errContainer.style.display = 'none';
    await checkAuth();
    if (currentUser && currentUser.role !== 'cliente') {
      navigate('dashboard');
    }
  } catch (err) {
    const msg = err.message || 'E-mail ou senha incorretos';
    if (errContainer && errText) {
      errText.textContent = msg;
      errContainer.style.display = 'flex';
    }
    toast(msg, false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Entrar <i class="ti ti-arrow-right"></i>`;
    }
  }
}

async function logout() {
  try {
    const res = await fetch(API + '/auth.php?action=logout', { method: 'POST', credentials: 'include' });
    if (res.ok) {
      currentUser = null;
      currentPermissions = [];
      showLoginUI();
      toast('Sessão encerrada com sucesso.');
    }
  } catch (e) {
    toast('Erro ao sair.', false);
  }
}

function hasPermission(permission) {
  if (!currentUser) return false;
  if (currentUser.role === 'master') return true;
  if (currentPermissions.includes('*')) return true;
  return currentPermissions.includes(permission);
}

function applyUserPermissionsUI() {
  if (!currentUser) return;
  
  // Remover o rótulo de texto redundante no rodapé da sidebar
  const existingLabel = document.getElementById('logged-user-label');
  if (existingLabel) {
    existingLabel.remove();
  }

  // Atualizar o card principal do usuário na sidebar (user-pill)
  const userNameEl = document.querySelector('.sidebar-footer .user-name');
  const userRoleEl = document.querySelector('.sidebar-footer .user-role');
  const userAvatarEl = document.querySelector('.sidebar-footer .avatar-sm');
  if (userNameEl) userNameEl.textContent = currentUser.name;
  if (userRoleEl) userRoleEl.textContent = currentUser.role.toUpperCase();
  if (userAvatarEl && currentUser.name) userAvatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

  // Visibilidade dos itens da sidebar
  const mDashboard = document.getElementById('menu-dashboard');
  const mKanban = document.getElementById('menu-kanban');
  const mSettings = document.getElementById('menu-settings');
  const mWiki = document.getElementById('menu-wiki');

  if (currentUser.role === 'cliente') {
    if (mDashboard) mDashboard.style.display = 'none';
    if (mKanban) mKanban.style.display = 'none';
    if (mSettings) mSettings.style.display = 'none';
    if (mWiki) mWiki.style.display = 'flex';
    navigate('wiki');
  } else {
    if (mDashboard) mDashboard.style.display = 'flex';
    if (mKanban) mKanban.style.display = 'flex';
    if (currentUser.role === 'master' || currentUser.role === 'admin') {
      if (mSettings) mSettings.style.display = 'flex';
    } else {
      if (mSettings) mSettings.style.display = 'none';
    }
    if (mWiki) mWiki.style.display = 'flex';
    const activeView = document.querySelector('.view-panel.active');
    const targetNav = activeView ? activeView.id.replace('view-', '') : 'dashboard';
    navigate(targetNav);
  }

  // Visibilidade das abas de configurações
  const sTabUsers = document.getElementById('settings-tab-btn-users');
  const sTabDepts = document.getElementById('settings-tab-btn-depts');
  
  if (currentUser.role === 'master' || currentUser.role === 'admin') {
    if (sTabUsers) sTabUsers.style.display = 'block';
    if (sTabDepts) sTabDepts.style.display = 'block';
  } else {
    if (sTabUsers) sTabUsers.style.display = 'none';
    if (sTabDepts) sTabDepts.style.display = 'none';
  }

  // Controla botão Novo na Wiki
  const btnWikiNew = document.getElementById('btn-wiki-new');
  if (btnWikiNew) {
    btnWikiNew.style.display = hasPermission('wiki_write') ? 'block' : 'none';
  }
}

// ── Abas de Configurações ───────────────────────────────────
function switchSettingsTab(tab) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.settings-scroll').forEach(v => v.style.display = 'none');

  const btn = document.getElementById('settings-tab-btn-' + tab);
  if (btn) btn.classList.add('active');

  const subview = document.getElementById('settings-subview-' + tab);
  if (subview) subview.style.display = 'flex';

  if (tab === 'users') {
    loadUsers();
  } else if (tab === 'depts') {
    loadDepartments();
  }
}

// ── Gestão de Usuários ──────────────────────────────────────
let systemUsers = [];

async function loadUsers() {
  try {
    const list = await req('/users.php');
    systemUsers = list;
    const body = document.getElementById('users-table-body');
    if (!body) return;

    if (!list.length) {
      body.innerHTML = `<tr><td colspan="4" style="padding:16px; text-align:center; color:var(--muted)">Nenhum usuário cadastrado</td></tr>`;
      return;
    }

    body.innerHTML = list.map(u => {
      const isSelf = u.id === currentUser.id;
      const isMaster = u.role === 'master';
      
      const roleBadges = {
        master: '<span class="badge" style="background:var(--glow-green); color:var(--green)">Master</span>',
        admin: '<span class="badge" style="background:var(--glow-blue); color:var(--blue)">Admin</span>',
        funcionario: '<span class="badge" style="background:var(--border); color:var(--muted)">Funcionário</span>',
        cliente: '<span class="badge" style="background:rgba(175,138,89,0.1); color:var(--gold)">Cliente</span>'
      };

      let actionBtns = '';
      if (currentUser.role === 'master' || (currentUser.role === 'admin' && !isMaster && u.role !== 'admin')) {
        const safeName = escapeHtml(u.name).replace(/'/g, "\\'");
        actionBtns += `<button class="btn btn-sm" onclick="openUserModal('${u.id}')" style="margin-right:6px" title="Editar Usuário"><i class="ti ti-pencil"></i> Editar</button>`;
        if (!isSelf) {
          actionBtns += `<button class="btn btn-sm btn-danger" onclick="confirmDeleteUser('${u.id}', '${safeName}')" title="Excluir Usuário"><i class="ti ti-trash"></i> Excluir</button>`;
        }
      }

      return `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:12px; font-weight:500; color:var(--text)">${escapeHtml(u.name)} ${isSelf ? ' <span style="font-size:11px; color:var(--muted)">(você)</span>' : ''}</td>
          <td style="padding:12px; color:var(--muted)">${escapeHtml(u.email)}</td>
          <td style="padding:12px">${roleBadges[u.role] || u.role}</td>
          <td style="padding:12px; text-align:right">${actionBtns}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    toast('Erro ao buscar usuários: ' + e.message, false);
  }
}

function openUserModal(userId = null) {
  const form = document.getElementById('user-form');
  if (form) form.reset();

  const roleSelect = document.getElementById('user-role');
  const masterOption = roleSelect ? roleSelect.querySelector('option[value="master"]') : null;
  if (currentUser && currentUser.role === 'master') {
    if (masterOption) masterOption.style.display = 'block';
  } else {
    if (masterOption) masterOption.style.display = 'none';
  }

  document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);

  if (userId) {
    document.getElementById('user-modal-title').textContent = 'Editar Usuário';
    document.getElementById('user-pass-label').textContent = 'Nova Senha (deixe em branco para manter)';
    const u = systemUsers.find(x => x.id === userId);
    if (u) {
      document.getElementById('user-id').value = u.id;
      document.getElementById('user-name').value = u.name;
      document.getElementById('user-email').value = u.email;
      document.getElementById('user-role').value = u.role;
      document.getElementById('user-password').required = false;

      // Se for funcionário e tiver overrides
      if (u.permissions && u.permissions.length) {
        document.querySelectorAll('.perm-cb').forEach(cb => {
          if (u.permissions.includes(cb.value)) cb.checked = true;
        });
      }
    }
  } else {
    document.getElementById('user-modal-title').textContent = 'Novo Usuário';
    document.getElementById('user-pass-label').textContent = 'Senha';
    document.getElementById('user-id').value = '';
    document.getElementById('user-password').required = true;
  }

  togglePermissionsForm();
  document.getElementById('mo-user').classList.add('open');
}

function togglePermissionsForm() {
  const role = document.getElementById('user-role').value;
  const section = document.getElementById('user-permissions-section');
  if (section) {
    // Apenas funcionário recebe overrides
    section.style.display = (role === 'funcionario' && currentUser.role === 'master') ? 'block' : 'none';
  }
}

async function saveUser(e) {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const name = document.getElementById('user-name').value;
  const email = document.getElementById('user-email').value;
  const password = document.getElementById('user-password').value;
  const role = document.getElementById('user-role').value;

  const payload = { name, email, role };
  if (password) payload.password = password;

  try {
    let resultUser;
    if (id) {
      resultUser = await req('/users.php?id=' + id, {
        method: 'PATCH',
        body: payload
      });
    } else {
      resultUser = await req('/users.php', {
        method: 'POST',
        body: payload
      });
    }

    // Se for funcionário, salvar permissões overrides (apenas Master)
    if (role === 'funcionario' && currentUser.role === 'master') {
      const permissions = Array.from(document.querySelectorAll('.perm-cb:checked')).map(cb => cb.value);
      await req('/users.php?action=set_permissions', {
        method: 'POST',
        body: {
          user_id: resultUser.id,
          permissions: permissions
        }
      });
    }

    toast('Usuário salvo com sucesso!');
    closeModal('mo-user');
    loadUsers();
  } catch (err) {
    toast(err.message, false);
  }
}

function confirmDeleteUser(id, name) {
  showConfirmModal({
    title: 'Excluir Usuário',
    message: `Tem certeza que deseja remover o usuário <strong style="color:var(--text);">${escapeHtml(name)}</strong> do sistema?`,
    confirmText: 'Excluir Usuário',
    onConfirm: async () => {
      try {
        await req('/users.php?id=' + id, { method: 'DELETE' });
        toast('Usuário removido com sucesso!');
        loadUsers();
      } catch (e) {
        toast('Erro ao excluir: ' + e.message, false);
      }
    }
  });
}

// ── Gestão de Departamentos ──────────────────────────────────
let departments = [];

async function loadDepartments() {
  try {
    const list = await req('/departments.php');
    departments = list;
    
    // Atualizar tabela em Configurações
    const body = document.getElementById('depts-table-body');
    if (body) {
      if (!list.length) {
        body.innerHTML = `<tr><td colspan="3" style="padding:16px; text-align:center; color:var(--muted)">Nenhum departamento cadastrado</td></tr>`;
      } else {
        body.innerHTML = list.map(d => {
          const typeBadge = d.is_fixed 
            ? '<span class="badge" style="background:var(--border); color:var(--muted)">Sistema</span>' 
            : '<span class="badge" style="background:var(--border-focus); color:var(--gold)">Dinâmico</span>';
          
          const safeName = escapeHtml(d.name).replace(/'/g, "\\'");
          
          const editBtn = `<button class="btn btn-sm" onclick="editDepartment('${d.id}', '${safeName}')" title="Editar Departamento"><i class="ti ti-pencil"></i> Editar</button>`;
          
          const delBtn = d.is_fixed 
            ? '<span style="font-size:11px; color:var(--muted); font-style:italic;">Fixo</span>' 
            : `<button class="btn btn-sm btn-danger" onclick="confirmDeleteDepartment('${d.id}', '${safeName}')" title="Excluir Departamento"><i class="ti ti-trash"></i> Excluir</button>`;

          return `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:12px; font-weight:500; color:var(--text)">${escapeHtml(d.name)}</td>
              <td style="padding:12px">${typeBadge}</td>
              <td style="padding:12px; text-align:right">
                <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                  ${editBtn}
                  ${delBtn}
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (e) {
    toast('Erro ao carregar departamentos: ' + e.message, false);
  }
}

async function saveDepartment(e) {
  e.preventDefault();
  const nameInput = document.getElementById('dept-name');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) return;
  
  try {
    await req('/departments.php', {
      method: 'POST',
      body: { name }
    });
    toast('Departamento adicionado com sucesso!');
    document.getElementById('dept-form').reset();
    loadDepartments();
  } catch (err) {
    toast(err.message, false);
  }
}

function editDepartment(id, currentName) {
  const newName = prompt('Editar nome do departamento:', currentName);
  if (!newName || !newName.trim() || newName.trim() === currentName) return;

  req(`/departments.php?id=${id}`, {
    method: 'PUT',
    body: { name: newName.trim() }
  }).then(() => {
    toast('Departamento atualizado com sucesso!');
    loadDepartments();
  }).catch(err => {
    toast(err.message, false);
  });
}

function confirmDeleteDepartment(id, name) {
  showConfirmModal({
    title: 'Excluir Departamento',
    message: `Tem certeza que deseja remover o departamento <strong style="color:var(--text);">${escapeHtml(name)}</strong>? Os mentores desse departamento não serão excluídos.`,
    confirmText: 'Excluir Departamento',
    onConfirm: async () => {
      try {
        await req(`/departments.php?id=${id}`, { method: 'DELETE' });
        toast('Departamento removido!');
        loadDepartments();
      } catch (e) {
        toast('Erro ao remover: ' + e.message, false);
      }
    }
  });
}

// ── Base de Conhecimento (Wiki) ──────────────────────────────
// Módulo gerenciado via initWikiPage no final do arquivo.

function parseMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size:16px; font-weight:600; color:var(--gold); margin:20px 0 10px;">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 style="font-size:18px; font-weight:700; color:var(--gold); margin:24px 0 12px; border-bottom:1px solid var(--border); padding-bottom:6px;">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 style="font-size:22px; font-weight:700; color:var(--text); margin:28px 0 16px;">$1</h1>');
  
  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Lists
  html = html.replace(/^\- (.*?)$/gm, '<li style="margin-left:20px; margin-bottom:4px;">$1</li>');
  html = html.replace(/(<li style=".*?">.*?<\/li>)/gs, '<ul style="margin-bottom:16px;">$1<\/ul>');
  html = html.replace(/<\/ul>\s*<ul style="margin-bottom:16px;">/g, '');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}

// ── helpers ──────────────────────────────────────────────
async function req(url, opts={}) {
  const r = await fetch(API + url, {
    headers:{'Content-Type':'application/json'},
    credentials: 'include',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (r.status === 401) {
    showLoginUI();
    throw new Error('Não autenticado');
  }
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Erro');
  return data;
}

// Stackable toast logic with 8s timer and progress bar
function toast(msg, ok=true) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const card = document.createElement('div');
  card.className = 'toast-card';
  card.style.borderLeftColor = ok ? 'var(--green)' : 'var(--red)';
  
  const icon = ok ? '<i class="ti ti-circle-check" style="color:var(--green)"></i>' : '<i class="ti ti-circle-x" style="color:var(--red)"></i>';
  card.innerHTML = `${icon} <span>${msg}</span>`;
  
  const progress = document.createElement('div');
  progress.className = 'toast-progress';
  progress.style.backgroundColor = ok ? 'var(--green)' : 'var(--red)';
  card.appendChild(progress);
  
  container.appendChild(card);
  
  // Trigger animation
  setTimeout(() => card.classList.add('show'), 10);
  
  // Auto remove after 8 seconds
  setTimeout(() => {
    card.classList.remove('show');
    setTimeout(() => card.remove(), 250);
  }, 8000);
}

function fmtDate(s) {
  if (!s) return '—';
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function today() { return new Date().toISOString().split('T')[0]; }

function ini(name) {
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0].slice(0,2).toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}

function openModal(id) { 
  const el = document.getElementById(id); 
  if (el) el.classList.add('open'); 
}
function closeModal(id) { 
  const el = document.getElementById(id); 
  if (el) el.classList.remove('open'); 
}
window.openModal = openModal;
window.closeModal = closeModal;
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); }));

async function generateBirthdayCard(id, forcedModel = null, forcedAlign = null) {
  try {
    currentBirthdayCardMemberId = id;
    let m = members.find(x => x.id === id);
    if (!m) throw new Error("Membro não encontrado");

    const modelSelect = document.getElementById('mo-card-model-select');
    const alignSelect = document.getElementById('mo-card-align-select');

    const selectedModel = forcedModel || m.card_template_model || (modelSelect ? modelSelect.value : null) || CARD_TEMPLATE_MODEL || 'model1';
    const selectedAlign = forcedAlign || m.card_photo_align || (alignSelect ? alignSelect.value : null) || CARD_PHOTO_ALIGN || 'top';

    if (modelSelect) modelSelect.value = selectedModel;
    if (alignSelect) alignSelect.value = selectedAlign;

    document.getElementById('birthday-card-loading').style.display = 'block';
    document.getElementById('birthday-card-preview-container').style.display = 'none';
    document.getElementById('mo-birthday-card').classList.add('open');
    
    if (!m.cover_image) {
      const full = await req(`/members.php?id=${id}`);
      m.cover_image = full.cover_image;
    }

    const dataUrl = await generateBirthdayCardBase64(m, selectedModel, selectedAlign);
    if (!dataUrl) throw new Error("Falha ao desenhar o card");

    const imgEl = document.getElementById('birthday-card-img');
    imgEl.src = dataUrl;
    
    document.getElementById('birthday-card-loading').style.display = 'none';
    document.getElementById('birthday-card-preview-container').style.display = 'block';

    const downloadBtn = document.getElementById('btn-download-birthday-card');
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Aniversario_${m.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  } catch (e) {
    console.error(e);
    toast("Erro ao gerar card: " + e.message, false);
    closeModal('mo-birthday-card');
  }
}

function changeBirthdayCardModel(modelValue) {
  if (currentBirthdayCardMemberId) {
    let m = members.find(x => x.id === currentBirthdayCardMemberId);
    if (m) {
      m.card_template_model = modelValue;
      req(`/members.php?id=${m.id}`, {
        method: 'PATCH',
        body: { card_template_model: modelValue }
      }).catch(e => console.warn('Erro ao salvar modelo do card no servidor:', e));
    }
    const alignSelect = document.getElementById('mo-card-align-select');
    const currentAlign = alignSelect ? alignSelect.value : (m?.card_photo_align || CARD_PHOTO_ALIGN);
    generateBirthdayCard(currentBirthdayCardMemberId, modelValue, currentAlign);
  }
}

function changeBirthdayCardAlign(alignValue) {
  if (currentBirthdayCardMemberId) {
    let m = members.find(x => x.id === currentBirthdayCardMemberId);
    if (m) {
      m.card_photo_align = alignValue;
      req(`/members.php?id=${m.id}`, {
        method: 'PATCH',
        body: { card_photo_align: alignValue }
      }).catch(e => console.warn('Erro ao salvar alinhamento da foto no servidor:', e));
    }
    const modelSelect = document.getElementById('mo-card-model-select');
    const currentModel = modelSelect ? modelSelect.value : (m?.card_template_model || CARD_TEMPLATE_MODEL);
    generateBirthdayCard(currentBirthdayCardMemberId, currentModel, alignValue);
  }
}

async function sendCurrentCardToGoogleDrive() {
  try {
    if (!currentBirthdayCardMemberId) {
      toast("Nenhum mentee selecionado para envio.", false);
      return;
    }

    const m = members.find(x => x.id === currentBirthdayCardMemberId);
    if (!m) {
      toast("Membro não encontrado.", false);
      return;
    }

    const btn = document.getElementById('btn-gdrive-single-upload');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="ti ti-loader animate-spin" style="color:#4285F4"></i> Enviando...`;
    }

    const modelSelect = document.getElementById('mo-card-model-select');
    const alignSelect = document.getElementById('mo-card-align-select');
    const selectedModel = modelSelect ? modelSelect.value : (CARD_TEMPLATE_MODEL || 'model1');
    const selectedAlign = alignSelect ? alignSelect.value : (CARD_PHOTO_ALIGN || 'top');

    const cardBase64 = await generateBirthdayCardBase64(m, selectedModel, selectedAlign);
    if (!cardBase64) {
      throw new Error("Não foi possível processar a imagem do card.");
    }

    const folderId = (document.getElementById('set-gdrive-folder-id')?.value || GDRIVE_FOLDER_ID || '').trim();
    const apiKey = (document.getElementById('set-gdrive-api-key')?.value || GDRIVE_API_KEY || '').trim();

    const res = await req('/export_gdrive.php', {
      method: 'POST',
      body: {
        action: 'upload_card',
        member_name: m.name,
        card_base64: cardBase64,
        folder_id: folderId,
        access_token: apiKey
      }
    });

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }

    if (res.gdrive_uploaded) {
      toast(`Card de ${m.name} enviado com sucesso para a pasta do Google Drive!`);
    } else if (res.gdrive_error) {
      toast(`Card salvo localmente. Google Drive: ${res.gdrive_error}`, false);
    } else if (folderId) {
      toast(`Card salvo no servidor! Verifique se a chave OAuth foi configurada nas Configurações.`);
    } else {
      toast(`Card salvo no servidor em exports/cards/${res.filename}. Cole o ID da pasta para enviar direto pro Drive!`);
    }
  } catch (err) {
    console.error("Erro ao enviar card para Google Drive:", err);
    toast("Erro ao enviar para Google Drive: " + err.message, false);
    const btn = document.getElementById('btn-gdrive-single-upload');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ti ti-brand-google-drive" style="color:#4285F4; font-size:16px;"></i> Enviar p/ Drive`;
    }
  }
}

function updateCardModelSelection(modelValue) {
  const label1 = document.getElementById('card-model-label-model1');
  const label2 = document.getElementById('card-model-label-model2');
  if (label1 && label2) {
    if (modelValue === 'model2') {
      label1.style.borderColor = 'var(--border)';
      label2.style.borderColor = 'var(--gold)';
    } else {
      label1.style.borderColor = 'var(--gold)';
      label2.style.borderColor = 'var(--border)';
    }
  }
}

async function generateBirthdayCardBase64(m, targetModel = null, targetAlign = null) {
  try {
    if (!m) return null;
    const model = targetModel || m.card_template_model || CARD_TEMPLATE_MODEL || 'model1';
    const align = targetAlign || m.card_photo_align || CARD_PHOTO_ALIGN || 'top';

    if (!m.cover_image && m.id) {
      try {
        const full = await req(`/members.php?id=${m.id}`);
        m.cover_image = full.cover_image;
      } catch (err) { /* ignore */ }
    }

    await document.fonts.ready;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Erro ao carregar imagem"));
        img.src = src;
      });
    };

    let imgPhoto = null;
    if (m.cover_image) {
      try { imgPhoto = await loadImage(m.cover_image); } catch (err) {}
    }

    let imgLogo = null;
    try {
      const cardLogoPath = BIRTHDAY_CARD_LOGO || 'api/system_logo.png';
      imgLogo = await loadImage(cardLogoPath);
    } catch (err) {
      try { imgLogo = await loadImage('api/system_logo.png'); } catch (err2) {}
    }

    const femaleNames = new Set([
      'adriana','agatha','aila','aimee','aisha','alana','alessandra','alice','aline','amanda','amelia','amélia',
      'ana','andrea','andréa','andreia','andréia','angela','ângela','angelica','angélica','anita','anna',
      'antonella','antonia','antônia','ariana','ariane','aurora',
      'bárbara','barbara','beatrice','beatriz','bella','benedita','berenice','betânia','betina','bianca','brenda','bruna',
      'cacilda','camila','carina','carla','carlota','carmem','carmen','carol','carolina','caroline','cássia','catarina',
      'cecilia','cecília','celeste','célia','celina','charlene','chloe','cidinha','cinara','cintia','cíntia',
      'clara','clarice','cláudia','claudia','cleia','cleide','cleo','cleuza','conceição','corina','cristiana','cristiane','cristina',
      'daiana','daiane','dalila','dalva','daniela','daniele','daniella','danielle','daphne','darci','débora','debora',
      'deise','delia','denise','diana','dilma','dinah','dione','dolores','dominique','dora','doris',
      'edith','eduarda','elaine','eleonora','eliete','elisa','elisabete','elisângela','elizabeth','eloísa','eloisa',
      'elsa','elvira','emanuela','emanuele','emanuelly','emily','emília','emilia','erica','érica','erika','érika',
      'esmeralda','estela','ester','eugênia','eunice','eva','evelyn',
      'fabiana','fabiane','fabiola','fabíola','fátima','fatima','fernanda','flávia','flavia','flora','francesca','francisca',
      'gabriela','gabriella','gabrielle','geisa','geovana','geovanna','gilda','giovana','giovanna','gisela',
      'gisele','giselle','glória','gloria','grace','graça','graziela','graziella',
      'heloisa','heloísa','helena','hilda',
      'iara','ilma','inês','ines','ingrid','iraci','irene','iris','íris','isabela','isabella','isabelle','isadora','isis','ivana','ivete','ivone',
      'janaína','janaina','jane','janete','jaqueline','jasmine','jennifer','jéssica','jessica','joana','josefa','josiane',
      'joyce','julia','júlia','juliana','juliane','julieta','julinha','jussara',
      'karina','karla','katia','kátia','kelly','keyla',
      'laís','lais','lara','larissa','laura','lavínia','lavinia','leandra','leda','leila','lena','letícia','leticia',
      'lídia','lidia','lígia','ligia','lilian','liliana','lívia','livia','lorena','lourdes','luana','lúcia','lucia',
      'luciana','luciane','luciene','lucila','lucimara','lucinda','luísa','luisa','luíza','luiza','lurdes',
      'madalena','magali','magda','maíra','maira','manuela','mara','marcela','márcia','marcia','marciane',
      'margarete','margarida','margot','maria','mariana','mariane','marianne','marilene','marina','marisa','marise',
      'marlene','marta','maura','mayara','meire','mel','melissa','mercedes','mércia','micaela','michele','michelle',
      'milena','mirela','mirella','miriam','mirna','mônica','monica','monique',
      'nadia','nádia','naira','nair','nara','natália','natalia','natasha','nathália','nathalia','neide','neuza','nice',
      'nicole','nina','noemi','norma','núbia','nubia',
      'odete','olga','olívia','olivia',
      'paloma','pamela','pâmela','patrícia','patricia','paula','paulina','pietra','poliana','priscila','priscilla',
      'queila',
      'rafaela','rafaella','raíssa','raissa','raquel','rebeca','rebecca','regina','rejane','renata','rita',
      'roberta','rosa','rosana','rosane','rosangela','rosângela','roselaine','roseli','rosemary','rosilene','rúbia','ruth',
      'sabrina','samanta','samantha','sandra','sara','sarah','selena','selma','sheila','shirley','silvana','silvia','sílvia',
      'simone','simoni','sônia','sonia','sophia','soraia','soraya','stéfani','stéphanie','sueli','suellen','susana','suzana',
      'taís','tais','talita','tamara','tânia','tania','tatiana','tatiane','tatiani','tereza','teresa','thaís','thais',
      'thaísa','thaisa','thalita','thayane','thayná','thayna','tina',
      'úrsula','ursula',
      'valéria','valeria','vanda','vanessa','vera','verônica','veronica','virginia','virgínia','vitória','vitoria','vivian','viviane','vivienne',
      'wanda','wendy',
      'ximena',
      'yara','yasmin',
      'zélia','zelia','zilma','zuleica','zuleika'
    ]);
    const firstName = m.name.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isFeminine = femaleNames.has(m.name.trim().split(' ')[0].toLowerCase()) || femaleNames.has(firstName);
    const generoFrase = isFeminine ? 'da nossa mentorada' : 'do nosso mentorado';
    const shortName = m.name.trim().split(' ').slice(0, 2).join(' ');

    if (model === 'model2') {
      // ════════════════════════════════════════════════════════════
      // MODELO 2: REPRODUÇÃO FIEL CONFORME GABARITO E REFERÊNCIA
      // ════════════════════════════════════════════════════════════
      
      // Fundo Azul Marinho com Gradiente Radial (Brilho Central Suave)
      const bgGrad = ctx.createRadialGradient(540, 960, 50, 540, 960, 950);
      bgGrad.addColorStop(0, '#0e324e');   // Centro Azul Marinho Iluminado
      bgGrad.addColorStop(0.55, '#071f33'); // Tom Intermediário
      bgGrad.addColorStop(1, '#040d16');   // Azul Escuro Profundo nas Bordas
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // ── 1. FAIXA SUPERIOR DOURADA (Com Inclinação de 5.71°) ───────────────
      // tan(5.71°) ≈ 0.099955 -> Variação vertical total = ~108px (54px para cada lado do centro)
      const topSlantDiff = 108;
      const topCutYCenter = 381; // 253px topo->data + 128px data->corte = 381px no centro
      const topCutYLeft = topCutYCenter + 54; // 435px
      const topCutYRight = topCutYCenter - 54; // 327px

      ctx.fillStyle = '#b38345';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(1080, 0);
      ctx.lineTo(1080, topCutYRight);
      ctx.lineTo(0, topCutYLeft);
      ctx.closePath();
      ctx.fill();

      // Data completa (ex: "18 de julho") - Posição 253px, Outfit Regular 400, 56pt (74.67px), Branca, Centralizada
      let dateTextFull = '18 de julho';
      if (m.birthdate) {
        const parts = m.birthdate.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          const monthIndex = parseInt(parts[1], 10) - 1;
          const fullMonths = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
          dateTextFull = `${day} de ${fullMonths[monthIndex]}`;
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '400 74.67px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dateTextFull, 540, 268);

      // ── 2. TEXTO DE ANIVERSÁRIO (Margem de 85px abaixo do corte inclinado, Dourado/Caramelo)
      ctx.fillStyle = '#c49653';
      ctx.font = '700 62px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Hoje é aniversário', 540, 511);
      ctx.fillText(generoFrase, 540, 579);

      // ── 3. FOTO CENTRALIZADA EM MOLDURA (Dimensões exatas: 552px x 552px, Gap 65px)
      const fw = 552;
      const fh = 552;
      const fx = (1080 - fw) / 2; // 264px centralizado
      const fy = 644; // 579 + 65px
      const fradius = 32;

      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(fx, fy, fw, fh, fradius);
      } else {
        ctx.rect(fx, fy, fw, fh);
      }
      ctx.clip();

      if (imgPhoto) {
        const iw = imgPhoto.width, ih = imgPhoto.height;
        const r = Math.max(fw / iw, fh / ih);
        const nw = iw * r, nh = ih * r;
        
        let offsetY = (fh - nh) / 2;
        if (align === 'top') {
          offsetY = (nh > fh) ? 0 : (fh - nh) / 2;
        } else if (align === 'bottom') {
          offsetY = (nh > fh) ? (fh - nh) : (fh - nh) / 2;
        }
        ctx.drawImage(imgPhoto, fx + (fw - nw) / 2, fy + offsetY, nw, nh);
      } else {
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(fx, fy, fw, fh);
      }
      ctx.restore();

      // Borda branca em volta da foto
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(fx, fy, fw, fh, fradius);
      } else {
        ctx.rect(fx, fy, fw, fh);
      }
      ctx.stroke();
      ctx.restore();

      // ── 4. TEXTOS ABAIXO DA FOTO (Gap 65px da foto, Gap 42px entre linhas)
      // "Parabéns," - Outfit Regular 400, 56pt (74.67px), Branca, Centralizado
      ctx.fillStyle = '#ffffff';
      ctx.font = '400 74.67px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Parabéns,', 540, 1311);

      // Nome do Mentorado - Outfit Bold 700, 56pt (74.67px), Dourado/Caramelo, Centralizado
      const nameY2 = 1403;
      const displayName2 = shortName + '!';
      ctx.fillStyle = '#c49653';
      ctx.font = '700 74.67px Outfit, sans-serif';
      ctx.fillText(displayName2, 540, nameY2);

      // ── 5. RODAPÉ BRANCO DIAGONAL (Inclinação 5.71°, Respiro Amplo Acima do Logo) ───
      const whiteTopYCenter = nameY2 + 70; // 1473px no centro x=540
      const whiteTopYLeft = whiteTopYCenter + 54; // 1527px at x=0
      const whiteTopYRight = whiteTopYCenter - 54; // 1419px at x=1080

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, whiteTopYLeft);
      ctx.lineTo(1080, whiteTopYRight);
      ctx.lineTo(1080, 1920);
      ctx.lineTo(0, 1920);
      ctx.closePath();
      ctx.fill();

      // Recorte Roxo/Violeta no Canto Inferior Direito (Inclinação 72.74°)
      ctx.fillStyle = '#4a2e70';
      ctx.beginPath();
      ctx.moveTo(856, 1920);
      ctx.lineTo(1080, 1200);
      ctx.lineTo(1080, 1920);
      ctx.closePath();
      ctx.fill();

      // ── 6. LOGOTIPO NO RODAPÉ BRANCO (Margem esquerda 125px, Margem inferior 160px)
      const logoLeftMargin = 125;
      const logoBottomMargin = 160;

      if (imgLogo) {
        const logoTargetWidth = 532;
        const logoAspect = (imgLogo.width && imgLogo.height) ? (imgLogo.width / imgLogo.height) : (532 / 130);
        const logoTargetHeight = logoTargetWidth / logoAspect;
        const logoY = 1920 - logoBottomMargin - logoTargetHeight; // 1630px (área limpa sobre o fundo branco)
        ctx.drawImage(imgLogo, logoLeftMargin, logoY, logoTargetWidth, logoTargetHeight);
      }

    } else {
      // ════════════════════════════════════════════════════════════
      // MODELO 1: REPRODUÇÃO FIEL CONFORME MEDIDAS E ANGULOS
      // ════════════════════════════════════════════════════════════
      if (imgPhoto) {
        const cw = canvas.width, ch = canvas.height, iw = imgPhoto.width, ih = imgPhoto.height;
        const availableHeight = 1920 - 450;
        const r = Math.max(cw / iw, availableHeight / ih);
        const nw = iw * r, nh = ih * r;
        
        let cy = 400;
        if (align === 'bottom') {
          cy = 1920 - nh;
        } else if (align === 'center') {
          cy = 400 + (availableHeight - nh) / 2;
        }
        ctx.drawImage(imgPhoto, (cw - nw) / 2, cy, nw, nh);
      } else {
        const fallbackGrad = ctx.createLinearGradient(0, 0, 0, 1920);
        fallbackGrad.addColorStop(0, '#0a2540');
        fallbackGrad.addColorStop(1, '#051220');
        ctx.fillStyle = fallbackGrad;
        ctx.fillRect(0, 0, 1080, 1920);
      }

      // Gradiente escuro no terço inferior da foto para legibilidade do texto
      const gradPhoto = ctx.createLinearGradient(0, 750, 0, 1550);
      gradPhoto.addColorStop(0, 'rgba(10, 37, 64, 0)');
      gradPhoto.addColorStop(0.5, 'rgba(10, 37, 64, 0.45)');
      gradPhoto.addColorStop(1, 'rgba(10, 37, 64, 0.90)');
      ctx.fillStyle = gradPhoto;
      ctx.fillRect(0, 750, 1080, 800);

      // ── 1. FAIXA SUPERIOR DOURADA (Com Inclinação de 5.71°) ───────────────
      // tan(5.71°) ≈ 0.099955 -> Diferença de altura em 1080px é de ~108px
      const topSlantDiff = 108; // 1080 * Math.tan(5.71 * Math.PI / 180)
      const topCutYLeft = 480;
      const topCutYRight = topCutYLeft - topSlantDiff; // 372px

      ctx.fillStyle = '#b38345';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(1080, 0);
      ctx.lineTo(1080, topCutYRight);
      ctx.lineTo(0, topCutYLeft);
      ctx.closePath();
      ctx.fill();

      // Data (ex: "26 jul") - Margem esquerda 109px, Outfit Regular 56pt (74.67px), Branca
      let dateText = '26 jul';
      if (m.birthdate) {
        const parts = m.birthdate.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          const monthIndex = parseInt(parts[1], 10) - 1;
          const monthNamesPT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
          dateText = `${day} ${monthNamesPT[monthIndex]}`;
        }
      }
      
      const dateLeftMargin = 109;
      ctx.fillStyle = '#ffffff';
      ctx.font = '400 74.67px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(dateText, dateLeftMargin, 255);

      // Texto de Aniversário ao Lado - Distância 72px após data, Margem Direita 120px, Centralizado (56pt -> 74.67px)
      const headerTextRightMargin = 120;
      const headerTextCenterX = 650; // Centro relativo do bloco do texto
      ctx.font = '700 68px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Hoje é aniversário', headerTextCenterX, 195);
      ctx.fillText(generoFrase, headerTextCenterX, 270);

      // ── 2. RODAPÉ BRANCO DIAGONAL (Inclinação de 5.71°) ───────────────────
      // Topo da área branca a 141px abaixo da linha base do nome do mentorado
      const nameY = 1358;
      const whiteTopYAtLeft = 1513; // 1499px at x=138 -> 1513px at x=0
      const whiteTopYAtRight = whiteTopYAtLeft - topSlantDiff; // 1405px at x=1080

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, whiteTopYAtLeft);
      ctx.lineTo(1080, whiteTopYAtRight);
      ctx.lineTo(1080, 1920);
      ctx.lineTo(0, 1920);
      ctx.closePath();
      ctx.fill();

      // Recorte Azul Escuro no Canto Inferior Direito (Inclinação de 76.02°)
      // tan(76.02°) ≈ 4.017 -> dy / dx = 4.017 -> dx = dy / 4.017
      ctx.fillStyle = '#082136';
      ctx.beginPath();
      ctx.moveTo(916, 1920);
      ctx.lineTo(1080, 1260);
      ctx.lineTo(1080, 1920);
      ctx.closePath();
      ctx.fill();

      // ── 3. TEXTOS SOBRE A FOTO ─────────────────────────────────────────────
      // Margem esquerda 138px
      const photoTextLeftMargin = 138;

      // "Parabéns," - Outfit Regular 56pt (74.67px), Branca
      ctx.fillStyle = '#ffffff';
      ctx.font = '400 74.67px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Parabéns,', photoTextLeftMargin, 1250);

      // Nome do Mentorado - Gap de 32px abaixo de "Parabéns,", Outfit Bold 56pt (74.67px), Dourado/Caramelo
      const displayName = shortName;
      ctx.fillStyle = '#c49653';
      ctx.font = '700 74.67px Outfit, sans-serif';
      ctx.fillText(displayName, photoTextLeftMargin, nameY);

      // ── 4. LOGOTIPO NO RODAPÉ ──────────────────────────────────────────────
      // Margem esquerda 175px, Margem inferior 230px até a base do logotipo
      const logoLeftMargin = 175;
      const logoBottomMargin = 230;

      if (imgLogo) {
        const logoTargetWidth = 532;
        const logoAspect = (imgLogo.width && imgLogo.height) ? (imgLogo.width / imgLogo.height) : (532 / 130);
        const logoTargetHeight = logoTargetWidth / logoAspect; // exatamente ~130px para proporção 532/130
        const logoY = 1920 - logoBottomMargin - logoTargetHeight; // 1560px
        ctx.drawImage(imgLogo, logoLeftMargin, logoY, logoTargetWidth, logoTargetHeight);
      }
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error("Erro ao desenhar card base64:", err);
    return null;
  }
}

function confirmExportAllBirthdayCards() {
  const modal = document.getElementById('mo-gdrive-export');
  const modalActions = document.getElementById('gdrive-modal-actions');
  const doneActions = document.getElementById('gdrive-modal-done-actions');
  const progressContainer = document.getElementById('gdrive-progress-container');
  const descEl = document.getElementById('gdrive-export-desc');
  const barEl = document.getElementById('gdrive-export-progress-bar');
  const percentEl = document.getElementById('gdrive-export-percent');
  const statusEl = document.getElementById('gdrive-export-status');

  modalActions.style.display = 'flex';
  doneActions.style.display = 'none';
  progressContainer.style.display = 'none';
  barEl.style.width = '0%';
  percentEl.textContent = '0%';
  statusEl.textContent = 'Inicializando gerador...';
  descEl.innerHTML = `Deseja gerar os cards de aniversário de alta resolução (<strong style="color:var(--gold)">1080x1920</strong>) de toda a tripulação e exportar para o <strong style="color:#4285F4">Google Drive</strong>?<br><span style="font-size:11px; opacity:0.7">O processamento será realizado em lote e salvo automaticamente.</span>`;

  modal.classList.add('open');
}

async function executeBirthdayCardsExport() {
  const folderId = (document.getElementById('set-gdrive-folder-id')?.value || GDRIVE_FOLDER_ID || '').trim();
  const apiKey = (document.getElementById('set-gdrive-api-key')?.value || GDRIVE_API_KEY || '').trim();

  const targetMembers = members.filter(m => m.name && m.name.trim());
  if (!targetMembers.length) {
    toast('Nenhum membro cadastrado para gerar cards.', false);
    closeModal('mo-gdrive-export');
    return;
  }

  const modalActions = document.getElementById('gdrive-modal-actions');
  const doneActions = document.getElementById('gdrive-modal-done-actions');
  const progressContainer = document.getElementById('gdrive-progress-container');
  const descEl = document.getElementById('gdrive-export-desc');
  const barEl = document.getElementById('gdrive-export-progress-bar');
  const statusEl = document.getElementById('gdrive-export-status');
  const percentEl = document.getElementById('gdrive-export-percent');

  // Alternar para estado de processamento
  modalActions.style.display = 'none';
  progressContainer.style.display = 'block';
  descEl.textContent = `Processando ${targetMembers.length} cards de alta resolução. Por favor, aguarde a geração e sincronização.`;

  const generatedCards = [];
  let gdriveCount = 0;
  let errorCount = 0;
  let lastGdriveError = null;

  // Limpa exportações anteriores para evitar arquivos duplicados
  try {
    await req('/export_gdrive.php', {
      method: 'POST',
      body: { action: 'clear_cards' }
    });
  } catch (e) {}

  for (let i = 0; i < targetMembers.length; i++) {
    const m = targetMembers[i];
    const progressPercent = Math.round(((i + 1) / targetMembers.length) * 100);

    statusEl.textContent = `Gerando card de ${m.name}... (${i + 1}/${targetMembers.length})`;
    barEl.style.width = `${progressPercent}%`;
    percentEl.textContent = `${progressPercent}%`;

    try {
      let memberObj = m;
      if (!memberObj.cover_image && memberObj.id) {
        try {
          const fullM = await req(`/members.php?id=${memberObj.id}`);
          if (fullM && fullM.id) memberObj = fullM;
        } catch (e) {
          console.warn(`Não foi possível carregar imagem inteira para ${m.name}`);
        }
      }
      const memberModel = memberObj.card_template_model || 'model1';
      const memberAlign = memberObj.card_photo_align || 'top';
      const cardBase64 = await generateBirthdayCardBase64(memberObj, memberModel, memberAlign);
      if (cardBase64) {
        const res = await req('/export_gdrive.php', {
          method: 'POST',
          body: {
            action: 'upload_card',
            member_name: m.name,
            card_base64: cardBase64,
            folder_id: folderId,
            access_token: apiKey
          }
        });

        if (res.gdrive_uploaded) {
          gdriveCount++;
        } else if (res.gdrive_error) {
          lastGdriveError = res.gdrive_error;
        }

        generatedCards.push({
          name: m.name,
          filename: res.filename || `Aniversario_${m.name.replace(/\s+/g, '_')}.png`,
          url: res.local_url || cardBase64
        });
      } else {
        errorCount++;
      }
    } catch (err) {
      console.warn(`Erro no card de ${m.name}:`, err);
      errorCount++;
    }
  }

  barEl.style.width = '100%';
  percentEl.textContent = '100%';
  statusEl.textContent = 'Processamento concluído!';

  if (gdriveCount > 0) {
    descEl.innerHTML = `🎉 <strong>${generatedCards.length} cards gerados com sucesso!</strong> <br/><span style="color:var(--green); font-weight:600;">${gdriveCount} cards enviados diretamente para a pasta do Google Drive.</span>`;
    toast(`${generatedCards.length} cards exportados para o Google Drive!`);
  } else if (folderId) {
    const errNotice = lastGdriveError ? `<br/><span style="color:var(--red); font-size:11.5px; margin-top:4px; display:block;">⚠️ Retorno do Google Drive: ${lastGdriveError}</span>` : '';
    descEl.innerHTML = `🎉 <strong>${generatedCards.length} cards gerados e salvos no servidor!</strong> <br/><span style="color:var(--gold);">ID da pasta (${folderId}) registrado.</span>${errNotice}`;
    toast(`${generatedCards.length} cards processados com sucesso!`);
  } else {
    descEl.innerHTML = `🎉 <strong>${generatedCards.length} cards gerados em alta definição!</strong> <br/>Os arquivos foram processados e estão prontos para download em pacote ZIP.`;
    toast(`${generatedCards.length} cards de aniversário gerados!`);
  }

  if (errorCount > 0) {
    statusEl.innerHTML = `<span style="color:var(--red);">Concluído com ${errorCount} aviso(s).</span>`;
  }

  doneActions.style.display = 'flex';
}

function downloadAllCardsZip() {
  toast("Iniciando download do pacote ZIP com todos os cards...");
  const a = document.createElement('a');
  a.href = 'api/export_gdrive.php?action=download_zip';
  a.download = 'Cards_Aniversario_Rocket_Club.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
// ── PDF Generation ────────────────────────────────────────────
function confirmGeneratePDF() {
  document.getElementById('mo-confirm-pdf').classList.add('open');
}

async function executePDFGeneration() {
  const btn = document.getElementById('btn-generate-pdf');
  const modalActions = document.getElementById('pdf-modal-actions');
  const progressContainer = document.getElementById('pdf-progress-container');
  const progressBar = document.getElementById('pdf-progress-bar');
  const progressStatus = document.getElementById('pdf-progress-status');
  const progressPercent = document.getElementById('pdf-progress-percent');
  const modalDesc = document.getElementById('pdf-modal-desc');
  
  // Ocultar botões e mostrar barra de progresso
  modalActions.style.display = 'none';
  progressContainer.style.display = 'block';
  modalDesc.innerHTML = 'Gerando o Members Book de toda a tripulação. Por favor, aguarde o processamento das fichas e fotos.';

  let progress = 0;
  let elapsed = 0;
  const targetDuration = 6500; // Tempo estimado de geração: 6.5 segundos
  const intervalTime = 100; // Atualiza a cada 100ms
  
  const updateProgress = () => {
    elapsed += intervalTime;
    // Curva de desaceleração (facilita no início, vai freando perto dos 96%)
    const ratio = Math.min(elapsed / targetDuration, 1);
    progress = Math.floor(96 * (1 - Math.pow(1 - ratio, 2)));
    
    progressBar.style.width = progress + '%';
    progressPercent.textContent = progress + '%';
    
    // Atualizar status textual dependendo do progresso
    if (progress < 20) {
      progressStatus.textContent = 'Inicializando gerador de PDF...';
    } else if (progress < 45) {
      progressStatus.textContent = 'Buscando fichas dos membros...';
    } else if (progress < 75) {
      progressStatus.textContent = 'Processando fotos de perfil...';
    } else if (progress < 90) {
      progressStatus.textContent = 'Montando índice alfabético...';
    } else {
      progressStatus.textContent = 'Finalizando compilação do arquivo...';
    }
  };
  
  const progressInterval = setInterval(updateProgress, intervalTime);
  
  try {
    const response = await fetch('api/generate_pdf.php', { credentials: 'include' });
    if (!response.ok) {
      let errorMsg = 'Erro ao gerar o Members Book.';
      try {
        const errJson = await response.json();
        errorMsg = errJson.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Sucesso: completa a barra e exibe 100%
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressStatus.textContent = 'Pronto! Iniciando download...';
    
    // Esperar 400ms para o usuário ver o progresso completo
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'Members_Book_' + new Date().getFullYear() + '.pdf';
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) { 
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    toast('Members Book gerado com sucesso!');
    closeModal('mo-confirm-pdf');
  } catch (e) {
    clearInterval(progressInterval);
    toast(e.message, false);
  } finally {
    // Restaurar estado inicial do modal após fechamento completo
    setTimeout(() => {
      progressContainer.style.display = 'none';
      modalActions.style.display = 'flex';
      progressBar.style.width = '0%';
      progressPercent.textContent = '0%';
      modalDesc.innerHTML = 'Deseja gerar o <strong style="color:var(--gold)">Members Book</strong> com a ficha completa de todos os membros ativos?<br><span style="font-size:11px;opacity:0.7">O download iniciará automaticamente. Isso pode levar alguns segundos.</span>';
    }, 500);
  }
}

// ── board ─────────────────────────────────────────────────
async function load() {
  try {
    try {
      const settings = await req('/settings.php');
      if (settings.members_list) MEMBERS_LIST = settings.members_list;
      if (settings.members_book_cover) MEMBERS_BOOK_COVER = settings.members_book_cover;
      if (settings.system_logo) {
        SYSTEM_LOGO = settings.system_logo;
        updateSystemLogo();
      }
      if (settings.members_book_logo) {
        MEMBERS_BOOK_LOGO = settings.members_book_logo;
      }
      if (settings.birthday_card_logo) {
        BIRTHDAY_CARD_LOGO = settings.birthday_card_logo;
      }
      if (settings.system_favicon) {
        SYSTEM_FAVICON = settings.system_favicon;
        updateAppFavicon();
      }
      if (settings.gdrive_folder_id) GDRIVE_FOLDER_ID = settings.gdrive_folder_id;
      if (settings.gdrive_api_key) GDRIVE_API_KEY = settings.gdrive_api_key;
      if (settings.gdrive_client_id) GDRIVE_CLIENT_ID = settings.gdrive_client_id;
      if (settings.gdrive_client_secret) GDRIVE_CLIENT_SECRET = settings.gdrive_client_secret;
      if (settings.gdrive_refresh_token) GDRIVE_REFRESH_TOKEN = settings.gdrive_refresh_token;
      if (settings.card_template_model) CARD_TEMPLATE_MODEL = settings.card_template_model;
      if (settings.card_photo_align) CARD_PHOTO_ALIGN = settings.card_photo_align;
      if (settings.pillars) {
        PILLARS = {};
        for (const k in settings.pillars) {
          PILLARS[parseInt(k)] = settings.pillars[k];
        }
      }
      updatePillarsUI();
    } catch (e) {
      console.warn("Erro ao buscar configurações do banco, utilizando padrões offline:", e);
    }

    try {
      members = await req('/members.php');
    } catch (e) {
      members = [];
    }

    render();
    loadStats();
    handlePageLoadInit();
  } catch(e) {
    console.error("Erro ao carregar página:", e);
  }
}

function handlePageLoadInit() {
  const path = window.location.pathname.toLowerCase();
  
  if (path.includes('academy.php') || path.endsWith('/academy')) {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course');
    const lessonId = urlParams.get('lesson');
    if (courseId) {
      openCoursePlayer(courseId).then(() => {
        if (lessonId) selectAcademyLesson(lessonId);
      }).catch(err => console.error(err));
    } else {
      loadAcademyCourses();
    }
  } else if (path.includes('kanban.php') || path.endsWith('/kanban')) {
    render();
  } else if (path.includes('wiki.php') || path.endsWith('/wiki')) {
    loadWiki();
  } else if (path.includes('financial.php') || path.endsWith('/financial')) {
    switchFinTab('overview');
  } else if (path.includes('events.php') || path.endsWith('/events')) {
    renderEventsGrid();
  } else if (path.includes('settings.php') || path.endsWith('/settings')) {
    populateSettingsForm();
  } else if (path.includes('dashboard.php') || path.endsWith('/dashboard')) {
    renderDashboard();
  }
}

function render(listToRender = null) {
  if (listToRender === null) {
    const searchInput = document.getElementById('kanban-search');
    const specSelect = document.getElementById('kanban-filter-specialty');
    const contactSelect = document.getElementById('kanban-filter-contact');
    const bookSelect = document.getElementById('kanban-filter-book');
    
    const hasActiveSearch = searchInput && searchInput.value.trim().length > 0;
    const hasActiveSpec = specSelect && specSelect.value.trim().length > 0;
    const hasActiveContact = contactSelect && contactSelect.value.trim().length > 0;
    const hasActiveBook = bookSelect && bookSelect.value.trim().length > 0;
    
    if (hasActiveSearch || hasActiveSpec || hasActiveContact || hasActiveBook) {
      triggerFilter();
      return;
    }
  }

  const activeList = listToRender || members;
  
  populateSpecialtyFilter();
  
  const countEl = document.getElementById('kanban-filter-count');
  if (countEl) {
    countEl.textContent = `Mostrando ${activeList.length} de ${members.length} membros`;
  }

  ['cinza','azul','verde','amarela','vermelha'].forEach(col => {
    const list = activeList.filter(m => m.status === col);
    const el = document.getElementById('cards-'+col);
    if (el) {
      el.innerHTML = list.length ? '' : '<div class="empty">Nenhum membro aqui</div>';
      list.forEach(m => el.appendChild(makeCard(m, col)));
    }
    const bEl = document.getElementById('b-'+col);
    if (bEl) bEl.textContent = list.length;
    const cnEl = document.getElementById('cn-'+col);
    if (cnEl) cnEl.textContent = list.length;
  });
  window.currentFilteredMembers = activeList;
  if (typeof renderKanbanTable === 'function' && typeof kanbanViewMode !== 'undefined' && kanbanViewMode === 'table') {
    renderKanbanTable();
  }
}

function populateSpecialtyFilter() {
  const select = document.getElementById('kanban-filter-specialty');
  if (!select) return;
  
  const currentSelection = select.value;
  const specs = [...new Set(members.map(m => m.specialty).filter(s => s && s.trim().length > 0))];
  specs.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  
  select.innerHTML = '<option value="">Todas Especialidades</option>' + 
    specs.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    
  if (specs.includes(currentSelection)) {
    select.value = currentSelection;
  } else {
    select.value = '';
  }
}

function clearSearchFilter() {
  const searchInput = document.getElementById('kanban-search');
  if (searchInput) {
    searchInput.value = '';
    triggerFilter();
  }
}

function triggerFilter() {
  const searchInput = document.getElementById('kanban-search');
  const clearBtn = document.getElementById('kanban-search-clear');
  if (clearBtn && searchInput) {
    clearBtn.style.display = searchInput.value.trim().length > 0 ? 'block' : 'none';
  }

  const specSelect = document.getElementById('kanban-filter-specialty');
  const contactSelect = document.getElementById('kanban-filter-contact');
  const bookSelect = document.getElementById('kanban-filter-book');
  
  const query = searchInput ? normalizeName(searchInput.value) : '';
  const spec = specSelect ? specSelect.value : '';
  const contact = contactSelect ? contactSelect.value : '';
  const book = bookSelect ? bookSelect.value : '';
  
  const filtered = members.filter(m => {
    // 1. Busca Textual (Nome, Especialidade, Razão Social, Nome Fantasia)
    if (query) {
      const mName = normalizeName(m.name || '');
      const mSpec = normalizeName(m.specialty || '');
      const mCompany = normalizeName(m.company_name || '');
      const mTrade = normalizeName(m.trade_name || '');
      
      const matchText = mName.includes(query) || mSpec.includes(query) || mCompany.includes(query) || mTrade.includes(query);
      if (!matchText) return false;
    }
    
    // 2. Filtro de Especialidade
    if (spec && m.specialty !== spec) {
      return false;
    }
    
    // 3. Filtro de Recência de Contato
    if (contact) {
      if (contact === 'never') {
        if (m.last_contact) return false;
      } else {
        if (!m.last_contact) return false;
        
        const lastContactDate = new Date(m.last_contact);
        const today = new Date();
        today.setHours(0,0,0,0);
        lastContactDate.setHours(0,0,0,0);
        
        const diffTime = today - lastContactDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (contact === 'delayed15' && diffDays < 15) return false;
        if (contact === 'delayed30' && diffDays < 30) return false;
        if (contact === 'recent' && diffDays > 7) return false;
      }
    }
    
    // 4. Filtro por exibição no Members Book
    if (book) {
      const isExcluded = m.exclude_from_book === true || m.exclude_from_book === 't' || m.exclude_from_book === '1' || m.exclude_from_book === 1 || m.exclude_from_book === 'true';
      if (book === 'excluded' && !isExcluded) return false;
      if (book === 'included' && isExcluded) return false;
    }
    
    return true;
  });
  
  render(filtered);
}

function isBirthdayToday(birthdateStr) {
  if (!birthdateStr) return false;
  try {
    const parts = birthdateStr.split('-');
    if (parts.length === 3) {
      const bMonth = parseInt(parts[1], 10);
      const bDay = parseInt(parts[2], 10);
      const today = new Date();
      return today.getDate() === bDay && (today.getMonth() + 1) === bMonth;
    }
  } catch (e) {}
  return false;
}

function getContactRecencyBadge(lastContactStr) {
  if (!lastContactStr) {
    return { text: 'Sem contato registrado', color: 'var(--red)', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', icon: 'ti-alert-circle' };
  }
  try {
    const lastDate = new Date(lastContactStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    lastDate.setHours(0,0,0,0);
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { text: 'Contato hoje', color: 'var(--green)', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', icon: 'ti-check' };
    } else if (diffDays <= 7) {
      return { text: `Há ${diffDays}d`, color: 'var(--blue)', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', icon: 'ti-clock' };
    } else if (diffDays <= 14) {
      return { text: `Há ${diffDays}d`, color: 'var(--yellow)', bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', icon: 'ti-clock-alert' };
    } else {
      return { text: `Atrasado (+${diffDays}d)`, color: 'var(--red)', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', icon: 'ti-alert-triangle' };
    }
  } catch (e) {
    return { text: fmtDate(lastContactStr), color: 'var(--muted)', bg: 'rgba(255, 255, 255, 0.05)', border: 'var(--border)', icon: 'ti-calendar' };
  }
}

function makeCard(m, col) {
  const isBirthday = isBirthdayToday(m.birthdate);
  const recency = getContactRecencyBadge(m.last_contact);
  const d = document.createElement('div');
  d.className = 'card' + (isBirthday ? ' birthday-today' : '');
  d.draggable = true; d.dataset.id = m.id;

  const hasPhoto = m.members_book_cover && m.members_book_cover.length > 0;
  const avatarStyle = hasPhoto 
    ? `background-image: url('${m.members_book_cover}'); background-size: cover; background-position: top center; color: transparent;`
    : '';

  d.innerHTML = `
    <div class="c-top" style="justify-content: space-between; align-items: flex-start; display: flex; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
        <div class="ava" style="${avatarStyle}">${hasPhoto ? '' : ini(m.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="c-name" style="display:flex; align-items:center; gap:6px;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; font-size:14px;">${escapeHtml(m.name)}</span>
            ${isBirthday ? `<i class="ti ti-cake" title="Gerar Card de Aniversário! 🎂" style="color:var(--gold); font-size:14px; cursor:pointer;" onclick="event.stopPropagation(); generateBirthdayCard('${m.id}')"></i>` : ''}
            ${(m.exclude_from_book && m.exclude_from_book !== 'false') ? `<i class="ti ti-book-off" title="Oculto do Members Book" style="color:var(--muted); font-size:13px; cursor:help;" onclick="event.stopPropagation()"></i>` : ''}
          </div>
          ${m.specialty ? `<div class="c-spec">${escapeHtml(m.specialty)}</div>` : ''}
        </div>
      </div>
      <button class="card-del-btn" onclick="confirmDeleteMember('${m.id}', event)" title="Excluir Membro"><i class="ti ti-trash"></i></button>
    </div>

    <!-- Recência de Contato Badge -->
    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px; padding:4px 8px; border-radius:8px; background:${recency.bg}; border:1px solid ${recency.border}; font-size:11px; font-weight:600; color:${recency.color};">
      <span style="display:flex; align-items:center; gap:4px;"><i class="ti ${recency.icon}"></i> ${recency.text}</span>
      <span style="color:var(--muted); font-weight:400; font-size:10px;">${fmtDate(m.last_contact)}</span>
    </div>

    ${m.notes ? `<div class="c-notes" style="margin-top:8px;">${escapeHtml(m.notes.slice(0,65))}${m.notes.length>65?'…':''}</div>` : ''}

    <div class="c-foot" style="margin-top:10px; display:flex; gap:8px; align-items:center;">
      <div style="display:flex; gap:6px; pointer-events:auto;">
        ${m.phone ? `<a href="https://wa.me/${m.phone.replace(/[^0-9]/g, '')}" target="_blank" title="WhatsApp" style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; background:rgba(16,185,129,0.12); color:var(--green); border:1px solid rgba(16,185,129,0.3); text-decoration:none;" onclick="event.stopPropagation()"><i class="ti ti-brand-whatsapp" style="font-size:15px;"></i></a>` : ''}
        ${m.instagram ? `<a href="https://instagram.com/${escapeHtml(m.instagram.replace('@', ''))}" target="_blank" title="Instagram" style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; background:rgba(223,178,108,0.12); color:var(--gold); border:1px solid rgba(223,178,108,0.3); text-decoration:none;" onclick="event.stopPropagation()"><i class="ti ti-brand-instagram" style="font-size:15px;"></i></a>` : ''}
      </div>
      <button class="c-btn" onclick="openDetail('${m.id}')" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; height:28px; font-size:12px;"><i class="ti ti-address-book"></i> Ver Ficha</button>
    </div>`;

  d.addEventListener('dragstart', () => { dragId = m.id; setTimeout(() => d.classList.add('dragging'), 0); });
  d.addEventListener('dragend', () => { d.classList.remove('dragging'); document.querySelectorAll('.cards').forEach(c => c.classList.remove('over')); });
  return d;
}

async function loadStats() {
  try {
    const s = await req('/dashboard.php');
    const cnContacts = document.getElementById('cn-contacts');
    if (cnContacts) cnContacts.textContent = s.contacts_this_month || 0;
    const cnCinza = document.getElementById('cn-cinza');
    if (cnCinza) cnCinza.textContent = s.cinza || 0;
    
    // Calculate Health Score
    if (s.total_members > 0) {
      const score = Math.round(((s.verde + s.azul) / s.total_members) * 100);
      const scoreEl = document.getElementById('dash-health-score-val');
      const statusEl = document.getElementById('dash-health-status');
      if (scoreEl) scoreEl.textContent = score + '%';
      if (statusEl) {
        if (score >= 70) statusEl.textContent = 'Tripulação Engajada';
        else if (score >= 40) statusEl.textContent = 'Atenção Moderada';
        else statusEl.textContent = 'Ação Necessária';
      }
    }
  } catch(e) {}
  if (typeof loadNotifications === 'function') loadNotifications();
}

// ── drag & drop ───────────────────────────────────────────
function onOver(e, col) {
  e.preventDefault();
  document.querySelectorAll('.cards').forEach(c => c.classList.remove('over'));
  document.getElementById('cards-'+col).classList.add('over');
}
function onLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget))
    e.currentTarget.querySelector('.cards').classList.remove('over');
}
async function onDrop(e, col) {
  e.preventDefault();
  document.querySelectorAll('.cards').forEach(c => c.classList.remove('over'));
  if (!dragId) return;
  const m = members.find(x => x.id === dragId);
  if (!m || m.status === col) return;
  try {
    await req(`/members.php?id=${dragId}&action=move`, {method:'POST', body:{status:col, reason:'Movido via Kanban'}});
    m.status = col; render();
    toast('Membro movido para ' + STATUS_LABEL[col]);
  } catch(e) { toast(e.message, false); }
  dragId = null;
}
// Accordion toggle helper
function toggleSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const isAlreadyOpen = target.classList.contains('open');
  document.querySelectorAll('.accordion-section').forEach(sec => {
    sec.classList.remove('open');
  });
  if (!isAlreadyOpen) {
    target.classList.add('open');
  }
}

const newFields = [
  'cpf', 'rg', 'professional_register', 'marital_status', 'register_pj', 'cnpj', 'company_name', 'trade_name',
  'municipal_register', 'commercial_address', 'nationality', 'social_media', 'website', 'professional_experience',
  'work_locations', 'work_description_hours', 'monthly_revenue', 'mentorship_interest', 'main_goal', 'biggest_challenge',
  'content_consumption', 'weekly_availability', 'how_did_you_find_us', 'spouse_info', 'children_info', 'pets_info',
  'emergency_contact', 'sports_info', 'linkedin', 'facebook', 'youtube', 'twitter'
];

// ── CRUD membro (Unified Modal) ───────────────────────────
function openAdd(col='cinza') {
  editId = null;
  detailId = null;
  setCoverPreview(null);
  const addNameEl = document.getElementById('detail-name-exec') || document.getElementById('detail-name');
  if (addNameEl) addNameEl.textContent = 'Novo Membro';
  document.getElementById('f-name').value = '';
  document.getElementById('f-spec').value = '';
  document.getElementById('f-last').value = today();
  document.getElementById('f-notes').value = '';
  document.getElementById('f-status').value = col;
  
  // Clear standard fields
  document.getElementById('f-birthdate').value = '';
  document.getElementById('f-age').value = '';
  document.getElementById('f-birthplace').value = '';
  document.getElementById('f-residence').value = '';
  document.getElementById('f-phone').value = '';
  document.getElementById('f-instagram').value = '';
  document.getElementById('f-email').value = '';
  updateExcludeBookBtnUI(false);
  
  
  // Clear new fields
  newFields.forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = '';
  });

  // Reset accordions state
  document.getElementById('sec-personal').classList.add('open');
  document.getElementById('sec-professional').classList.remove('open');
  document.getElementById('sec-social').classList.remove('open');
  document.getElementById('sec-family').classList.remove('open');
  document.getElementById('sec-mentorship').classList.remove('open');
  
  document.querySelector('.tabs').style.display = 'none';
  document.getElementById('btn-profile-del').style.display = 'none';
  document.getElementById('btn-profile-birthday-card').style.display = 'none';
  
  tab('profile');
  document.getElementById('mo-detail').classList.add('open');
  setTimeout(() => document.getElementById('f-name').focus(), 100);
}

let deleteIdPending = null;
let deleteCountdownInterval = null;
let currentConfirmHandler = null;

function closeConfirmActionModal() {
  closeModal('mo-confirm-action');
  currentConfirmHandler = null;
}

function showConfirmModal(options) {
  const {
    title = 'Confirmar Exclusão',
    message = 'Tem certeza que deseja remover este item? Esta ação não poderá ser desfeita.',
    confirmText = 'Sim, Excluir',
    onConfirm
  } = options;

  const titleEl = document.getElementById('mo-confirm-title');
  const msgEl = document.getElementById('mo-confirm-message');
  const submitBtn = document.getElementById('btn-confirm-action-submit');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = message;
  if (submitBtn) submitBtn.innerHTML = `<i class="ti ti-trash"></i> ${escapeHtml(confirmText)}`;

  currentConfirmHandler = onConfirm;
  const overlay = document.getElementById('mo-confirm-action');
  if (overlay) overlay.classList.add('open');
}

function closeConfirmModal() {
  if (deleteCountdownInterval) clearInterval(deleteCountdownInterval);
  closeModal('mo-confirm-delete');
}

function confirmDeleteMember(id, event) {
  if (event) event.stopPropagation();
  const m = members.find(x => x.id === id);
  if (!m) return;
  deleteIdPending = id;
  document.getElementById('del-member-name').textContent = m.name;
  
  const btn = document.getElementById('btn-confirm-delete-action');
  btn.disabled = false;
  let seconds = 5;
  btn.textContent = `Excluir (${seconds}s)`;
  
  if (deleteCountdownInterval) clearInterval(deleteCountdownInterval);
  
  deleteCountdownInterval = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      btn.textContent = `Excluir (${seconds}s)`;
    } else {
      clearInterval(deleteCountdownInterval);
      btn.textContent = 'Sim, excluir ficha';
    }
  }, 1000);
  
  document.getElementById('mo-confirm-delete').classList.add('open');
}

function confirmDeleteCurrentMember() {
  if (detailId) confirmDeleteMember(detailId);
}

async function executeDeleteMember() {
  if (!deleteIdPending) return;
  if (deleteCountdownInterval) clearInterval(deleteCountdownInterval);
  try {
    await req(`/members.php?id=${deleteIdPending}`, {method:'DELETE'});
    members = members.filter(m => m.id !== deleteIdPending);
    render();
    closeModal('mo-confirm-delete');
    closeModal('mo-detail');
    toast('Membro removido com sucesso!');
    loadStats();
  } catch(e) { toast(e.message, false); }
  deleteIdPending = null;
}

// Bind confirmation button action and cover uploader
document.addEventListener('DOMContentLoaded', () => {
  const delBtn = document.getElementById('btn-confirm-delete-action');
  if (delBtn) delBtn.onclick = executeDeleteMember;

  const actionSubmitBtn = document.getElementById('btn-confirm-action-submit');
  if (actionSubmitBtn) {
    actionSubmitBtn.addEventListener('click', async () => {
      if (currentConfirmHandler) {
        const handler = currentConfirmHandler;
        closeConfirmActionModal();
        await handler();
      }
    });
  }

  initCoverUploader();
});

async function saveMember() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { toast('Nome obrigatório', false); return; }
  const body = {
    name,
    specialty: document.getElementById('f-spec').value.trim() || null,
    last_contact: document.getElementById('f-last').value || null,
    notes: document.getElementById('f-notes').value.trim() || null,
    status: document.getElementById('f-status').value,
    age: document.getElementById('f-age').value.trim() || null,
    birthdate: document.getElementById('f-birthdate').value || null,
    birthplace: document.getElementById('f-birthplace').value.trim() || null,
    residence: document.getElementById('f-residence').value.trim() || null,
    phone: document.getElementById('f-phone').value.trim() || null,
    instagram: document.getElementById('f-instagram').value.trim() || null,
    email: document.getElementById('f-email').value.trim() || null,
    interests: document.getElementById('f-interests').value.trim() || null,
    hobbies: document.getElementById('f-hobbies').value.trim() || null,
    cover_image: currentCoverBase64,
    exclude_from_book: document.getElementById('f-exclude_from_book').checked
  };
  
  // Read new fields
  newFields.forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) {
      body[f] = el.value.trim() || null;
    }
  });

  try {
    if (editId) {
      const updated = await req(`/members.php?id=${editId}`, {method:'PATCH', body});
      const i = members.findIndex(m => m.id === editId);
      if (i >= 0) members[i] = updated;
      toast('Membro atualizado com sucesso!');
    } else {
      const novo = await req('/members.php', {method:'POST', body});
      members.push(novo);
      editId = novo.id;
      detailId = novo.id;
      const tabsEl = document.querySelector('.tabs');
      if (tabsEl) tabsEl.style.display = 'flex';
      const delBtn = document.getElementById('btn-profile-del');
      if (delBtn) delBtn.style.display = 'inline-flex';
      const bdayBtn = document.getElementById('btn-profile-birthday-card');
      if (bdayBtn) bdayBtn.style.display = 'inline-flex';
      toast('Membro adicionado com sucesso!');
    }
    render();
    loadStats();
  } catch(e) { toast(e.message, false); }
}

function setCoverPreview(base64) {
  currentCoverBase64 = base64;
  const avatarPreview = document.getElementById('member-exec-avatar-preview');
  const avatarIcon = document.getElementById('member-exec-avatar-icon');
  const btnRemovePhoto = document.getElementById('btn-menu-remove-photo') || document.getElementById('btn-exec-remove-photo');
  
  if (base64) {
    if (avatarPreview) {
      avatarPreview.style.backgroundImage = `url(${base64})`;
      avatarPreview.style.backgroundSize = 'cover';
      avatarPreview.style.backgroundPosition = 'center';
    }
    if (avatarIcon) avatarIcon.style.display = 'none';
    if (btnRemovePhoto) btnRemovePhoto.style.display = 'flex';
  } else {
    if (avatarPreview) {
      avatarPreview.style.backgroundImage = 'none';
    }
    if (avatarIcon) avatarIcon.style.display = 'block';
    if (btnRemovePhoto) btnRemovePhoto.style.display = 'none';
  }
}

function handleCoverFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    toast('Foto deve ter no máximo 10MB', false);
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    setCoverPreview(e.target.result);
    toast('Foto carregada (clique em Salvar Ficha para confirmar)');
  };
  reader.readAsDataURL(file);
}

function removeCover(event) {
  if (event) event.stopPropagation();
  setCoverPreview(null);
  toast('Foto removida (clique em Salvar Ficha para confirmar)');
}

function initCoverUploader() {
  const avatarWrapper = document.querySelector('.member-exec-avatar-wrapper');
  if (avatarWrapper) {
    avatarWrapper.onclick = () => {
      const input = document.getElementById('cover-file-input');
      if (input) input.click();
    };
  }
}

// ── Health Score Calculation ────────────────────────────────
function calculateMemberHealthScore(m) {
  if (!m) return 100;
  let score = 100;
  if (!m.last_contact) {
    score -= 25;
  } else {
    const diffDays = Math.floor((new Date() - new Date(m.last_contact)) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) score -= 40;
    else if (diffDays > 15) score -= 20;
  }
  if (m.status === 'vermelha') score -= 30;
  else if (m.status === 'amarela') score -= 15;
  if (score < 10) score = 10;
  return score;
}

function sendWaTemplate(tpl) {
  const menu = document.getElementById('wa-template-menu');
  if (menu) menu.style.display = 'none';

  const m = members.find(x => x.id === detailId);
  if (!m || !m.phone) {
    toast('Telefone não informado', false);
    return;
  }

  const num = m.phone.replace(/\D/g, '');
  if (!num) {
    toast('Telefone inválido', false);
    return;
  }

  const phone = num.length <= 11 ? '55' + num : num;
  const firstName = m.name.split(' ')[0];

  let msg = '';
  if (tpl === 'bday') {
    msg = `Olá ${firstName}, parabéns pelo seu aniversário! Que seu novo ciclo seja repleto de muitas conquistas, saúde e grande expansão no Rocket Club! 🚀🎂🎉`;
  } else if (tpl === 'goal') {
    msg = `Olá ${firstName}, tudo bem? Passando para acompanhar o andamento das suas metas na mentoria do Rocket Club. Como podemos te apoiar nos próximos passos? 🎯🚀`;
  } else if (tpl === 'welcome') {
    msg = `Seja muito bem-vindo(a) ao Rocket Club, ${firstName}! Estamos muito felizes em ter você conosco no nosso ecossistema de empresários de elite! 🚀🔥`;
  } else if (tpl === 'meeting') {
    msg = `Olá ${firstName}, lembrete do nosso próximo encontro de mentoria do Rocket Club! Traga suas dúvidas e metas para alinharmos estratégias. 📅🚀`;
  } else {
    msg = `Olá ${firstName}, tudo bem?`;
  }

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── detalhe ───────────────────────────────────────────────
async function openDetail(id) {
  detailId = id;
  editId = id;
  const basic = members.find(x => x.id === id);
  if (!basic) return;
  
  // Preencher imediatamente com os dados básicos já disponíveis
  setCoverPreview(null);
  const nameExec = document.getElementById('detail-name-exec');
  const specExec = document.getElementById('detail-spec-exec');
  const badgeExec = document.getElementById('detail-status-badge');
  const lastExec = document.getElementById('detail-meta-last');
  const phoneExec = document.getElementById('detail-meta-phone');
  const waBtn = document.getElementById('btn-exec-wa');
  const bdayBtn = document.getElementById('btn-exec-bday');

  if (nameExec) nameExec.textContent = basic.name;
  if (specExec) specExec.textContent = basic.specialty || 'Membro da Mentoria';
  if (badgeExec) {
    badgeExec.textContent = STATUS_LABEL[basic.status] || basic.status;
    badgeExec.style.borderColor = basic.status === 'vermelha' ? 'var(--red)' : (basic.status === 'verde' ? 'var(--green)' : 'var(--gold)');
  }

  const health = calculateMemberHealthScore(basic);
  const healthBadge = document.getElementById('detail-health-badge');
  if (healthBadge) {
    const color = health >= 80 ? 'var(--green)' : (health >= 50 ? 'var(--gold)' : 'var(--red)');
    const label = health >= 80 ? 'Excelente' : (health >= 50 ? 'Atenção' : 'Risco Churn');
    healthBadge.style.color = color;
    healthBadge.style.borderColor = color + '55';
    healthBadge.style.background = color + '15';
    healthBadge.textContent = `🟢 Health: ${health}% (${label})`;
  }

  if (lastExec) lastExec.textContent = `Último contato: ${fmtDate(basic.last_contact)}`;
  if (phoneExec) phoneExec.textContent = basic.phone || 'Telefone não informado';
  if (waBtn) waBtn.style.display = basic.phone ? 'inline-flex' : 'none';
  if (bdayBtn) bdayBtn.style.display = 'inline-flex';

  const setVal = (elementId, val) => {
    const el = document.getElementById(elementId);
    if (el) el.value = val || '';
  };

  setVal('f-name', basic.name);
  setVal('f-spec', basic.specialty);
  setVal('f-last', basic.last_contact);
  setVal('f-notes', basic.notes);
  setVal('f-status', basic.status);
  
  // Preencher outros campos se disponíveis
  setVal('f-birthdate', basic.birthdate);
  setVal('f-age', basic.age);
  setVal('f-birthplace', basic.birthplace);
  setVal('f-residence', basic.residence);
  setVal('f-phone', basic.phone);
  setVal('f-instagram', basic.instagram);
  setVal('f-email', basic.email);
  setVal('f-interests', basic.interests);
  setVal('f-hobbies', basic.hobbies);
  
  updateExcludeBookBtnUI(basic.exclude_from_book === true || basic.exclude_from_book === 't' || basic.exclude_from_book === '1' || basic.exclude_from_book === 1);

  const mapMarital = (val) => {
    if (!val) return '';
    const v = val.trim();
    if (v === 'Solteiro') return 'Solteiro(a)';
    if (v === 'Casado') return 'Casado(a)';
    if (v === 'Divorciado') return 'Divorciado(a)';
    if (v === 'Viúvo' || v === 'Viuvo') return 'Viúvo(a)';
    if (v === 'Separado') return 'Separado(a)';
    return v;
  };

  newFields.forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) {
      el.value = f === 'marital_status' ? mapMarital(basic[f]) : (basic[f] || '');
    }
  });

  // Safe accordion toggling
  ['sec-personal', 'sec-professional', 'sec-social', 'sec-family', 'sec-mentorship'].forEach((secId, idx) => {
    const sec = document.getElementById(secId);
    if (sec) {
      if (idx === 0) sec.classList.add('open');
      else sec.classList.remove('open');
    }
  });

  const cDate = document.getElementById('c-date');
  if (cDate) cDate.value = today();

  const mDate = document.getElementById('m-date');
  if (mDate) mDate.value = today();

  const tabsContainer = document.querySelector('.tabs');
  if (tabsContainer) tabsContainer.style.display = 'flex';

  const delBtn = document.getElementById('btn-profile-del');
  if (delBtn) delBtn.style.display = 'inline-flex';

  const bdayBtnProfile = document.getElementById('btn-profile-birthday-card');
  if (bdayBtnProfile) bdayBtnProfile.style.display = 'inline-flex';

  tab('profile');
  const modalDetail = document.getElementById('mo-detail');
  if (modalDetail) modalDetail.classList.add('open');

  // Carregar os dados detalhados (incluindo cover_image grande) em background
  try {
    const m = await req(`/members.php?id=${id}`);
    if (detailId !== id) return; // Se o usuário fechou ou abriu outro antes de carregar
    
    setCoverPreview(m.cover_image || null);
    const detailNameEl = document.getElementById('detail-name-exec') || document.getElementById('detail-name');
    if (detailNameEl) detailNameEl.textContent = m.name;
    
    setVal('f-name', m.name);
    setVal('f-spec', m.specialty);
    setVal('f-last', m.last_contact);
    setVal('f-notes', m.notes);
    setVal('f-status', m.status);
    
    setVal('f-birthdate', m.birthdate);
    setVal('f-age', m.age);
    setVal('f-birthplace', m.birthplace);
    setVal('f-residence', m.residence);
    setVal('f-phone', m.phone);
    setVal('f-instagram', m.instagram);
    setVal('f-email', m.email);
    setVal('f-interests', m.interests);
    setVal('f-hobbies', m.hobbies);

    updateExcludeBookBtnUI(m.exclude_from_book === true || m.exclude_from_book === 't' || m.exclude_from_book === '1' || m.exclude_from_book === 1);
    
    newFields.forEach(f => {
      const el = document.getElementById('f-' + f);
      if (el) {
        el.value = f === 'marital_status' ? mapMarital(m[f]) : (m[f] || '');
      }
    });

    const idx = members.findIndex(x => x.id === id);
    if (idx !== -1) {
      members[idx] = m;
    }
  } catch(e) {
    toast('Erro ao carregar detalhes: ' + e.message, false);
  }
}

function updateExcludeBookBtnUI(isExcluded) {
  const btn = document.getElementById('btn-toggle-exclude-book');
  const chk = document.getElementById('f-exclude_from_book');
  if (chk) chk.checked = !!isExcluded;
  
  if (!btn) return;
  if (isExcluded) {
    // Habilitado (Ocultar do book) -> COR VERMELHA
    btn.style.color = 'var(--red)';
    btn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    btn.style.background = 'rgba(239, 68, 68, 0.15)';
    btn.innerHTML = `<i class="ti ti-book-off" style="font-size:15px;"></i> Oculto do Book`;
    btn.title = 'Membro OCULTO no Members Book (PDF). Clique para disponibilizar no Book.';
  } else {
    // Desmarcado (Visível no book) -> COR DOURADA
    btn.style.color = 'var(--gold)';
    btn.style.borderColor = 'rgba(223, 178, 108, 0.3)';
    btn.style.background = 'rgba(223, 178, 108, 0.12)';
    btn.innerHTML = `<i class="ti ti-book" style="font-size:15px;"></i> No Members Book`;
    btn.title = 'Membro VISÍVEL no Members Book (PDF). Clique para ocultar do Book.';
  }
}

function toggleExcludeBook() {
  const chk = document.getElementById('f-exclude_from_book');
  const newState = chk ? !chk.checked : false;
  updateExcludeBookBtnUI(newState);
}

function tab(name) {
  const names = ['profile','contacts','goals','milestones','deals','networking','history'];
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('on', names[i]===name));
  document.querySelectorAll('.tp').forEach(p => p.classList.remove('on'));
  const tpEl = document.getElementById('tp-'+name);
  if (tpEl) tpEl.classList.add('on');

  const isProfileTab = (name === 'profile');
  const saveBtn = document.getElementById('btn-profile-save');
  const delBtn = document.getElementById('btn-profile-del');
  const bdayBtn = document.getElementById('btn-profile-birthday-card');
  if (saveBtn) saveBtn.style.display = isProfileTab ? 'inline-flex' : 'none';
  if (delBtn) delBtn.style.display = (isProfileTab && editId) ? 'inline-flex' : 'none';
  if (bdayBtn) bdayBtn.style.display = (isProfileTab && editId) ? 'inline-flex' : 'none';

  if (name==='contacts') loadContacts();
  if (name==='goals') loadGoals();
  if (name==='milestones') loadMilestones();
  if (name==='networking') loadNetworkingMatches();
  if (name==='history') loadHistory();
}

let allMemberContacts = [];

const TYPE_CONFIG = {
  message: { label: 'Mensagem / WhatsApp', icon: 'ti-brand-whatsapp', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  call: { label: 'Ligação Telefônica', icon: 'ti-phone-call', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  meeting: { label: 'Reunião Presencial/Online', icon: 'ti-users', color: '#dfb26c', bg: 'rgba(223, 178, 108, 0.12)' },
  email: { label: 'E-mail', icon: 'ti-mail', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
  other: { label: 'Outro Registro', icon: 'ti-notes', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' }
};

async function loadContacts() {
  const el = document.getElementById('contacts-list');
  if (!el) return;

  try {
    allMemberContacts = await req(`/contacts.php?member_id=${detailId}`);
    renderContactsList(allMemberContacts);
  } catch (e) {
    el.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted); font-size:12px;">Erro ao carregar histórico de abordagens</div>';
  }
}

function filterContactsList() {
  const q = (document.getElementById('c-filter-search')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('c-filter-type')?.value || '';

  const filtered = allMemberContacts.filter(c => {
    const matchType = !typeFilter || c.type === typeFilter;
    const matchQuery = !q || (c.note && c.note.toLowerCase().includes(q)) || (c.author_name && c.author_name.toLowerCase().includes(q));
    return matchType && matchQuery;
  });

  renderContactsList(filtered);
}

function renderContactsList(list) {
  const el = document.getElementById('contacts-list');
  const countEl = document.getElementById('c-count-label');
  if (!el) return;

  if (countEl) {
    countEl.textContent = `${list.length} ${list.length === 1 ? 'abordagem' : 'abordagens'}`;
  }

  if (!list.length) {
    el.innerHTML = '<div style="padding:30px; text-align:center; color:var(--muted); font-size:13px; background:var(--bg2); border-radius:8px; border:1px dashed var(--border);">Nenhuma abordagem registrada para estes filtros</div>';
    return;
  }

  el.innerHTML = list.map((c, idx) => {
    const cfg = TYPE_CONFIG[c.type] || TYPE_CONFIG.other;
    const author = c.author_name || 'Equipe Rocket';
    const hasFollowUp = c.follow_up_date && c.follow_up_date !== '0000-00-00';
    const isHero = idx === 0 && list.length === allMemberContacts.length;

    return `
      <div style="background:var(--bg2); border:1px solid ${isHero ? 'rgba(223, 178, 108, 0.4)' : 'var(--border)'}; border-radius:10px; padding:14px; position:relative; transition:all 0.2s;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:8px; background:${cfg.bg}; color:${cfg.color}; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">
              <i class="ti ${cfg.icon}"></i>
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:13px; font-weight:600; color:var(--text);">${escapeHtml(cfg.label)}</span>
                <span style="font-size:11px; color:var(--muted); background:var(--bg3); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">${fmtDate(c.contact_date)}</span>
                ${isHero ? '<span style="background:var(--gold); color:#07080c; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; text-transform:uppercase; letter-spacing:0.5px;">Última Abordagem</span>' : ''}
              </div>
              <div style="font-size:11px; color:var(--muted); margin-top:2px; display:flex; align-items:center; gap:4px;">
                <i class="ti ti-user-check" style="font-size:12px; color:var(--gold);"></i>
                <span>Registrado por <strong>${escapeHtml(author)}</strong></span>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            ${c.note ? `<button onclick="copyContactNote('${c.id}', event)" title="Copiar nota" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; font-size:14px;" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='var(--muted)'"><i class="ti ti-copy"></i></button>` : ''}
            <button onclick="deleteContact('${c.id}', event)" title="Excluir abordagem" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; font-size:14px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'"><i class="ti ti-trash"></i></button>
          </div>
        </div>

        ${c.note ? `<div style="font-size:13px; color:#e2e8f0; line-height:1.5; background:var(--bg3); padding:10px 12px; border-radius:6px; border:1px solid var(--border); margin-top:8px; white-space:pre-wrap;" id="cnote-text-${c.id}">${escapeHtml(c.note)}</div>` : ''}

        ${hasFollowUp ? `
          <div style="margin-top:10px; display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--gold); background:rgba(223, 178, 108, 0.1); border:1px solid rgba(223, 178, 108, 0.2); padding:4px 10px; border-radius:6px; font-weight:500;">
            <i class="ti ti-calendar-event"></i> Próximo Retorno: <strong>${fmtDate(c.follow_up_date)}</strong>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function copyContactNote(id, event) {
  if (event) event.stopPropagation();
  const el = document.getElementById('cnote-text-' + id);
  if (el) {
    navigator.clipboard.writeText(el.innerText).then(() => {
      toast('Nota copiada para a área de transferência!');
    }).catch(() => {
      toast('Erro ao copiar nota', false);
    });
  }
}

async function addContact() {
  const type = document.getElementById('c-type').value;
  const contact_date = document.getElementById('c-date').value || today();
  const follow_up_date = document.getElementById('c-followup').value || null;
  const note = document.getElementById('c-note').value.trim() || null;

  if (!note) {
    toast('Por favor, informe a nota ou resumo do contato', false);
    return;
  }

  const author_name = (typeof currentUser !== 'undefined' && currentUser && currentUser.name) ? currentUser.name : null;
  const body = { type, contact_date, follow_up_date, note, author_name };

  try {
    await req(`/contacts.php?member_id=${detailId}`, {method:'POST', body});
    document.getElementById('c-note').value = '';
    document.getElementById('c-followup').value = '';
    
    const m = members.find(x => x.id === detailId);
    if (m && (!m.last_contact || contact_date >= m.last_contact)) {
      m.last_contact = contact_date;
      render();
    }
    loadContacts();
    loadStats();
    toast('Abordagem registrada com sucesso!');
  } catch(e) {
    toast(e.message, false);
  }
}

async function deleteContact(id, event) {
  if (event) event.stopPropagation();
  showConfirmModal({
    title: 'Excluir Abordagem',
    message: 'Deseja realmente excluir este registro de abordagem?',
    confirmText: 'Excluir Registro',
    onConfirm: async () => {
      try {
        await req(`/contacts.php?id=${id}`, {method: 'DELETE'});
        toast('Registro de abordagem excluído');
        loadContacts();
        loadStats();
      } catch(e) { toast(e.message, false); }
    }
  });
}

let allMemberGoals = [];

const PILLAR_CONFIG = {
  1: { label: 'Pilar 1 — Mentalidade', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  2: { label: 'Pilar 2 — Comercial', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  3: { label: 'Pilar 3 — Posicionamento', color: '#dfb26c', bg: 'rgba(223, 178, 108, 0.12)' },
  4: { label: 'Pilar 4 — Estruturação', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
  5: { label: 'Pilar 5 — Qualidade Vida', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' }
};

async function loadGoals() {
  const el = document.getElementById('goals-list');
  if (!el) return;

  try {
    allMemberGoals = await req(`/goals.php?member_id=${detailId}`);
    updateGoalsSummaryCard(allMemberGoals);
    renderGoalsList(allMemberGoals);
  } catch (e) {
    el.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted); font-size:12px;">Erro ao carregar metas</div>';
  }
}

function updateGoalsSummaryCard(list) {
  const percentText = document.getElementById('goals-percent-text');
  const progressBar = document.getElementById('goals-progress-bar');
  const pillsEl = document.getElementById('goals-stats-pills');

  if (!list.length) {
    if (percentText) percentText.textContent = '0% Concluído';
    if (progressBar) progressBar.style.width = '0%';
    if (pillsEl) pillsEl.innerHTML = '<span>Sem metas cadastradas</span>';
    return;
  }

  const doneCount = list.filter(g => g.status === 'done').length;
  const totalCount = list.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = list.filter(g => g.status !== 'done' && g.due_date && g.due_date < todayStr).length;

  if (percentText) percentText.textContent = `${pct}% Concluído (${doneCount}/${totalCount})`;
  if (progressBar) progressBar.style.width = `${pct}%`;

  if (pillsEl) {
    pillsEl.innerHTML = `
      <span><strong style="color:var(--green)">${doneCount}</strong> concluídas</span>
      <span><strong style="color:var(--gold)">${totalCount - doneCount}</strong> pendentes</span>
      <span><strong style="color:${overdueCount > 0 ? 'var(--red)' : 'var(--muted)'}">${overdueCount}</strong> atrasadas</span>
    `;
  }
}

function filterGoalsList() {
  const statusFilter = document.getElementById('g-filter-status')?.value || '';
  const pillarFilter = document.getElementById('g-filter-pillar')?.value || '';
  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = allMemberGoals.filter(g => {
    let matchStatus = true;
    if (statusFilter === 'open') matchStatus = (g.status !== 'done');
    else if (statusFilter === 'done') matchStatus = (g.status === 'done');
    else if (statusFilter === 'overdue') matchStatus = (g.status !== 'done' && g.due_date && g.due_date < todayStr);

    const matchPillar = !pillarFilter || String(g.pillar) === String(pillarFilter);
    return matchStatus && matchPillar;
  });

  renderGoalsList(filtered);
}

function renderGoalsList(list) {
  const el = document.getElementById('goals-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div style="padding:30px; text-align:center; color:var(--muted); font-size:13px; background:var(--bg2); border-radius:8px; border:1px dashed var(--border);">Nenhuma meta encontrada para os filtros selecionados</div>';
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  el.innerHTML = list.map(g => {
    const isDone = g.status === 'done';
    const isOverdue = !isDone && g.due_date && g.due_date < todayStr;
    const pCfg = PILLAR_CONFIG[g.pillar] || PILLAR_CONFIG[1];

    return `
      <div style="background:var(--bg2); border:1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : (isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)')}; border-radius:10px; padding:12px 14px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; transition:all 0.2s;">
        <div style="display:flex; align-items:flex-start; gap:12px; flex:1;">
          <button onclick="toggleGoal('${g.id}', '${g.status}')" title="${isDone ? 'Marcar como pendente' : 'Marcar como concluída'}" style="width:22px; height:22px; border-radius:6px; border:2px solid ${isDone ? '#10b981' : 'var(--border)'}; background:${isDone ? '#10b981' : 'transparent'}; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; margin-top:2px; flex-shrink:0; transition:all 0.2s;">
            ${isDone ? '<i class="ti ti-check" style="font-size:14px;"></i>' : ''}
          </button>

          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
              <span style="font-size:11px; font-weight:600; color:${pCfg.color}; background:${pCfg.bg}; padding:2px 8px; border-radius:4px; border:1px solid ${pCfg.color}33;">${pCfg.label}</span>
              ${g.due_date ? `
                <span style="font-size:11px; color:${isOverdue ? 'var(--red)' : 'var(--muted)'}; background:var(--bg3); padding:2px 6px; border-radius:4px; border:1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border)'}; font-weight:${isOverdue ? '600' : 'normal'};">
                  ${isOverdue ? '⚠️ Venceu em ' : 'Prazo: '} ${fmtDate(g.due_date)}
                </span>
              ` : ''}
              ${isDone && g.completed_at ? `<span style="font-size:10px; color:var(--green); font-weight:600;"><i class="ti ti-circle-check-filled"></i> Concluído em ${fmtDate(g.completed_at)}</span>` : ''}
            </div>

            <div style="font-size:13px; font-weight:600; color:${isDone ? 'var(--muted)' : 'var(--text)'}; text-decoration:${isDone ? 'line-through' : 'none'}; line-height:1.4;">
              ${escapeHtml(g.title)}
            </div>

            ${g.description ? `<div style="font-size:12px; color:var(--muted); margin-top:4px; line-height:1.4; background:var(--bg3); padding:6px 10px; border-radius:4px;">${escapeHtml(g.description)}</div>` : ''}
          </div>
        </div>

        <button onclick="deleteGoal('${g.id}', event)" title="Excluir meta" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; font-size:14px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

async function addGoal() {
  const title = document.getElementById('g-title').value.trim();
  if (!title) { toast('Por favor, descreva o título da meta', false); return; }
  
  const pillar = parseInt(document.getElementById('g-pillar').value, 10);
  const due_date = document.getElementById('g-due').value || null;
  const description = document.getElementById('g-desc')?.value.trim() || null;

  try {
    await req(`/goals.php?member_id=${detailId}`, {
      method: 'POST',
      body: { pillar, title, due_date, description }
    });
    document.getElementById('g-title').value = '';
    document.getElementById('g-due').value = '';
    if (document.getElementById('g-desc')) document.getElementById('g-desc').value = '';
    loadGoals();
    toast('Meta adicionada com sucesso!');
  } catch(e) {
    toast(e.message, false);
  }
}

async function toggleGoal(id, cur) {
  try {
    await req(`/goals.php?id=${id}`, {
      method: 'PATCH',
      body: { status: cur === 'done' ? 'open' : 'done' }
    });
    loadGoals();
  } catch(e) {
    toast(e.message, false);
  }
}

async function deleteGoal(id, event) {
  if (event) event.stopPropagation();
  showConfirmModal({
    title: 'Excluir Meta',
    message: 'Deseja realmente excluir esta meta?',
    confirmText: 'Excluir Meta',
    onConfirm: async () => {
      try {
        await req(`/goals.php?id=${id}`, { method: 'DELETE' });
        toast('Meta excluída com sucesso!');
        loadGoals();
      } catch(e) { toast(e.message, false); }
    }
  });
}

let allMemberMilestones = [];

async function loadMilestones() {
  const el = document.getElementById('milestones-list');
  if (!el) return;

  try {
    allMemberMilestones = await req(`/milestones.php?member_id=${detailId}`);
    renderMilestonesList(allMemberMilestones);
  } catch (e) {
    el.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted); font-size:12px;">Erro ao carregar histórico de conquistas</div>';
  }
}

function filterMilestonesList() {
  const q = (document.getElementById('m-filter-search')?.value || '').toLowerCase().trim();
  const pillarFilter = document.getElementById('m-filter-pillar')?.value || '';

  const filtered = allMemberMilestones.filter(m => {
    const matchPillar = !pillarFilter || String(m.pillar) === String(pillarFilter);
    const matchQuery = !q || (m.title && m.title.toLowerCase().includes(q)) || (m.description && m.description.toLowerCase().includes(q));
    return matchPillar && matchQuery;
  });

  renderMilestonesList(filtered);
}

function renderMilestonesList(list) {
  const el = document.getElementById('milestones-list');
  const countEl = document.getElementById('m-count-label');
  if (!el) return;

  if (countEl) {
    countEl.textContent = `🏆 ${list.length} ${list.length === 1 ? 'conquista' : 'conquistas'}`;
  }

  if (!list.length) {
    el.innerHTML = '<div style="padding:30px; text-align:center; color:var(--muted); font-size:13px; background:var(--bg2); border-radius:8px; border:1px dashed var(--border);">Nenhum marco de conquista registrado para estes filtros</div>';
    return;
  }

  el.innerHTML = list.map((m, idx) => {
    const pCfg = PILLAR_CONFIG[m.pillar] || PILLAR_CONFIG[1];
    const isLatest = idx === 0 && list.length === allMemberMilestones.length;

    return `
      <div style="background:var(--bg2); border:1px solid ${isLatest ? 'rgba(223, 178, 108, 0.4)' : 'var(--border)'}; border-radius:10px; padding:14px; position:relative; transition:all 0.2s;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:10px; background:rgba(223, 178, 108, 0.12); color:var(--gold); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; border:1px solid rgba(223, 178, 108, 0.2);">
              <i class="ti ti-trophy"></i>
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:11px; font-weight:600; color:${pCfg.color}; background:${pCfg.bg}; padding:2px 8px; border-radius:4px; border:1px solid ${pCfg.color}33;">${pCfg.label}</span>
                <span style="font-size:11px; color:var(--muted); background:var(--bg3); padding:2px 6px; border-radius:4px; border:1px solid var(--border);"><i class="ti ti-calendar"></i> ${fmtDate(m.achieved_at)}</span>
                ${isLatest ? '<span style="background:var(--gold); color:#07080c; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; text-transform:uppercase; letter-spacing:0.5px;">Última Conquista</span>' : ''}
              </div>
            </div>
          </div>

          <button onclick="deleteMilestone('${m.id}', event)" title="Excluir conquista" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; font-size:14px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">
            <i class="ti ti-trash"></i>
          </button>
        </div>

        <div style="font-size:14px; font-weight:700; color:var(--text); margin-top:4px; line-height:1.4;">
          🚀 ${escapeHtml(m.title)}
        </div>

        ${m.description ? `<div style="font-size:12.5px; color:#e2e8f0; line-height:1.5; background:var(--bg3); padding:10px 12px; border-radius:6px; border:1px solid var(--border); margin-top:8px; white-space:pre-wrap;">${escapeHtml(m.description)}</div>` : ''}
      </div>
    `;
  }).join('');
}

async function addMilestone() {
  const title = document.getElementById('m-title').value.trim();
  if (!title) { toast('Por favor, informe o título da conquista', false); return; }

  const pillar = parseInt(document.getElementById('m-pillar').value, 10);
  const achieved_at = document.getElementById('m-date').value || today();
  const description = document.getElementById('m-desc').value.trim() || null;

  try {
    await req(`/milestones.php?member_id=${detailId}`, {
      method: 'POST',
      body: { pillar, title, achieved_at, description }
    });
    document.getElementById('m-title').value = '';
    document.getElementById('m-desc').value = '';
    document.getElementById('m-date').value = today();
    loadMilestones();
    toast('🏆 Nova conquista registrada e celebrada com sucesso!');
  } catch(e) {
    toast(e.message, false);
  }
}

async function deleteMilestone(id, event) {
  if (event) event.stopPropagation();
  showConfirmModal({
    title: 'Excluir Conquista',
    message: 'Deseja realmente excluir esta conquista do histórico?',
    confirmText: 'Excluir Conquista',
    onConfirm: async () => {
      try {
        await req(`/milestones.php?id=${id}`, { method: 'DELETE' });
        toast('Conquista excluída!');
        loadMilestones();
      } catch(e) { toast(e.message, false); }
    }
  });
}

let allMemberHistory = [];

async function loadHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;

  try {
    allMemberHistory = await req(`/dashboard.php?member_id=${detailId}`);
    renderHistoryList(allMemberHistory);
  } catch (e) {
    el.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted); font-size:12px;">Erro ao carregar histórico de movimentações</div>';
  }
}

function filterHistoryList() {
  const q = (document.getElementById('h-filter-search')?.value || '').toLowerCase().trim();

  const filtered = allMemberHistory.filter(h => {
    const matchQuery = !q || 
      (h.reason && h.reason.toLowerCase().includes(q)) || 
      (h.author_name && h.author_name.toLowerCase().includes(q)) ||
      (h.from_status && h.from_status.toLowerCase().includes(q)) ||
      (h.to_status && h.to_status.toLowerCase().includes(q));
    return matchQuery;
  });

  renderHistoryList(filtered);
}

function renderHistoryList(list) {
  const el = document.getElementById('history-list');
  const countEl = document.getElementById('h-count-label');
  if (!el) return;

  if (countEl) {
    countEl.textContent = `${list.length} ${list.length === 1 ? 'registro' : 'registros'}`;
  }

  if (!list.length) {
    el.innerHTML = '<div style="padding:30px; text-align:center; color:var(--muted); font-size:13px; background:var(--bg2); border-radius:8px; border:1px dashed var(--border);">Nenhum histórico de movimentação encontrado</div>';
    return;
  }

  el.innerHTML = list.map((h, idx) => {
    const author = h.author_name || 'Marcio Araujo';
    const dateObj = new Date(h.changed_at);
    const dateStr = !isNaN(dateObj) ? dateObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : fmtDate(h.changed_at);
    const isLatest = idx === 0;

    const fromLabel = h.from_status ? (STATUS_LABEL[h.from_status] || h.from_status) : null;
    const toLabel = STATUS_LABEL[h.to_status] || h.to_status;
    const toColor = STATUS_COLOR[h.to_status] || 'var(--gold)';
    const fromColor = h.from_status ? (STATUS_COLOR[h.from_status] || 'var(--muted)') : null;

    return `
      <div style="background:var(--bg2); border:1px solid ${isLatest ? 'rgba(223, 178, 108, 0.4)' : 'var(--border)'}; border-radius:10px; padding:12px 14px; position:relative; transition:all 0.2s;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:6px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="width:26px; height:26px; border-radius:6px; background:rgba(255,255,255,0.05); color:var(--gold); display:flex; align-items:center; justify-content:center; font-size:13px;">
              <i class="ti ti-history"></i>
            </div>

            ${fromLabel ? `
              <span style="font-size:11px; font-weight:600; color:${fromColor}; background:rgba(255,255,255,0.04); padding:2px 8px; border-radius:4px; border:1px solid var(--border);">${escapeHtml(fromLabel)}</span>
              <i class="ti ti-arrow-right" style="font-size:12px; color:var(--muted);"></i>
            ` : ''}

            <span style="font-size:11px; font-weight:600; color:${toColor}; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; border:1px solid ${toColor}44;">${escapeHtml(toLabel)}</span>
            ${isLatest ? '<span style="background:var(--gold); color:#07080c; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; text-transform:uppercase; letter-spacing:0.5px;">Última Alteração</span>' : ''}
          </div>

          <span style="font-size:11px; color:var(--muted);"><i class="ti ti-clock"></i> ${dateStr}</span>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:6px; font-size:12px;">
          <span style="color:var(--text); font-weight:500;">${escapeHtml(h.reason || 'Alteração realizada no sistema')}</span>
          <span style="font-size:11px; color:var(--muted); display:flex; align-items:center; gap:4px; flex-shrink:0;">
            <i class="ti ti-user-check" style="font-size:12px; color:var(--gold);"></i>
            <span>Por <strong>${escapeHtml(author)}</strong></span>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ── PDF Individual & WhatsApp Templates ─────────────────────
async function downloadSinglePDF() {
  if (!detailId) return;
  try {
    const response = await fetch(`api/generate_pdf.php?member_id=${detailId}`, { credentials: 'include' });
    if (!response.ok) {
      toast('Erro ao gerar a ficha em PDF.', false);
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'Ficha_Mentorado.pdf';
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    toast('Erro ao gerar a ficha em PDF.', false);
  }
}

function toggleWaMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('wa-template-menu');
  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function toggleExecActionsMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('exec-actions-menu');
  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function closeExecActionsMenu() {
  const menu = document.getElementById('exec-actions-menu');
  if (menu) menu.style.display = 'none';
}

document.addEventListener('click', (e) => {
  const waMenu = document.getElementById('wa-template-menu');
  const waBtn = document.getElementById('btn-exec-wa');
  if (waMenu && waMenu.style.display === 'block') {
    if (!waMenu.contains(e.target) && (!waBtn || !waBtn.contains(e.target))) {
      waMenu.style.display = 'none';
    }
  }

  const actMenu = document.getElementById('exec-actions-menu');
  const actBtn = document.getElementById('btn-exec-actions-toggle');
  if (actMenu && actMenu.style.display === 'block') {
    if (!actMenu.contains(e.target) && (!actBtn || !actBtn.contains(e.target))) {
      actMenu.style.display = 'none';
    }
  }
});

// ── Autocomplete com busca interna para Membro Parceiro ────────
let partnerSearchList = [];

async function ensurePartnerSearchList() {
  if (partnerSearchList.length > 0) return partnerSearchList;
  try {
    const list = await req('/members.php');
    partnerSearchList = (list || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (e) {
    partnerSearchList = members || [];
  }
  return partnerSearchList;
}

async function onPartnerSearchFocus() {
  await ensurePartnerSearchList();
  onPartnerSearchInput();
}

async function onPartnerSearchInput() {
  const input = document.getElementById('dl-partner-search');
  const hidden = document.getElementById('dl-partner');
  const dropdown = document.getElementById('dl-partner-dropdown');
  const clearBtn = document.getElementById('dl-partner-clear');

  if (!input || !dropdown) return;

  const query = (input.value || '').trim().toLowerCase();
  hidden.value = input.value; // Mantém o texto digitado como fallback

  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

  const all = await ensurePartnerSearchList();
  const available = all.filter(m => m.id !== detailId);

  const matches = available.filter(m => {
    if (!query) return true;
    const nameMatch = (m.name || '').toLowerCase().includes(query);
    const specMatch = (m.specialty || '').toLowerCase().includes(query);
    const compMatch = (m.company_name || m.trade_name || '').toLowerCase().includes(query);
    return nameMatch || specMatch || compMatch;
  });

  dropdown.style.display = 'block';

  let html = '';

  if (matches.length > 0) {
    html += matches.slice(0, 15).map(m => {
      const company = m.company_name || m.trade_name ? ` (${m.company_name || m.trade_name})` : '';
      const fullLabel = `${m.name}${company}`;
      return `
        <div onclick="selectPartnerItem('${escapeHtml(fullLabel)}')" style="padding:8px 12px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.03);" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
          <div>
            <div style="font-size:12.5px; font-weight:600; color:var(--text);">${escapeHtml(m.name)} <span style="font-size:11px; color:var(--gold); font-weight:normal;">${escapeHtml(company)}</span></div>
            <div style="font-size:11px; color:var(--muted);">${escapeHtml(m.specialty || 'Membro do Rocket Club')}</div>
          </div>
          <i class="ti ti-check" style="font-size:13px; color:var(--green); opacity:0.6;"></i>
        </div>
      `;
    }).join('');
  } else {
    html += `<div style="padding:10px 12px; font-size:12px; color:var(--muted); text-align:center;">Nenhum mentorado encontrado com "${escapeHtml(query)}"</div>`;
  }

  if (query) {
    html += `
      <div onclick="selectPartnerItem('${escapeHtml(query)}')" style="padding:8px 12px; cursor:pointer; background:rgba(223,178,108,0.08); border-top:1px solid var(--border); font-size:12px; color:var(--gold); display:flex; align-items:center; gap:6px;" onmouseover="this.style.background='rgba(223,178,108,0.18)'" onmouseout="this.style.background='rgba(223,178,108,0.08)'">
        <i class="ti ti-plus"></i> Usar "${escapeHtml(query)}" como Parceiro Externo
      </div>
    `;
  }

  dropdown.innerHTML = html;
}

function selectPartnerItem(val) {
  const input = document.getElementById('dl-partner-search');
  const hidden = document.getElementById('dl-partner');
  const dropdown = document.getElementById('dl-partner-dropdown');
  const clearBtn = document.getElementById('dl-partner-clear');

  if (input) input.value = val;
  if (hidden) hidden.value = val;
  if (dropdown) dropdown.style.display = 'none';
  if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
}

function clearPartnerSearch() {
  selectPartnerItem('');
}

document.addEventListener('click', (e) => {
  const container = document.getElementById('dl-partner-dropdown');
  const input = document.getElementById('dl-partner-search');
  if (container && container.style.display === 'block') {
    if (!container.contains(e.target) && !input.contains(e.target)) {
      container.style.display = 'none';
    }
  }
});

async function loadDeals() {
  clearPartnerSearch();
  ensurePartnerSearchList();
  const el = document.getElementById('deals-list');
  const roiEl = document.getElementById('deals-total-roi');
  if (!el) return;

  try {
    allMemberDeals = await req(`/deals.php?member_id=${detailId}`);
    
    let totalValue = 0;
    allMemberDeals.forEach(d => {
      totalValue += parseFloat(d.deal_value || 0);
    });

    if (roiEl) {
      roiEl.textContent = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (!allMemberDeals.length) {
      el.innerHTML = '<div style="padding:30px; text-align:center; color:var(--muted); font-size:13px; background:var(--bg2); border-radius:8px; border:1px dashed var(--border);">Nenhum negócio registrado até o momento</div>';
      return;
    }

    el.innerHTML = allMemberDeals.map(d => `
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
            <span style="font-size:13px; font-weight:700; color:var(--green);">${parseFloat(d.deal_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            <span style="font-size:11px; color:var(--muted); background:var(--bg3); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">${fmtDate(d.deal_date)}</span>
            ${d.partner_member_name ? `<span style="font-size:11px; color:var(--gold);"><i class="ti ti-handshake"></i> Parceria com <strong>${escapeHtml(d.partner_member_name)}</strong></span>` : ''}
          </div>
          <div style="font-size:13px; font-weight:600; color:var(--text);">${escapeHtml(d.title)}</div>
          ${d.notes ? `<div style="font-size:12px; color:var(--muted); margin-top:4px; background:var(--bg3); padding:6px 10px; border-radius:4px;">${escapeHtml(d.notes)}</div>` : ''}
        </div>
        <button onclick="deleteDeal('${d.id}', event)" title="Excluir negócio" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; font-size:14px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted); font-size:12px;">Erro ao carregar histórico de negócios</div>';
  }
}

async function addDeal() {
  const title = document.getElementById('dl-title').value.trim();
  if (!title) { toast('Por favor, informe o título do negócio', false); return; }

  const partner_member_name = (document.getElementById('dl-partner').value || '').trim() || null;
  const deal_value = parseFloat(document.getElementById('dl-value').value || 0);
  const deal_date = document.getElementById('dl-date').value || today();
  const notes = document.getElementById('dl-notes').value.trim() || null;

  try {
    await req(`/deals.php?member_id=${detailId}`, {
      method: 'POST',
      body: { title, partner_member_name, deal_value, deal_date, notes }
    });
    document.getElementById('dl-title').value = '';
    document.getElementById('dl-value').value = '';
    document.getElementById('dl-notes').value = '';
    clearPartnerSearch();
    loadDeals();
    toast('💰 Negócio registrado e adicionado ao ROI do membro!');
  } catch(e) {
    toast(e.message, false);
  }
}

async function deleteDeal(id, event) {
  if (event) event.stopPropagation();
  showConfirmModal({
    title: 'Excluir Negócio',
    message: 'Deseja realmente remover este registro de negócio do histórico de ROI?',
    confirmText: 'Excluir Negócio',
    onConfirm: async () => {
      try {
        await req(`/deals.php?id=${id}`, { method: 'DELETE' });
        toast('Registro de negócio excluído');
        loadDeals();
      } catch(e) { toast(e.message, false); }
    }
  });
}

// ── Smart Matching & Networking por Localização ─────────────────────
let currentNetworkingFilter = 'all';

function extractLocationDetails(addrStr) {
  if (!addrStr || typeof addrStr !== 'string') return { city: '', state: '', full: '', raw: '' };
  
  const raw = addrStr.replace(/\s+/g, ' ').trim();
  const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
                  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
  
  let state = '';
  let city = '';

  const stateRegex = new RegExp('\\b(' + states.join('|') + ')\\b', 'i');
  const stateMatch = raw.match(stateRegex);
  if (stateMatch) {
    state = stateMatch[1].toUpperCase();
  }

  // Tenta extrair a cidade de padrões como "Niterói/RJ", "Rio de Janeiro - RJ", "Bairro, Cidade, Estado"
  const parts = raw.split(/[-\/,;]/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (states.includes(lastPart)) {
      state = lastPart;
      const cityCandidate = parts[parts.length - 2].split(',').pop().trim();
      city = cityCandidate;
    } else {
      city = parts[0];
    }
  } else {
    city = raw.replace(new RegExp('\\b(' + states.join('|') + ')\\b', 'gi'), '').trim();
  }

  // Limpa prefixos de endereços de rua se houver
  city = city.replace(/^(rua|av|avenida|bairro|alameda|praça|praca|estrada|condomínio)\s+[^,]+/i, '').trim();
  city = city.replace(/[\d\-]/g, '').trim();

  if (city.length > 2) {
    city = normalizeNameCaseJS(city);
  } else {
    city = '';
  }

  let full = '';
  if (city && state) full = `${city} / ${state}`;
  else if (city) full = city;
  else if (state) full = `Estado de ${state}`;
  else full = raw;

  return { city, state, full, raw };
}

function setNetworkingFilter(filterType, btnEl) {
  currentNetworkingFilter = filterType;
  if (btnEl && btnEl.parentElement) {
    btnEl.parentElement.querySelectorAll('.net-filter-btn').forEach(b => {
      b.classList.remove('active');
      b.style.borderColor = 'var(--border)';
      b.style.color = 'var(--muted)';
      b.style.fontWeight = '500';
    });
    btnEl.classList.add('active');
    btnEl.style.borderColor = 'var(--border-focus)';
    btnEl.style.color = 'var(--gold)';
    btnEl.style.fontWeight = '600';
  }
  loadNetworkingMatches();
}

function loadNetworkingMatches() {
  const el = document.getElementById('networking-matches-list');
  if (!el) return;

  const current = members.find(m => m.id === detailId);
  if (!current) return;

  // Extrai localização do membro atual (residência > endereço comercial > atuação > naturalidade)
  const curResLoc = extractLocationDetails(current.residence);
  const curCommLoc = extractLocationDetails(current.commercial_address);
  const curWorkLoc = extractLocationDetails(current.work_locations);

  const curCity = curResLoc.city || curCommLoc.city || curWorkLoc.city || '';
  const curState = curResLoc.state || curCommLoc.state || curWorkLoc.state || '';
  const curFullLoc = curResLoc.full || curCommLoc.full || curWorkLoc.full || '';

  // Atualiza badge de localização do mentorado no modal
  const locBadgeText = document.getElementById('networking-loc-text');
  if (locBadgeText) {
    locBadgeText.textContent = curFullLoc ? `Endereço: ${curFullLoc}` : 'Endereço não informado no perfil';
  }

  let matches = [];
  let countCity = 0;
  let countState = 0;
  let countSpec = 0;

  members.forEach(m => {
    if (m.id === detailId) return;

    const mResLoc = extractLocationDetails(m.residence);
    const mCommLoc = extractLocationDetails(m.commercial_address);
    const mWorkLoc = extractLocationDetails(m.work_locations);

    const mCity = mResLoc.city || mCommLoc.city || mWorkLoc.city || '';
    const mState = mResLoc.state || mCommLoc.state || mWorkLoc.state || '';
    const mFullLoc = mResLoc.full || mCommLoc.full || mWorkLoc.full || (m.residence || m.commercial_address || '');

    let score = 0;
    const reasons = [];
    let matchCategory = 'other';

    // 1. Checar Mesma Cidade
    const curCityNorm = curCity.toLowerCase();
    const mCityNorm = mCity.toLowerCase();
    const isSameCity = Boolean(curCityNorm && mCityNorm && (
      curCityNorm === mCityNorm ||
      (m.residence && m.residence.toLowerCase().includes(curCityNorm)) ||
      (current.residence && current.residence.toLowerCase().includes(mCityNorm))
    ));

    if (isSameCity) {
      score += 15;
      countCity++;
      matchCategory = 'city';
      reasons.push({
        icon: 'ti-map-pin-filled',
        color: 'var(--gold)',
        bg: 'rgba(223, 178, 108, 0.15)',
        border: 'rgba(223, 178, 108, 0.3)',
        label: `📍 Mesma Cidade: ${mCity || curCity} (${mState || curState})`
      });
    }

    // 2. Checar Mesmo Estado (se não for mesma cidade)
    const isSameState = !isSameCity && Boolean(curState && mState && curState === mState);
    if (isSameState) {
      score += 8;
      countState++;
      if (matchCategory === 'other') matchCategory = 'state';
      reasons.push({
        icon: 'ti-map-pin',
        color: 'var(--blue)',
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.3)',
        label: `📌 Mesmo Estado: ${mState}`
      });
    }

    // 3. Checar Especialidade Complementar
    let isSameSpec = false;
    if (current.specialty && m.specialty) {
      const spec1 = current.specialty.toLowerCase().trim();
      const spec2 = m.specialty.toLowerCase().trim();
      if (spec1 === spec2 || spec1.includes(spec2) || spec2.includes(spec1)) {
        score += 5;
        countSpec++;
        isSameSpec = true;
        if (matchCategory === 'other') matchCategory = 'specialty';
        reasons.push({
          icon: 'ti-briefcase',
          color: 'var(--green)',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          label: `💼 Especialidade: ${escapeHtml(m.specialty)}`
        });
      }
    }

    // 4. Checar Interesses / Hobbies
    if (current.interests && m.interests) {
      const words1 = current.interests.toLowerCase().split(/[,\s;/]+/);
      const words2 = m.interests.toLowerCase().split(/[,\s;/]+/);
      const stopWords = ['para', 'com', 'como', 'mais', 'sobre', 'muito', 'tudo', 'área'];
      const common = words1.filter(w => w.length > 3 && !stopWords.includes(w) && words2.includes(w));
      if (common.length > 0) {
        score += common.length * 3;
        reasons.push({
          icon: 'ti-sparkles',
          color: '#a855f7',
          bg: 'rgba(168, 85, 247, 0.15)',
          border: 'rgba(168, 85, 247, 0.3)',
          label: `🎯 Interesses: ${escapeHtml(common.slice(0, 3).join(', '))}`
        });
      }
    }

    if (score > 0) {
      matches.push({
        member: m,
        score,
        matchCategory,
        isSameCity,
        isSameState,
        isSameSpec,
        mFullLoc,
        reasons
      });
    }
  });

  // Atualizar contadores no UI
  const cntAll = document.getElementById('net-count-all');
  const cntCity = document.getElementById('net-count-city');
  const cntState = document.getElementById('net-count-state');
  const cntSpec = document.getElementById('net-count-spec');

  if (cntAll) cntAll.textContent = matches.length;
  if (cntCity) cntCity.textContent = countCity;
  if (cntState) cntState.textContent = countState;
  if (cntSpec) cntSpec.textContent = countSpec;

  // Filtragem conforme botão ativo
  if (currentNetworkingFilter === 'city') {
    matches = matches.filter(m => m.isSameCity);
  } else if (currentNetworkingFilter === 'state') {
    matches = matches.filter(m => m.isSameState || m.isSameCity);
  } else if (currentNetworkingFilter === 'specialty') {
    matches = matches.filter(m => m.isSameSpec);
  }

  // Ordenar por score de afinidade
  matches.sort((a, b) => b.score - a.score);

  if (!matches.length) {
    el.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--muted); font-size:13px; background:var(--bg2); border-radius:10px; border:1px dashed var(--border);">
        <i class="ti ti-map-off" style="font-size:28px; color:var(--muted); margin-bottom:8px; display:block;"></i>
        Nenhum mentee recomendado encontrado para o filtro selecionado (${currentNetworkingFilter === 'city' ? 'Mesma Cidade' : (currentNetworkingFilter === 'state' ? 'Mesmo Estado' : 'Especialidade')}).
      </div>`;
    return;
  }

  el.innerHTML = matches.map(item => {
    const m = item.member;
    const phoneClean = m.phone ? m.phone.replace(/\D/g, '') : '';
    
    return `
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:10px; transition:border-color 0.2s;" onmouseenter="this.style.borderColor='var(--border-focus)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:50%; background:var(--bg3); border:1px solid var(--border-focus); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--gold); font-size:16px; flex-shrink:0;">
              ${m.name.charAt(0)}
            </div>
            <div>
              <div style="font-size:14px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px;">
                ${escapeHtml(m.name)}
                <span style="font-size:10px; font-weight:600; padding:2px 8px; border-radius:12px; background:var(--bg3); border:1px solid var(--border); color:var(--muted);">
                  Afinidade: ${item.score} pts
                </span>
              </div>
              <div style="font-size:12px; color:var(--muted); margin-top:2px;">
                <i class="ti ti-briefcase" style="font-size:13px; color:var(--gold);"></i> ${escapeHtml(m.specialty || 'Membro da Mentoria')}
              </div>
              ${item.mFullLoc ? `
                <div style="font-size:11px; color:var(--gold); margin-top:3px; display:flex; align-items:center; gap:4px; font-weight:500;">
                  <i class="ti ti-map-pin" style="font-size:13px;"></i> Endereço: ${escapeHtml(item.mFullLoc)}
                </div>` : ''}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            ${phoneClean ? `
              <button type="button" onclick="openWhatsAppIntroMatch('${m.id}', '${m.phone}', '${escapeHtml(m.name)}')" style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); color:var(--green); border-radius:8px; padding:6px 12px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px;">
                <i class="ti ti-brand-whatsapp" style="font-size:14px;"></i> Apresentar
              </button>` : ''}
            <button type="button" onclick="openDetail('${m.id}')" style="background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 12px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
              <i class="ti ti-user" style="font-size:13px;"></i> Ver Perfil
            </button>
          </div>
        </div>

        <!-- Badges de Motivo de Conexão -->
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; border-top:1px dashed var(--border); padding-top:8px;">
          ${item.reasons.map(r => `
            <span style="font-size:11px; font-weight:600; padding:4px 10px; border-radius:6px; background:${r.bg}; border:1px solid ${r.border}; color:${r.color}; display:flex; align-items:center; gap:5px;">
              <i class="ti ${r.icon}"></i> ${r.label}
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function openWhatsAppIntroMatch(matchId, phoneRaw, matchName) {
  if (!phoneRaw) { toast('Membro não possui telefone cadastrado', false); return; }
  const num = phoneRaw.replace(/\D/g, '');
  if (!num) return;

  const current = members.find(m => m.id === detailId);
  const matchMember = members.find(m => m.id === matchId);

  const curFirstName = current ? current.name.split(' ')[0] : 'Membro';
  const matchFirstName = matchName.split(' ')[0];

  const curLoc = extractLocationDetails(current ? current.residence : '');
  const mLoc = extractLocationDetails(matchMember ? matchMember.residence : '');

  let locText = '';
  if (curLoc.city && mLoc.city && curLoc.city.toLowerCase() === mLoc.city.toLowerCase()) {
    locText = `em ${mLoc.city}`;
  } else if (curLoc.state && mLoc.state && curLoc.state === mLoc.state) {
    locText = `no estado de ${mLoc.state}`;
  } else {
    locText = `no Rocket Club`;
  }

  const msg = `Olá ${matchFirstName}, tudo bem? Gostaria de te apresentar o(a) ${curFirstName}, também mentee do Rocket Club ${locText}! Acredito que vocês têm uma grande oportunidade de sinergia e networking. 🚀🤝`;
  window.open(`https://wa.me/55${num}?text=${encodeURIComponent(msg)}`, '_blank');
}


function calculateAge(birthdateStr) {
  if (!birthdateStr) return '';
  const parts = birthdateStr.split('-');
  if (parts.length !== 3) return '';
  const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 0 ? `${age} anos` : '';
}

document.addEventListener('DOMContentLoaded', () => {
  const birthdateInput = document.getElementById('f-birthdate');
  const ageInput = document.getElementById('f-age');
  
  if (birthdateInput && ageInput) {
    birthdateInput.addEventListener('change', () => {
      const calculated = calculateAge(birthdateInput.value);
      if (calculated) {
        ageInput.value = calculated;
      }
    });
  }
});

// ── cover uploader ─────────────────────────────────────────
function setCoverPreview(base64) {
  currentCoverBase64 = base64;
  const fileInput = document.getElementById('cover-file-input');
  const execAvatar = document.getElementById('member-exec-avatar-preview');
  const execIcon = document.getElementById('member-exec-avatar-icon');
  const execRemoveBtn = document.getElementById('btn-exec-remove-photo');

  if (base64) {
    if (execAvatar) { execAvatar.style.backgroundImage = `url(${base64})`; }
    if (execIcon) { execIcon.style.display = 'none'; }
    if (execRemoveBtn) { execRemoveBtn.style.display = 'inline-flex'; }
  } else {
    if (fileInput) fileInput.value = '';
    if (execAvatar) { execAvatar.style.backgroundImage = ''; }
    if (execIcon) { execIcon.style.display = 'block'; }
    if (execRemoveBtn) { execRemoveBtn.style.display = 'none'; }
  }
}

function openMemberWhatsApp() {
  const phone = document.getElementById('f-phone') ? document.getElementById('f-phone').value : '';
  if (phone) {
    const clean = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  }
}

function removeCover(event) {
  if (event) event.stopPropagation(); // Avoid triggering file select
  setCoverPreview(null);
}

function initCoverUploader() {
  const uploader = document.getElementById('cover-uploader');
  const fileInput = document.getElementById('cover-file-input');
  if (!uploader || !fileInput) return;

  // Click to select file
  uploader.onclick = () => fileInput.click();

  // Drag & drop events
  uploader.ondragover = (e) => {
    e.preventDefault();
    uploader.classList.add('drag-over');
  };

  uploader.ondragleave = (e) => {
    e.preventDefault();
    uploader.classList.remove('drag-over');
  };

  uploader.ondrop = (e) => {
    e.preventDefault();
    uploader.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length) {
      handleCoverFile(files[0]);
    }
  };

  fileInput.onchange = () => {
    const files = fileInput.files;
    if (files.length) {
      handleCoverFile(files[0]);
    }
  };
}

function handleCoverFile(file) {
  if (!file.type.startsWith('image/')) {
    toast('Por favor, selecione uma imagem válida.', false);
    return;
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    toast('A imagem deve ter no máximo 5MB.', false);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Compress and resize
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1600;
      let width = img.width;
      let height = img.height;

      // Calculate width/height proportions
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed jpeg base64 (85% quality for high res)
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setCoverPreview(base64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}


// ── Command Palette & Notification & Table View Logic ────────
let cmdSelectedIndex = 0;
let cmdCurrentResults = [];

function openCommandPalette() {
  const modal = document.getElementById('mo-command-palette');
  const input = document.getElementById('cmd-palette-input');
  if (!modal || !input) return;
  modal.classList.add('open');
  input.value = '';
  cmdSelectedIndex = 0;
  renderCommandPaletteResults('');
  setTimeout(() => input.focus(), 50);
}

function closeCommandPalette() {
  const modal = document.getElementById('mo-command-palette');
  if (modal) modal.classList.remove('open');
}

// Global keydown listener with capture true to intercept Ctrl+K / Cmd+K / Ctrl+J
window.addEventListener('keydown', (e) => {
  const isK = e.key && e.key.toLowerCase() === 'k';
  const isJ = e.key && e.key.toLowerCase() === 'j';
  if ((e.ctrlKey || e.metaKey) && (isK || isJ)) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    const modal = document.getElementById('mo-command-palette');
    if (modal && modal.classList.contains('open')) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
  }
  if (e.key === 'Escape') {
    closeCommandPalette();
  }
}, true);

function onCommandPaletteInput(val) {
  cmdSelectedIndex = 0;
  renderCommandPaletteResults(val);
}

function onCommandPaletteKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (cmdCurrentResults.length) {
      cmdSelectedIndex = (cmdSelectedIndex + 1) % cmdCurrentResults.length;
      updateCmdPaletteHighlight();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (cmdCurrentResults.length) {
      cmdSelectedIndex = (cmdSelectedIndex - 1 + cmdCurrentResults.length) % cmdCurrentResults.length;
      updateCmdPaletteHighlight();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (cmdCurrentResults[cmdSelectedIndex]) {
      cmdCurrentResults[cmdSelectedIndex].action();
      closeCommandPalette();
    }
  }
}

function updateCmdPaletteHighlight() {
  const items = document.querySelectorAll('.cmd-item');
  items.forEach((el, idx) => {
    el.classList.toggle('selected', idx === cmdSelectedIndex);
    if (idx === cmdSelectedIndex) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

function renderCommandPaletteResults(q) {
  const container = document.getElementById('cmd-palette-results');
  if (!container) return;
  const query = q.trim().toLowerCase();
  cmdCurrentResults = [];

  // Default Quick Actions
  const actions = [
    { title: 'Ver Dashboard', sub: 'Navegar para visões gerais e KPIs', icon: 'ti-dashboard', action: () => navigate('dashboard') },
    { title: 'Quadro Kanban', sub: 'Gerenciar esteiras da tripulação', icon: 'ti-layout-kanban', action: () => navigate('kanban') },
    { title: 'Wiki Intranet', sub: 'Base de conhecimento e procedimentos', icon: 'ti-books', action: () => navigate('wiki') },
    { title: 'Configurações do Sistema', sub: 'Ajustar pilares e logotipos', icon: 'ti-settings', action: () => navigate('settings') },
    { title: 'Adicionar Novo Membro', sub: 'Cadastrar nova ficha no sistema', icon: 'ti-user-plus', action: () => openAdd() },
    { title: 'Gerar Members Book PDF', sub: 'Exportar catálogo em PDF', icon: 'ti-file-type-pdf', action: () => confirmGeneratePDF() }
  ];

  actions.forEach(a => {
    if (!query || a.title.toLowerCase().includes(query) || a.sub.toLowerCase().includes(query)) {
      cmdCurrentResults.push({ type: 'action', ...a });
    }
  });

  // Search Members
  if (typeof members !== 'undefined' && members && members.length) {
    members.forEach(m => {
      if (!query || (m.name && m.name.toLowerCase().includes(query)) || (m.specialty && m.specialty.toLowerCase().includes(query))) {
        cmdCurrentResults.push({
          type: 'member',
          title: m.name,
          sub: `Especialidade: ${m.specialty || 'Não informada'} | Status: ${STATUS_LABEL[m.status] || m.status}`,
          icon: 'ti-user',
          action: () => openDetail(m.id)
        });
      }
    });
  }

  // Limit to top 15 results
  cmdCurrentResults = cmdCurrentResults.slice(0, 15);

  if (!cmdCurrentResults.length) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted); font-size:13px;">Nenhum resultado encontrado</div>';
    return;
  }

  container.innerHTML = cmdCurrentResults.map((item, idx) => `
    <div class="cmd-item ${idx === cmdSelectedIndex ? 'selected' : ''}" onclick="cmdCurrentResults[${idx}].action(); closeCommandPalette();">
      <i class="ti ${item.icon}"></i>
      <div class="cmd-item-info">
        <span class="cmd-item-title">${escapeHtml(item.title)}</span>
        <span class="cmd-item-sub">${escapeHtml(item.sub)}</span>
      </div>
    </div>
  `).join('');
}

// ── Central de Notificações ─────────────────────────────────
function toggleNotifPanel() {
  const panel = document.getElementById('notif-dropdown-panel');
  if (!panel) return;
  const isShown = panel.style.display === 'block';
  panel.style.display = isShown ? 'none' : 'block';
  if (!isShown) loadNotifications();
}

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-dropdown-panel');
  const btn = document.getElementById('btn-notif-toggle');
  if (panel && panel.style.display === 'block') {
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      panel.style.display = 'none';
    }
  }
});

let currentNotifsList = [];

function getReadNotifKeys() {
  try {
    return JSON.parse(localStorage.getItem('rocket_read_notifs') || '[]');
  } catch (e) {
    return [];
  }
}

function setReadNotifKeys(keys) {
  try {
    localStorage.setItem('rocket_read_notifs', JSON.stringify(keys));
  } catch (e) {}
}

function markAllNotificationsAsRead() {
  const readKeys = getReadNotifKeys();
  currentNotifsList.forEach(n => {
    if (n.id && !readKeys.includes(n.id)) {
      readKeys.push(n.id);
    }
  });
  setReadNotifKeys(readKeys);
  loadNotifications();
}

function toggleNotificationRead(e, id) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  let readKeys = getReadNotifKeys();
  if (readKeys.includes(id)) {
    readKeys = readKeys.filter(k => k !== id);
  } else {
    readKeys.push(id);
  }
  setReadNotifKeys(readKeys);
  loadNotifications();
}

function executeNotifAction(idx) {
  if (currentNotifsList[idx] && typeof currentNotifsList[idx].action === 'function') {
    currentNotifsList[idx].action();
    toggleNotifPanel();
  }
}

function loadNotifications() {
  const container = document.getElementById('notif-list-container');
  const badge = document.getElementById('notif-badge-count');
  if (!container) return;

  const notifs = [];
  const todayDate = new Date();
  const readKeys = getReadNotifKeys();

  if (typeof members !== 'undefined' && members) {
    // 1. Check birthdays in next 7 days
    members.forEach(m => {
      if (m.birthdate) {
        const parts = m.birthdate.split('-');
        if (parts.length === 3) {
          const bMonth = parseInt(parts[1], 10);
          const bDay = parseInt(parts[2], 10);
          if (bMonth === (todayDate.getMonth() + 1)) {
            const diff = bDay - todayDate.getDate();
            if (diff >= 0 && diff <= 7) {
              const nid = 'bday_' + m.id + '_' + todayDate.getFullYear();
              notifs.push({
                id: nid,
                read: readKeys.includes(nid),
                icon: 'ti-gift',
                color: 'var(--gold)',
                title: `Aniversariante: ${m.name}`,
                sub: diff === 0 ? 'Aniversário HOJE!' : `Aniversário em ${diff} dia(s)`,
                action: () => generateBirthdayCard(m.id)
              });
            }
          }
        }
      }

      // 2. Urgent Attention Members (> 15 days without contact)
      if (m.status === 'vermelha' || m.status === 'amarela') {
        const nid = 'status_' + m.id + '_' + m.status;
        notifs.push({
          id: nid,
          read: readKeys.includes(nid),
          icon: 'ti-alert-triangle',
          color: m.status === 'vermelha' ? 'var(--red)' : 'var(--yellow)',
          title: `Atenção: ${m.name}`,
          sub: `Membro em status ${STATUS_LABEL[m.status] || m.status} requer contato.`,
          action: () => openDetail(m.id)
        });
      }
    });
  }

  currentNotifsList = notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  if (!notifs.length) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted); font-size:12px;">Sem notificações pendentes</div>';
    return;
  }

  container.innerHTML = notifs.map((n, idx) => `
    <div class="notif-item ${n.read ? 'read-item' : ''}" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid var(--border); transition:all 0.2s; ${n.read ? 'opacity:0.55; background:rgba(255,255,255,0.02);' : ''}">
      <div style="display:flex; align-items:center; gap:12px; flex:1; cursor:pointer;" onclick="executeNotifAction(${idx})">
        <i class="ti ${n.icon}" style="color:${n.color}; font-size:18px; flex-shrink:0;"></i>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:13px; font-weight:600; color:var(--text);">${escapeHtml(n.title)}</span>
          <span style="font-size:11px; color:var(--muted);">${escapeHtml(n.sub)}</span>
        </div>
      </div>
      <button onclick="toggleNotificationRead(event, '${n.id}')" title="${n.read ? 'Marcar como não lida' : 'Marcar como lida'}" style="background:none; border:none; color:${n.read ? 'var(--green)' : 'var(--muted)'}; cursor:pointer; padding:6px; font-size:18px; display:flex; align-items:center; justify-content:center; transition:color 0.2s;">
        <i class="ti ${n.read ? 'ti-circle-check-filled' : 'ti-circle-check'}"></i>
      </button>
    </div>
  `).join('');
}

// ── Máscaras para Campos do Formulário ────────────────────
function initInputMasks() {
  const applyCpf = (input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
      else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
      else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
      e.target.value = v;
    });
  };

  const applyCnpj = (input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 14);
      if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
      else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4');
      else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3');
      else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,3})$/, '$1.$2');
      e.target.value = v;
    });
  };

  const applyPhone = (input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
      else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{1,4})$/, '($1) $2-$3');
      else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,4})$/, '($1) $2');
      else if (v.length > 0) v = '(' + v;
      e.target.value = v;
    });
  };

  applyCpf(document.getElementById('f-cpf'));
  applyCnpj(document.getElementById('f-cnpj'));
  applyPhone(document.getElementById('f-phone'));
}

document.addEventListener('DOMContentLoaded', initInputMasks);
setTimeout(initInputMasks, 500);

// ── Visão em Tabela do Kanban ───────────────────────────────
let kanbanViewMode = 'cols';

function setKanbanViewMode(mode) {
  kanbanViewMode = mode;
  const colsBtn = document.getElementById('btn-view-cols');
  const tableBtn = document.getElementById('btn-view-table');
  const colsContainer = document.getElementById('kanban-cols-container');
  const tableContainer = document.getElementById('kanban-table-container');

  if (mode === 'table') {
    if (colsBtn) { colsBtn.style.background = 'transparent'; colsBtn.style.color = 'var(--muted)'; }
    if (tableBtn) { tableBtn.style.background = 'var(--gold)'; tableBtn.style.color = '#07080c'; tableBtn.style.fontWeight = '600'; }
    if (colsContainer) colsContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    renderKanbanTable();
  } else {
    if (colsBtn) { colsBtn.style.background = 'var(--gold)'; colsBtn.style.color = '#07080c'; colsBtn.style.fontWeight = '600'; }
    if (tableBtn) { tableBtn.style.background = 'transparent'; tableBtn.style.color = 'var(--muted)'; }
    if (colsContainer) colsContainer.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
  }
}

function renderKanbanTable() {
  const tbody = document.getElementById('kanban-table-body');
  if (!tbody) return;
  
  const filtered = window.currentFilteredMembers || (typeof members !== 'undefined' ? members : []);
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--muted);">Nenhum membro encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(m => `
    <tr>
      <td style="font-weight:600; cursor:pointer;" onclick="openDetail('${m.id}')">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; border-radius:50%; background:var(--bg3); display:flex; align-items:center; justify-content:center; color:var(--gold); border:1px solid var(--border);">
            <i class="ti ti-user"></i>
          </div>
          <span>${escapeHtml(m.name)}</span>
        </div>
      </td>
      <td>
        <span style="padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600; background:rgba(255,255,255,0.06); color:var(--text);">
          ${STATUS_LABEL[m.status] || m.status}
        </span>
      </td>
      <td>${escapeHtml(m.specialty || '—')}</td>
      <td>${m.phone ? `<a href="https://wa.me/${m.phone.replace(/[^0-9]/g,'')}" target="_blank" style="color:var(--green); text-decoration:none;" onclick="event.stopPropagation()"><i class="ti ti-brand-whatsapp"></i> ${escapeHtml(m.phone)}</a>` : '—'}</td>
      <td>${escapeHtml(m.residence || '—')}</td>
      <td>${fmtDate(m.last_contact)}</td>
      <td style="text-align:right;">
        <button class="btn btn-sm" onclick="openDetail('${m.id}')" style="padding:4px 10px; font-size:12px;"><i class="ti ti-address-book"></i> Ficha</button>
      </td>
    </tr>
  `).join('');
}


// ── FINANCIAL & EVENTS MODULE IMPLEMENTATION ────────────────

let finTransactions = [
  { id: '1', type: 'receita', description: 'Mentoria Mensal - Dr. Roberto', client_name: 'Dr. Roberto Santos', category: 'Mentoria Rocket Club', amount: 3500, due_date: '2026-07-15', status: 'pago' },
  { id: '2', type: 'receita', description: 'Hospedagem & Servidor Anual', client_name: 'Agência Alfa Marketing', category: 'Hospedagem & Domínio', amount: 1200, due_date: '2026-07-20', status: 'pago' },
  { id: '3', type: 'receita', description: 'Mentoria Mensal - Dra. Juliana', client_name: 'Dra. Juliana Lima', category: 'Mentoria Rocket Club', amount: 3500, due_date: '2026-07-28', status: 'pendente' },
  { id: '4', type: 'despesa', description: 'Servidor Nuvem AWS / Neon DB', client_name: 'Amazon Web Services', category: 'Despesas Operacionais', amount: 450, due_date: '2026-07-10', status: 'pago' }
];

let finContracts = [
  { id: '1', client_name: 'Dr. Roberto Santos', service: 'Mentoria Rocket Club', amount: 3500, due_day: 15, status: 'ativo' },
  { id: '2', client_name: 'Dra. Juliana Lima', service: 'Mentoria Rocket Club', amount: 3500, due_day: 28, status: 'ativo' },
  { id: '3', client_name: 'Agência Alfa Marketing', service: 'Hospedagem Web & Domínio', amount: 100, due_day: 20, status: 'ativo' }
];

let appEvents = [
  { id: '1', title: 'Imersão Presencial Rocket Club 2026', category: 'Imersão Presencial', date: '2026-08-15T09:00', location: 'Hotel Windsor Barra - Rio de Janeiro/RJ', description: 'Encontro presencial exclusivo de alinhamento estratégico, networking avançado e novas metas da tripulação.', rsvp_count: 24, user_confirmed: true },
  { id: '2', title: 'Mastermind On-line de Estruturação', category: 'Mastermind Online', date: '2026-07-30T19:30', location: 'Transmissão ao Vivo (Zoom Exclusivo)', description: 'Sessão prática de análise de processos, gestão de equipes e escala de faturamento.', rsvp_count: 31, user_confirmed: false },
  { id: '3', title: 'Workshop de Posicionamento & Vendas', category: 'Workshop', date: '2026-09-05T14:00', location: 'Auditório Rocket Club - SP', description: 'Treinamento intensivo de autoridade no mercado digital e estratégias comerciais.', rsvp_count: 18, user_confirmed: false }
];

let activeEventCategoryFilter = 'all';

function switchFinTab(tab) {
  const btnOverview = document.getElementById('btn-fin-tab-overview');
  const btnTrans = document.getElementById('btn-fin-tab-transactions');
  const btnCont = document.getElementById('btn-fin-tab-contracts');
  const title = document.getElementById('fin-panel-title');

  [btnOverview, btnTrans, btnCont].forEach(b => {
    if (b) { b.style.background = 'transparent'; b.style.color = 'var(--muted)'; }
  });

  if (tab === 'overview' || tab === 'transactions') {
    if (btnOverview) { btnOverview.style.background = 'var(--gold)'; btnOverview.style.color = '#07080c'; btnOverview.style.fontWeight = '600'; }
    if (title) title.innerHTML = '<i class="ti ti-receipt" style="color:var(--gold)"></i> Lançamentos Financeiros';
    renderFinTransactions();
  } else if (tab === 'contracts') {
    if (btnCont) { btnCont.style.background = 'var(--gold)'; btnCont.style.color = '#07080c'; btnCont.style.fontWeight = '600'; }
    if (title) title.innerHTML = '<i class="ti ti-file-text" style="color:var(--gold)"></i> Contratos Recorrentes';
    renderFinContracts();
  }
}

function updateFinKPIs() {
  let mrr = 0;
  finContracts.forEach(c => { if (c.status === 'ativo') mrr += parseFloat(c.amount || 0); });

  let income = 0, expense = 0, pending = 0;
  finTransactions.forEach(t => {
    const amt = parseFloat(t.amount || 0);
    if (t.type === 'receita') {
      if (t.status === 'pago') income += amt;
      else if (t.status === 'pendente') pending += amt;
    } else if (t.type === 'despesa' && t.status === 'pago') {
      expense += amt;
    }
  });

  const mrrEl = document.getElementById('fin-mrr-val');
  const incEl = document.getElementById('fin-income-val');
  const expEl = document.getElementById('fin-expense-val');
  const penEl = document.getElementById('fin-pending-val');

  if (mrrEl) mrrEl.textContent = `R$ ${mrr.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
  if (incEl) incEl.textContent = `R$ ${income.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
  if (expEl) expEl.textContent = `R$ ${expense.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
  if (penEl) penEl.textContent = `R$ ${pending.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
}

function renderFinTransactions() {
  updateFinKPIs();
  const tbody = document.getElementById('fin-transactions-tbody');
  const typeFilter = document.getElementById('fin-filter-type') ? document.getElementById('fin-filter-type').value : '';
  const statusFilter = document.getElementById('fin-filter-status') ? document.getElementById('fin-filter-status').value : '';
  if (!tbody) return;

  const filtered = finTransactions.filter(t => {
    if (typeFilter && t.type !== typeFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--muted);">Nenhum lançamento encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const isIncome = t.type === 'receita';
    const statusColor = t.status === 'pago' ? 'var(--green)' : (t.status === 'atrasado' ? 'var(--red)' : 'var(--yellow)');
    const statusLabel = t.status === 'pago' ? 'Pago' : (t.status === 'atrasado' ? 'Atrasado' : 'Pendente');

    return `
      <tr>
        <td>${fmtDate(t.due_date)}</td>
        <td style="font-weight:600;">${escapeHtml(t.description)}</td>
        <td>${escapeHtml(t.client_name || '—')}</td>
        <td><span style="font-size:11px; padding:2px 8px; border-radius:10px; background:rgba(255,255,255,0.06); color:var(--text);">${escapeHtml(t.category)}</span></td>
        <td style="font-weight:700; color:${isIncome ? 'var(--green)' : 'var(--red)'}">
          ${isIncome ? '+' : '-'} R$ ${parseFloat(t.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}
        </td>
        <td>
          <span style="padding:3px 8px; border-radius:10px; font-size:11px; font-weight:700; background:rgba(255,255,255,0.05); color:${statusColor}; border:1px solid ${statusColor};">
            ${statusLabel}
          </span>
        </td>
        <td style="text-align:right;">
          ${t.status !== 'pago' ? `<button class="btn btn-sm" onclick="markFinPaid('${t.id}')" style="padding:4px 8px; font-size:11px; color:var(--green);"><i class="ti ti-check"></i> Baixa</button>` : ''}
          <button class="btn btn-sm" onclick="deleteFinTransaction('${t.id}')" style="padding:4px 8px; font-size:11px; color:var(--red);"><i class="ti ti-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderFinContracts() {
  updateFinKPIs();
  const tbody = document.getElementById('fin-transactions-tbody');
  if (!tbody) return;

  if (!finContracts.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--muted);">Nenhum contrato recorrente cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = finContracts.map(c => `
    <tr>
      <td>Dia ${c.due_day} de cada mês</td>
      <td style="font-weight:600;">${escapeHtml(c.client_name)}</td>
      <td>${escapeHtml(c.service)}</td>
      <td><span style="font-size:11px; padding:2px 8px; border-radius:10px; background:rgba(223,178,108,0.1); color:var(--gold);">Recorrente</span></td>
      <td style="font-weight:700; color:var(--gold);">R$ ${parseFloat(c.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})} /mês</td>
      <td><span style="padding:3px 8px; border-radius:10px; font-size:11px; font-weight:700; color:var(--green); border:1px solid var(--green);">Ativo</span></td>
      <td style="text-align:right;">
        <button class="btn btn-sm" onclick="deleteFinContract('${c.id}')" style="padding:4px 8px; font-size:11px; color:var(--red);"><i class="ti ti-trash"></i> Excluir</button>
      </td>
    </tr>
  `).join('');
}

function openAddFinTransaction(type) {
  const modal = document.getElementById('mo-fin-transaction');
  if (!modal) return;
  document.getElementById('fin-trans-id').value = '';
  document.getElementById('fin-trans-type').value = type || 'receita';
  document.getElementById('fin-trans-description').value = '';
  document.getElementById('fin-trans-amount').value = '';
  document.getElementById('fin-trans-due-date').value = new Date().toISOString().split('T')[0];
  modal.classList.add('open');
}

function saveFinTransaction(e) {
  e.preventDefault();
  const type = document.getElementById('fin-trans-type').value;
  const description = document.getElementById('fin-trans-description').value;
  const client_name = document.getElementById('fin-trans-client-name').value;
  const category = document.getElementById('fin-trans-category').value;
  const amount = parseFloat(document.getElementById('fin-trans-amount').value) || 0;
  const due_date = document.getElementById('fin-trans-due-date').value;
  const status = document.getElementById('fin-trans-status').value;

  finTransactions.unshift({
    id: Date.now().toString(),
    type, description, client_name, category, amount, due_date, status
  });

  closeModal('mo-fin-transaction');
  toast('Lançamento salvo com sucesso!');
  renderFinTransactions();
}

function markFinPaid(id) {
  const item = finTransactions.find(t => t.id === id);
  if (item) {
    item.status = 'pago';
    toast('Lançamento marcado como Pago!');
    renderFinTransactions();
  }
}

function deleteFinTransaction(id) {
  finTransactions = finTransactions.filter(t => t.id !== id);
  toast('Lançamento removido!');
  renderFinTransactions();
}

function openAddFinContract() {
  const modal = document.getElementById('mo-fin-contract');
  if (modal) modal.classList.add('open');
}

function saveFinContract(e) {
  e.preventDefault();
  const client_name = document.getElementById('fin-contract-client').value;
  const service = document.getElementById('fin-contract-service').value;
  const amount = parseFloat(document.getElementById('fin-contract-amount').value) || 0;
  const due_day = parseInt(document.getElementById('fin-contract-due-day').value, 10) || 10;
  const status = document.getElementById('fin-contract-status').value;

  finContracts.unshift({
    id: Date.now().toString(),
    client_name, service, amount, due_day, status
  });

  closeModal('mo-fin-contract');
  toast('Contrato cadastrado com sucesso!');
  switchFinTab('contracts');
}

function deleteFinContract(id) {
  finContracts = finContracts.filter(c => c.id !== id);
  toast('Contrato removido!');
  renderFinContracts();
}

// ── REDESIGNED EVENTS MODULE LOGIC ───────────────────────────
function filterEventsCategory(cat) {
  activeEventCategoryFilter = cat;
  const btns = document.querySelectorAll('#events-category-filters button');
  btns.forEach(b => {
    b.style.background = 'transparent';
    b.style.color = 'var(--muted)';
  });
  const activeBtn = document.getElementById('btn-ev-cat-' + (cat === 'all' ? 'all' : (cat.includes('Imers') ? 'imersao' : (cat.includes('Master') ? 'mastermind' : 'workshop'))));
  if (activeBtn) {
    activeBtn.style.background = 'var(--gold)';
    activeBtn.style.color = '#07080c';
    activeBtn.style.fontWeight = '600';
  }
  renderEventsGrid();
}

function renderEventsGrid() {
  const heroContainer = document.getElementById('events-hero-container');
  const gridContainer = document.getElementById('events-grid-container');
  const countLabel = document.getElementById('events-count-label');
  if (!gridContainer) return;

  const filtered = appEvents.filter(ev => {
    if (activeEventCategoryFilter !== 'all' && ev.category !== activeEventCategoryFilter) return false;
    return true;
  });

  if (countLabel) countLabel.textContent = `${filtered.length} evento(s) listado(s)`;

  // 1. Render Featured Hero Event (First event in list)
  if (heroContainer && appEvents.length > 0 && activeEventCategoryFilter === 'all') {
    const hero = appEvents[0];
    const d = new Date(hero.date);
    const day = d.getDate();
    const month = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    heroContainer.innerHTML = `
      <div style="background: linear-gradient(135deg, rgba(223,178,108,0.12) 0%, rgba(22,25,38,0.95) 100%); border: 1.5px solid var(--gold); border-radius: 18px; padding: 28px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 30px rgba(223,178,108,0.15);">
        <div style="display: flex; align-items: center; gap: 20px;">
          <div style="width: 72px; height: 72px; border-radius: 16px; background: var(--gold); color: #07080c; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; box-shadow: 0 4px 16px rgba(223,178,108,0.4);">
            <span style="font-size: 26px; line-height: 1;">${day}</span>
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">${month}</span>
          </div>
          <div>
            <span style="padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: rgba(223,178,108,0.2); color: var(--gold); border: 1px solid var(--gold);">
              <i class="ti ti-star"></i> DESTAQUE PRINCIPAL
            </span>
            <h3 style="font-size: 22px; font-weight: 700; color: var(--text); margin-top: 6px;">${escapeHtml(hero.title)}</h3>
            <div style="display: flex; gap: 16px; margin-top: 6px; font-size: 13px; color: var(--muted);">
              <span><i class="ti ti-clock" style="color:var(--gold)"></i> às ${time}h</span>
              <span><i class="ti ti-map-pin" style="color:var(--green)"></i> ${escapeHtml(hero.location)}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 700; color: var(--gold);"><i class="ti ti-users"></i> ${hero.rsvp_count} Tripulantes Confirmados</div>
            <span style="font-size: 11px; color: var(--muted);">Vagas exclusivas da mentoria</span>
          </div>
          <button class="btn ${hero.user_confirmed ? '' : 'gold'}" onclick="toggleEventRSVP('${hero.id}')" style="padding: 10px 20px; font-size: 13px;">
            <i class="ti ${hero.user_confirmed ? 'ti-check' : 'ti-user-check'}"></i> ${hero.user_confirmed ? 'Presença Confirmada' : 'Confirmar Minha Presença'}
          </button>
        </div>
      </div>
    `;
    heroContainer.style.display = 'block';
  } else if (heroContainer) {
    heroContainer.style.display = 'none';
  }

  // 2. Render Cards Grid
  if (!filtered.length) {
    gridContainer.innerHTML = '<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--muted);">Nenhum evento encontrado nesta categoria</div>';
    return;
  }

  gridContainer.innerHTML = filtered.map(ev => {
    const d = new Date(ev.date);
    const day = d.getDate();
    const month = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:22px; display:flex; flex-direction:column; gap:14px; position:relative; box-shadow:0 8px 24px rgba(0,0,0,0.3); transition:all 0.2s ease;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:48px; height:48px; border-radius:12px; background:var(--bg3); border:1px solid var(--gold); display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--gold); font-weight:700;">
              <span style="font-size:18px; line-height:1;">${day}</span>
              <span style="font-size:9px; text-transform:uppercase;">${month}</span>
            </div>
            <div>
              <span style="padding:3px 8px; border-radius:10px; font-size:10px; font-weight:700; text-transform:uppercase; background:rgba(223,178,108,0.12); color:var(--gold); border:1px solid rgba(223,178,108,0.3);">
                ${escapeHtml(ev.category)}
              </span>
              <div style="font-size:11px; color:var(--muted); margin-top:2px;"><i class="ti ti-clock"></i> ${time}h</div>
            </div>
          </div>
          <button onclick="deleteEvent('${ev.id}')" title="Excluir Evento" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px;"><i class="ti ti-trash"></i></button>
        </div>

        <h4 style="font-size:16px; font-weight:700; color:var(--text); line-height:1.3;">${escapeHtml(ev.title)}</h4>

        <div style="font-size:12px; color:var(--green); display:flex; align-items:center; gap:6px;">
          <i class="ti ti-map-pin"></i> ${escapeHtml(ev.location)}
        </div>

        <p style="font-size:12px; color:var(--muted); line-height:1.5;">${escapeHtml(ev.description)}</p>

        <div style="margin-top:auto; padding-top:14px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <span style="font-size:12px; color:var(--gold); font-weight:600;"><i class="ti ti-users"></i> ${ev.rsvp_count} Confirmados</span>
          <button class="btn btn-sm ${ev.user_confirmed ? '' : 'gold'}" onclick="toggleEventRSVP('${ev.id}')" style="font-size:12px;">
            <i class="ti ${ev.user_confirmed ? 'ti-check' : 'ti-plus'}"></i> ${ev.user_confirmed ? 'Confirmado' : 'Confirmar'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleEventRSVP(id) {
  const ev = appEvents.find(e => e.id === id);
  if (ev) {
    ev.user_confirmed = !ev.user_confirmed;
    ev.rsvp_count += ev.user_confirmed ? 1 : -1;
    toast(ev.user_confirmed ? 'Sua presença foi confirmada com sucesso!' : 'Presença desmarcada.');
    renderEventsGrid();
  }
}

function openAddEvent() {
  const modal = document.getElementById('mo-event');
  if (modal) modal.classList.add('open');
}

function saveEventForm(e) {
  e.preventDefault();
  const title = document.getElementById('event-title').value;
  const category = document.getElementById('event-category').value;
  const date = document.getElementById('event-date').value;
  const location = document.getElementById('event-location').value;
  const description = document.getElementById('event-description').value;

  appEvents.unshift({
    id: Date.now().toString(),
    title, category, date, location, description, rsvp_count: 1, user_confirmed: true
  });

  closeModal('mo-event');
  toast('Evento publicado com sucesso!');
  renderEventsGrid();
}

// ── ROCKET ACADEMY (E-LEARNING PLATFORM) ───────────────────
let academyCourses = [];
let currentAcademyCourse = null;
let currentAcademyLesson = null;
let academySelectedCategory = 'all';
let currentAcademyAllLessonsList = [];

let academyPlyrInstance = null;

function renderAcademyVideoPlayer(provider, url) {
  const wrapper = document.getElementById('academy-video-wrapper');
  if (!wrapper) return;

  if (academyPlyrInstance) {
    try { academyPlyrInstance.destroy(); } catch (e) {}
    academyPlyrInstance = null;
  }

  if (!url) {
    wrapper.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:380px; color:var(--muted); font-size:14px; text-align:center; padding:40px;"><i class="ti ti-video-off" style="font-size:40px; color:var(--gold); margin-bottom:12px;"></i>Selecione uma aula para assistir</div>`;
    return;
  }

  url = url.trim();

  // 1. YOUTUBE (Com Plyr sem título, sem copy link, sem assista no youtube)
  if (provider === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    videoId = (match && match[1]) ? match[1] : url;

    wrapper.innerHTML = `<div id="academy-plyr-target" data-plyr-provider="youtube" data-plyr-embed-id="${videoId}"></div>`;

    if (window.Plyr) {
      academyPlyrInstance = new Plyr('#academy-plyr-target', {
        controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
        settings: ['quality', 'speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
      });
    } else {
      wrapper.innerHTML = `<div style="position:relative; width:100%; padding-bottom:56.25%; height:0; overflow:hidden;"><iframe id="academy-video-iframe" src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&controls=1&rel=0" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return;
  }

  // 2. VIMEO (Com Plyr)
  if (provider === 'vimeo' || url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    const videoId = match ? match[1] : url;

    wrapper.innerHTML = `<div id="academy-plyr-target" data-plyr-provider="vimeo" data-plyr-embed-id="${videoId}"></div>`;

    if (window.Plyr) {
      academyPlyrInstance = new Plyr('#academy-plyr-target', {
        controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
        settings: ['quality', 'speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        vimeo: { byline: false, portrait: false, title: false, dnt: true }
      });
    } else {
      wrapper.innerHTML = `<div style="position:relative; width:100%; padding-bottom:56.25%; height:0; overflow:hidden;"><iframe id="academy-video-iframe" src="https://player.vimeo.com/video/${videoId}?autoplay=0&controls=1" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return;
  }

  // 3. DIRECT MP4 / GOOGLE DRIVE / FALLBACK IFRAME
  let srcUrl = url;
  if (provider === 'gdrive' || url.includes('drive.google.com')) {
    srcUrl = url.includes('/view') ? url.replace('/view', '/preview') : (url.includes('/preview') ? url : url + '/preview');
  }

  wrapper.innerHTML = `<div style="position:relative; width:100%; padding-bottom:56.25%; height:0; overflow:hidden;"><iframe id="academy-video-iframe" src="${srcUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
}

async function loadAcademyCourses() {
  try {
    const coursesView = document.getElementById('academy-courses-view');
    const playerView = document.getElementById('academy-player-view');
    if (coursesView && !currentAcademyCourse) {
      coursesView.style.display = 'flex';
      if (playerView) playerView.style.display = 'none';
    }

    const btnNew = document.getElementById('btn-academy-new-course');
    if (btnNew) {
      const isRoleAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'master');
      btnNew.style.display = isRoleAdmin ? 'inline-flex' : 'none';
    }

    const grid = document.getElementById('academy-courses-grid');
    if (grid && (!academyCourses || !academyCourses.length)) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:48px 20px;">
          <i class="ti ti-loader" style="font-size:32px; color:var(--gold); display:inline-block;"></i>
          <p style="font-size:13px; color:var(--muted); margin-top:12px;">Carregando cursos da Rocket Academy...</p>
        </div>`;
    }

    const data = await req('/academy.php?action=courses');
    academyCourses = Array.isArray(data) ? data : [];
    renderAcademyCoursesGrid();
  } catch (err) {
    console.error("Erro ao carregar cursos da Academy:", err);
    toast("Erro ao carregar cursos: " + err.message, false);
  }
}

function filterAcademyCategory(category, btnEl) {
  academySelectedCategory = category;
  document.querySelectorAll('#academy-category-pills button').forEach(b => {
    b.classList.remove('active-pill');
    b.style.background = 'var(--bg2)';
    b.style.color = 'var(--muted)';
  });
  if (btnEl) {
    btnEl.classList.add('active-pill');
    btnEl.style.background = 'var(--gold)';
    btnEl.style.color = '#07080c';
  }
  renderAcademyCoursesGrid();
}

function filterAcademyCourses() {
  renderAcademyCoursesGrid();
}

function renderAcademyCoursesGrid() {
  const grid = document.getElementById('academy-courses-grid');
  if (!grid) return;

  const search = (document.getElementById('academy-search-input')?.value || '').toLowerCase().trim();

  const filtered = academyCourses.filter(c => {
    const cat = (c.category || '').trim().toLowerCase();
    const targetCat = (academySelectedCategory || 'all').trim().toLowerCase();
    const matchCat = (targetCat === 'all') || (cat === targetCat) || (normalizeName(c.category) === normalizeName(academySelectedCategory));
    const matchSearch = !search || c.title.toLowerCase().includes(search) || (c.description && c.description.toLowerCase().includes(search));
    return matchCat && matchSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:48px 20px; background:var(--bg2); border-radius:16px; border:1px solid var(--border);">
        <i class="ti ti-school-off" style="font-size:48px; color:var(--muted); margin-bottom:12px; display:block;"></i>
        <h4 style="font-size:16px; font-weight:600; color:var(--text);">Nenhum curso encontrado</h4>
        <p style="font-size:13px; color:var(--muted); margin-top:4px;">Nenhum conteúdo atende aos filtros pesquisados.</p>
      </div>`;
    return;
  }

  const isRoleAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'master');

  grid.innerHTML = filtered.map(c => {
    const percent = c.progress_percent || 0;
    const coverUrl = c.cover_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80';
    const totalLessons = c.total_lessons || 0;
    const completedLessons = c.completed_lessons || 0;

    return `
      <div class="academy-course-card" onclick="openCoursePlayer('${c.id}')">
        <div style="position:relative; width:100%; height:160px; overflow:hidden;">
          <img src="${coverUrl}" alt="${escapeHtml(c.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'" />
          <span style="position:absolute; top:12px; left:12px; background:rgba(7, 8, 12, 0.85); backdrop-filter:blur(4px); color:var(--gold); font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; border:1px solid rgba(223, 178, 108, 0.3);">
            ${escapeHtml(c.category || 'Geral')}
          </span>
          ${isRoleAdmin ? `
            <button onclick="event.stopPropagation(); editAcademyCourse('${c.id}')" style="position:absolute; top:12px; right:12px; background:var(--bg2); border:1px solid var(--border); color:var(--text); width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Editar Curso">
              <i class="ti ti-pencil" style="font-size:14px;"></i>
            </button>
          ` : ''}
        </div>

        <div style="padding:18px; display:flex; flex-direction:column; gap:10px; flex:1;">
          <h3 style="font-size:16px; font-weight:700; color:var(--text); line-height:1.3;">${escapeHtml(c.title)}</h3>
          <p style="font-size:12.5px; color:var(--muted); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(c.description || 'Sem descrição.')}</p>
          
          <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border);">
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:11.5px; margin-bottom:6px;">
              <span style="color:var(--muted); font-weight:600;"><i class="ti ti-video" style="color:var(--gold);"></i> ${completedLessons}/${totalLessons} aulas</span>
              <span style="color:var(--gold); font-weight:700;">${percent}%</span>
            </div>
            <div style="width:100%; height:6px; background:var(--bg3); border-radius:3px; overflow:hidden;">
              <div style="width:${percent}%; height:100%; background:linear-gradient(90deg, var(--gold), #b88b48); border-radius:3px; transition:width 0.3s ease;"></div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function openCoursePlayer(courseId) {
  try {
    document.getElementById('academy-courses-view').style.display = 'none';
    document.getElementById('academy-player-view').style.display = 'flex';

    const course = await req(`/academy.php?action=course_details&id=${courseId}`);
    currentAcademyCourse = course;

    const courseTitleEl = document.getElementById('academy-breadcrumb-course') || document.getElementById('academy-player-course-title');
    if (courseTitleEl) courseTitleEl.textContent = course.title || 'Curso';

    const isRoleAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'master');
    const adminActions = document.getElementById('academy-admin-course-actions');
    if (adminActions) {
      if (isRoleAdmin) {
        adminActions.innerHTML = `
          <button class="btn gold btn-sm" onclick="openAcademyModuleModal('${course.id}')"><i class="ti ti-plus"></i> Novo Módulo</button>
          <button class="btn btn-sm" onclick="editAcademyCourse('${course.id}')"><i class="ti ti-pencil"></i> Editar Curso</button>`;
      } else {
        adminActions.innerHTML = '';
      }
    }

    renderAcademyPlayerSidebar();

    // Encontrar primeira aula
    currentAcademyAllLessonsList = [];
    (course.modules || []).forEach(m => {
      (m.lessons || []).forEach(l => {
        currentAcademyAllLessonsList.push(l);
      });
    });

    if (currentAcademyAllLessonsList.length > 0) {
      // Tentar selecionar a primeira aula não concluída
      const firstIncomplete = currentAcademyAllLessonsList.find(l => !l.is_completed);
      const targetLesson = firstIncomplete || currentAcademyAllLessonsList[0];
      selectAcademyLesson(targetLesson.id);
    } else {
      document.getElementById('academy-lesson-title').textContent = 'Nenhuma aula cadastrada';
      renderAcademyVideoPlayer(null, null);
    }
  } catch (err) {
    console.error("Erro ao carregar detalhes do curso:", err);
    toast("Erro ao carregar curso: " + err.message, false);
    closeCoursePlayer();
  }
}

function backToAcademyCourses() {
  closeCoursePlayer();
}

function closeCoursePlayer() {
  document.getElementById('academy-player-view').style.display = 'none';
  document.getElementById('academy-courses-view').style.display = 'flex';
  const breadcrumbSep = document.getElementById('academy-breadcrumb-sep-lesson');
  if (breadcrumbSep) breadcrumbSep.style.display = 'none';
  renderAcademyVideoPlayer(null, null);
  currentAcademyCourse = null;
  currentAcademyLesson = null;
  loadAcademyCourses();
}

function renderAcademyPlayerSidebar() {
  const container = document.getElementById('academy-sidebar-modules-list');
  if (!container || !currentAcademyCourse) return;

  const modules = currentAcademyCourse.modules || [];
  let totalLessons = 0;
  let completedLessons = 0;

  modules.forEach(m => {
    (m.lessons || []).forEach(l => {
      totalLessons++;
      if (l.is_completed) completedLessons++;
    });
  });

  const percent = (totalLessons > 0) ? Math.round((completedLessons / totalLessons) * 100) : 0;
  document.getElementById('academy-sidebar-progress-text').textContent = `${percent}%`;
  document.getElementById('academy-sidebar-progress-bar').style.width = `${percent}%`;

  const isRoleAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'master');

  if (!modules.length) {
    container.innerHTML = `
      <div style="padding:20px; text-align:center; color:var(--muted); font-size:13px;">
        Nenhum módulo cadastrado neste curso.
      </div>`;
    return;
  }

  container.innerHTML = modules.map(m => {
    const lessons = m.lessons || [];
    return `
      <div style="background:var(--bg3); border-radius:10px; border:1px solid var(--border); overflow:hidden;">
        <div style="padding:12px 14px; background:var(--bg2); display:flex; align-items:center; justify-content:space-between; font-weight:700; font-size:13px; color:var(--text);">
          <span style="display:flex; align-items:center; gap:6px;">
            <i class="ti ti-folder" style="color:var(--gold);"></i> ${m.title}
          </span>
          ${isRoleAdmin ? `
            <div style="display:flex; gap:4px;">
              <button class="btn btn-sm" onclick="openAcademyLessonModal('${m.id}')" title="Adicionar Aula" style="padding:2px 6px; font-size:10px; height:auto;"><i class="ti ti-plus"></i> Aula</button>
              <button class="btn btn-sm" onclick="editAcademyModule('${m.id}')" title="Editar Módulo" style="padding:2px 6px; font-size:10px; height:auto;"><i class="ti ti-pencil"></i></button>
            </div>
          ` : ''}
        </div>
        <div style="padding:8px; display:flex; flex-direction:column; gap:6px;">
          ${lessons.map(l => {
            const isActive = currentAcademyLesson && (currentAcademyLesson.id === l.id);
            const isDone = l.is_completed;
            const durationMin = l.duration_seconds ? Math.round(l.duration_seconds / 60) + ' min' : '';

            return `
              <div class="academy-lesson-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}" onclick="selectAcademyLesson('${l.id}')">
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                  <i class="ti ${isDone ? 'ti-circle-check-filled lesson-check' : 'ti-player-play'}" style="font-size:16px; flex-shrink:0; color:${isDone ? 'var(--green)' : (isActive ? 'var(--gold)' : 'var(--muted)')}"></i>
                  <span style="font-size:12.5px; font-weight:600; color:${isActive ? 'var(--gold)' : 'var(--text)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${l.title}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${durationMin ? `<span style="font-size:10.5px; color:var(--muted);">${durationMin}</span>` : ''}
                  ${isRoleAdmin ? `<i class="ti ti-pencil" onclick="event.stopPropagation(); editAcademyLesson('${l.id}')" style="font-size:12px; color:var(--muted); cursor:pointer;" title="Editar Aula"></i>` : ''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
}

function selectAcademyLesson(lessonId) {
  if (!currentAcademyCourse) return;

  let foundLesson = null;
  (currentAcademyCourse.modules || []).forEach(m => {
    (m.lessons || []).forEach(l => {
      if (l.id === lessonId) foundLesson = l;
    });
  });

  if (!foundLesson) return;
  currentAcademyLesson = foundLesson;

  document.getElementById('academy-lesson-title').textContent = foundLesson.title;
  const breadcrumbSep = document.getElementById('academy-breadcrumb-sep-lesson');
  const breadcrumbLesson = document.getElementById('academy-breadcrumb-lesson');
  if (breadcrumbSep && breadcrumbLesson) {
    breadcrumbSep.style.display = 'inline-flex';
    breadcrumbLesson.textContent = foundLesson.title;
  }
  document.getElementById('academy-lesson-duration').textContent = foundLesson.duration_seconds ? `Duração: ${Math.round(foundLesson.duration_seconds / 60)} min` : 'Gravado';
  document.getElementById('academy-lesson-description').innerHTML = foundLesson.description ? foundLesson.description.replace(/\n/g, '<br/>') : 'Sem descrição para esta aula.';

  const btnComplete = document.getElementById('btn-toggle-lesson-complete');
  if (btnComplete) {
    if (foundLesson.is_completed) {
      btnComplete.innerHTML = `<i class="ti ti-circle-check-filled" style="color:var(--green)"></i> Aula Concluída`;
      btnComplete.style.borderColor = 'var(--green)';
    } else {
      btnComplete.innerHTML = `<i class="ti ti-check"></i> Marcar como Concluída`;
      btnComplete.style.borderColor = 'var(--border)';
    }
  }

  // Renderizar Player de Vídeo com Plyr
  renderAcademyVideoPlayer(foundLesson.video_provider, foundLesson.video_url);

  // Renderizar Anexos
  const attachContainer = document.getElementById('academy-attachments-container');
  const attachList = document.getElementById('academy-attachments-list');
  const attachs = foundLesson.attachments_list || [];

  if (attachs && attachs.length > 0) {
    attachContainer.style.display = 'block';
    attachList.innerHTML = attachs.map(att => {
      const url = typeof att === 'string' ? att : (att.url || '#');
      const name = typeof att === 'string' ? att.split('/').pop() : (att.name || url);
      return `<a href="${url}" target="_blank" rel="noopener" style="font-size:12.5px; color:var(--gold); display:flex; align-items:center; gap:6px; text-decoration:none;"><i class="ti ti-download"></i> ${name}</a>`;
    }).join('');
  } else {
    attachContainer.style.display = 'none';
  }

  // Preencher anotações salvas do aluno
  const notesTextarea = document.getElementById('academy-student-notes');
  if (notesTextarea) {
    notesTextarea.value = foundLesson.student_notes || '';
  }

  renderAcademyPlayerSidebar();
  loadAcademyComments();
}

async function toggleCurrentLessonCompletion() {
  if (!currentAcademyLesson) return;

  const newStatus = !currentAcademyLesson.is_completed;
  currentAcademyLesson.is_completed = newStatus;

  try {
    await req('/academy.php?action=toggle_progress', {
      method: 'POST',
      body: { lesson_id: currentAcademyLesson.id, completed: newStatus }
    });

    selectAcademyLesson(currentAcademyLesson.id);
    toast(newStatus ? 'Aula marcada como concluída! 🎉' : 'Aula marcada como não concluída.');
  } catch (err) {
    console.error("Erro ao atualizar progresso da aula:", err);
    toast("Erro ao atualizar progresso: " + err.message, false);
  }
}

async function saveStudentNotes() {
  if (!currentAcademyLesson) return;

  const notes = document.getElementById('academy-student-notes')?.value || '';

  try {
    await req('/academy.php?action=save_notes', {
      method: 'POST',
      body: { lesson_id: currentAcademyLesson.id, notes }
    });

    currentAcademyLesson.student_notes = notes;
    toast('Anotações salvas com sucesso!');
  } catch (err) {
    console.error("Erro ao salvar anotações:", err);
    toast("Erro ao salvar anotações: " + err.message, false);
  }
}

function switchAcademyPlayerTab(tab) {
  const tabs = ['desc', 'notes', 'attachments', 'comments'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const content = document.getElementById(`academy-tab-content-${t}`) || (t === 'attachments' ? document.getElementById('academy-attachments-container') : null);
    if (btn) {
      if (t === tab) {
        btn.classList.add('active');
        btn.style.color = 'var(--gold)';
        btn.style.borderBottom = '2px solid var(--gold)';
      } else {
        btn.classList.remove('active');
        btn.style.color = 'var(--muted)';
        btn.style.borderBottom = 'none';
      }
    }
    if (content) {
      content.style.display = (t === tab) ? (t === 'desc' ? 'block' : 'flex') : 'none';
    }
  });

  if (tab === 'comments') {
    loadAcademyComments();
  }
}

function switchAcademyTab(tab) {
  switchAcademyPlayerTab(tab);
}

// ── SISTEMA DE COMENTÁRIOS E DÚVIDAS DAS AULAS ─────────────
let currentAcademyComments = [];

async function loadAcademyComments() {
  if (!currentAcademyLesson) return;
  const listEl = document.getElementById('academy-comments-list');
  const countEl = document.getElementById('academy-comments-count');

  if (listEl) {
    listEl.innerHTML = `<div style="text-align:center; padding:16px; color:var(--muted); font-size:12.5px;"><i class="ti ti-loader" style="font-size:20px; color:var(--gold);"></i> Carregando comentários...</div>`;
  }

  try {
    const data = await req(`/academy.php?action=comments&lesson_id=${currentAcademyLesson.id}`);
    currentAcademyComments = Array.isArray(data) ? data : [];
    if (countEl) countEl.textContent = currentAcademyComments.length;
    renderAcademyComments();
  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
    if (listEl) listEl.innerHTML = `<div style="color:var(--red); font-size:12px;">Erro ao carregar comentários: ${escapeHtml(err.message)}</div>`;
  }
}

function renderAcademyComments() {
  const listEl = document.getElementById('academy-comments-list');
  if (!listEl) return;

  if (!currentAcademyComments.length) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:24px 16px; background:var(--bg2); border-radius:10px; border:1px solid var(--border);">
        <i class="ti ti-messages-off" style="font-size:32px; color:var(--muted); margin-bottom:8px; display:block;"></i>
        <span style="font-size:13px; color:var(--muted);">Nenhuma dúvida ou comentário sobre esta aula ainda. Seja o primeiro a comentar!</span>
      </div>`;
    return;
  }

  const topComments = currentAcademyComments.filter(c => !c.parent_id);
  const repliesMap = {};
  currentAcademyComments.forEach(c => {
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
      repliesMap[c.parent_id].push(c);
    }
  });

  const isRoleAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'master');
  const currentUserId = currentUser ? currentUser.id : null;

  function renderCommentItem(c, isReply = false) {
    const isMasterAdmin = (c.author_role === 'master' || c.author_role === 'admin');
    const badgeColor = isMasterAdmin ? 'var(--gold)' : 'var(--blue)';
    const badgeText = isMasterAdmin ? (c.author_role === 'master' ? 'Master' : 'Admin') : 'Tripulação';
    const dateStr = c.created_at ? new Date(c.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    const canDelete = isRoleAdmin || (currentUserId && (c.user_id === currentUserId || c.member_id === currentUserId));

    const replies = repliesMap[c.id] || [];

    return `
      <div style="display:flex; gap:12px; background:var(--bg2); padding:12px 14px; border-radius:10px; border:1px solid var(--border); ${isReply ? 'margin-left:24px; border-left:3px solid var(--gold);' : ''}">
        <div style="width:34px; height:34px; border-radius:50%; background:var(--bg3); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; color:var(--gold); flex-shrink:0;">
          ${escapeHtml((c.author_name || 'U')[0].toUpperCase())}
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; font-size:13px; color:var(--text);">${escapeHtml(c.author_name)}</span>
              <span style="font-size:10px; font-weight:700; color:${badgeColor}; background:rgba(223,178,108,0.12); padding:2px 8px; border-radius:10px; border:1px solid rgba(223,178,108,0.3); text-transform:uppercase;">
                ${badgeText}
              </span>
            </div>
            <span style="font-size:11px; color:var(--muted);">${dateStr}</span>
          </div>
          
          <div style="font-size:13px; color:var(--text); line-height:1.5; white-space:pre-wrap;">${escapeHtml(c.content)}</div>
          
          <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
            <button onclick="replyToAcademyComment('${c.id}', '${escapeHtml(c.author_name)}')" style="background:none; border:none; color:var(--gold); font-size:11.5px; font-weight:600; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;">
              <i class="ti ti-corner-up-left"></i> Responder
            </button>
            ${canDelete ? `
              <button onclick="deleteAcademyComment('${c.id}')" style="background:none; border:none; color:var(--red); font-size:11.5px; font-weight:600; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;">
                <i class="ti ti-trash"></i> Excluir
              </button>
            ` : ''}
          </div>

          ${replies.length ? `
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
              ${replies.map(r => renderCommentItem(r, true)).join('')}
            </div>
          ` : ''}
        </div>
      </div>`;
  }

  listEl.innerHTML = topComments.map(c => renderCommentItem(c, false)).join('');
}

function replyToAcademyComment(parentId, authorName) {
  const parentIdInput = document.getElementById('academy-comment-parent-id');
  const noticeEl = document.getElementById('comment-reply-notice');
  const authorEl = document.getElementById('comment-reply-author');
  const inputEl = document.getElementById('academy-comment-input');

  if (parentIdInput) parentIdInput.value = parentId;
  if (authorEl) authorEl.textContent = authorName;
  if (noticeEl) noticeEl.style.display = 'flex';
  if (inputEl) {
    inputEl.focus();
    inputEl.placeholder = `Escreva sua resposta para ${authorName}...`;
  }
}

function cancelCommentReply() {
  const parentIdInput = document.getElementById('academy-comment-parent-id');
  const noticeEl = document.getElementById('comment-reply-notice');
  const inputEl = document.getElementById('academy-comment-input');

  if (parentIdInput) parentIdInput.value = '';
  if (noticeEl) noticeEl.style.display = 'none';
  if (inputEl) {
    inputEl.placeholder = 'Escreva aqui sua dúvida ou comentário...';
  }
}

async function sendAcademyComment() {
  if (!currentAcademyLesson) return;
  const inputEl = document.getElementById('academy-comment-input');
  const parentIdInput = document.getElementById('academy-comment-parent-id');

  const content = (inputEl?.value || '').trim();
  const parent_id = parentIdInput?.value || null;

  if (!content) {
    toast("Por favor, digite um comentário.", false);
    return;
  }

  try {
    await req('/academy.php?action=save_comment', {
      method: 'POST',
      body: {
        lesson_id: currentAcademyLesson.id,
        parent_id: parent_id,
        content: content
      }
    });

    inputEl.value = '';
    cancelCommentReply();
    toast("Comentário enviado com sucesso!");
    loadAcademyComments();
  } catch (err) {
    console.error("Erro ao enviar comentário:", err);
    toast("Erro ao enviar comentário: " + err.message, false);
  }
}

async function deleteAcademyComment(commentId) {
  if (!confirm("Deseja realmente excluir este comentário?")) return;

  try {
    await req('/academy.php?action=delete_comment', {
      method: 'POST',
      body: { id: commentId }
    });
    toast("Comentário excluído.");
    loadAcademyComments();
  } catch (err) {
    console.error("Erro ao excluir comentário:", err);
    toast("Erro ao excluir comentário: " + err.message, false);
  }
}

function navigateLesson(direction) {
  if (!currentAcademyAllLessonsList.length || !currentAcademyLesson) return;
  const idx = currentAcademyAllLessonsList.findIndex(l => l.id === currentAcademyLesson.id);
  if (idx !== -1) {
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < currentAcademyAllLessonsList.length) {
      selectAcademyLesson(currentAcademyAllLessonsList[nextIdx].id);
    }
  }
}

// ── ADMIN MODALS & ACTIONS FOR ACADEMY ────────────────────
function openCourseModal(courseId = null) {
  if (courseId) {
    editAcademyCourse(courseId);
  } else {
    openAcademyCourseModal(null);
  }
}

function openModuleModal() {
  if (!currentAcademyCourse) {
    toast('Selecione um curso primeiro', false);
    return;
  }
  openAcademyModuleModal(currentAcademyCourse.id);
}

function openLessonModal() {
  if (!currentAcademyCourse || !currentAcademyCourse.modules || !currentAcademyCourse.modules.length) {
    toast('Crie pelo menos um módulo no curso antes de adicionar aulas.', false);
    return;
  }
  openAcademyLessonModal(currentAcademyCourse.modules[0].id);
}

// ── DETECÇÃO AUTOMÁTICA DE PROVEDOR DE VÍDEO (YouTube vs Vimeo) ──
function detectAcademyVideoProvider(url) {
  if (!url) return;
  url = url.trim().toLowerCase();
  const select = document.getElementById('academy-lesson-provider');
  if (!select) return;

  if (url.includes('vimeo.com')) {
    select.value = 'vimeo';
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    select.value = 'youtube';
  } else if (url.includes('drive.google.com')) {
    select.value = 'gdrive';
  } else if (url.endsWith('.mp4') || url.includes('mp4')) {
    select.value = 'mp4';
  }
}

// ── PREVIEW DE CAPA DO CURSO ──
function updateCourseCoverPreview(url) {
  const box = document.getElementById('academy-course-cover-preview-box');
  const img = document.getElementById('academy-course-cover-preview');
  if (box && img) {
    if (url && url.trim()) {
      img.src = url.trim();
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  }
}

// ── UPLOAD DE CAPA DO CURSO VIA FILE INPUT ──
async function uploadAcademyCourseCoverFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);

  try {
    toast('Enviando imagem de capa...', true);
    const res = await fetch('api/upload.php', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.ok && data.url) {
      const coverInput = document.getElementById('academy-course-cover');
      if (coverInput) coverInput.value = data.url;
      updateCourseCoverPreview(data.url);
      toast('Imagem de capa enviada com sucesso!');
    } else {
      toast('Erro no upload: ' + (data.message || 'Falha ao salvar'), false);
    }
  } catch (err) {
    console.error("Erro ao fazer upload da capa:", err);
    toast("Erro ao enviar imagem: " + err.message, false);
  }
}

// ── PREVIEW DE THUMBNAIL DA AULA ──
function updateLessonCoverPreview(url) {
  const box = document.getElementById('academy-lesson-cover-preview-box');
  const img = document.getElementById('academy-lesson-cover-preview');
  if (box && img) {
    if (url && url.trim()) {
      img.src = url.trim();
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  }
}

// ── UPLOAD DE THUMBNAIL DA AULA VIA FILE INPUT ──
async function uploadAcademyLessonCoverFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);

  try {
    toast('Enviando thumbnail da aula...', true);
    const res = await fetch('api/upload.php', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.ok && data.url) {
      const coverInput = document.getElementById('academy-lesson-cover-input');
      if (coverInput) coverInput.value = data.url;
      updateLessonCoverPreview(data.url);
      toast('Thumbnail enviada com sucesso!');
    } else {
      toast('Erro no upload: ' + (data.message || 'Falha ao salvar'), false);
    }
  } catch (err) {
    console.error("Erro ao fazer upload da thumbnail:", err);
    toast("Erro ao enviar thumbnail: " + err.message, false);
  }
}

function openLessonModal() {
  if (!currentAcademyCourse || !currentAcademyCourse.modules || !currentAcademyCourse.modules.length) {
    toast('Crie pelo menos um módulo no curso antes de adicionar aulas.', false);
    return;
  }
  openAcademyLessonModal(currentAcademyCourse.modules[0].id);
}

function openAcademyCourseModal(course = null) {
  document.getElementById('academy-course-id').value = course ? course.id : '';
  document.getElementById('academy-course-title').value = course ? course.title : '';
  document.getElementById('academy-course-category').value = course ? (course.category || 'Mentorias') : 'Mentorias';
  const levelEl = document.getElementById('academy-course-level');
  if (levelEl) levelEl.value = course ? (course.level || 'Geral') : 'Geral';
  document.getElementById('academy-course-position').value = course ? (course.position || 0) : 0;
  document.getElementById('academy-course-description').value = course ? (course.description || '') : '';
  
  const coverUrl = course ? (course.cover_image || '') : '';
  document.getElementById('academy-course-cover').value = coverUrl;
  updateCourseCoverPreview(coverUrl);

  const statusCheck = document.getElementById('academy-course-status-check');
  if (statusCheck) statusCheck.checked = course ? (course.status !== 'draft') : true;

  document.getElementById('academy-course-modal-title').textContent = course ? 'Editar Curso — Academy' : 'Novo Curso — Academy';
  document.getElementById('mo-academy-course').classList.add('open');
}

function editAcademyCourse(courseId) {
  const c = academyCourses.find(x => x.id === courseId) || currentAcademyCourse;
  if (c) openAcademyCourseModal(c);
}

async function saveAcademyCourse(e) {
  e.preventDefault();
  const id = document.getElementById('academy-course-id').value;
  const title = document.getElementById('academy-course-title').value;
  const category = document.getElementById('academy-course-category').value;
  const levelEl = document.getElementById('academy-course-level');
  const level = levelEl ? levelEl.value : 'Geral';
  const position = document.getElementById('academy-course-position').value;
  const description = document.getElementById('academy-course-description').value;
  const cover_image = document.getElementById('academy-course-cover').value;
  const statusCheck = document.getElementById('academy-course-status-check');
  const status = (statusCheck && !statusCheck.checked) ? 'draft' : 'published';

  try {
    await req('/academy.php?action=save_course', {
      method: 'POST',
      body: { id, title, category, level, position, description, cover_image, status }
    });

    closeModal('mo-academy-course');
    toast('Curso salvo com sucesso!');

    if (currentAcademyCourse && currentAcademyCourse.id === id) {
      openCoursePlayer(id);
    } else {
      loadAcademyCourses();
    }
  } catch (err) {
    console.error("Erro ao salvar curso:", err);
    toast("Erro ao salvar curso: " + err.message, false);
  }
}

function openAcademyModuleModal(courseId, module = null) {
  document.getElementById('academy-module-id').value = module ? module.id : '';
  document.getElementById('academy-module-course-id').value = courseId;
  const titleInput = document.getElementById('academy-module-title-input') || document.getElementById('academy-module-title');
  if (titleInput) titleInput.value = module ? module.title : '';
  const posInput = document.getElementById('academy-module-position-input') || document.getElementById('academy-module-position');
  if (posInput) posInput.value = module ? (module.position || 0) : 0;
  const descInput = document.getElementById('academy-module-desc-input') || document.getElementById('academy-module-description');
  if (descInput) descInput.value = module ? (module.description || '') : '';

  document.getElementById('academy-module-modal-title').textContent = module ? 'Editar Módulo' : 'Novo Módulo';
  document.getElementById('mo-academy-module').classList.add('open');
}

function editAcademyModule(moduleId) {
  if (!currentAcademyCourse) return;
  const mod = (currentAcademyCourse.modules || []).find(m => m.id === moduleId);
  if (mod) openAcademyModuleModal(currentAcademyCourse.id, mod);
}

async function saveAcademyModule(e) {
  e.preventDefault();
  const id = document.getElementById('academy-module-id').value;
  const course_id = document.getElementById('academy-module-course-id').value;
  const titleInput = document.getElementById('academy-module-title-input') || document.getElementById('academy-module-title');
  const title = titleInput ? titleInput.value : '';
  const posInput = document.getElementById('academy-module-position-input') || document.getElementById('academy-module-position');
  const position = posInput ? posInput.value : 0;
  const descInput = document.getElementById('academy-module-desc-input') || document.getElementById('academy-module-description');
  const description = descInput ? descInput.value : '';

  try {
    await req('/academy.php?action=save_module', {
      method: 'POST',
      body: { id, course_id, title, position, description }
    });

    closeModal('mo-academy-module');
    toast('Módulo salvo com sucesso!');
    if (currentAcademyCourse) openCoursePlayer(currentAcademyCourse.id);
  } catch (err) {
    console.error("Erro ao salvar módulo:", err);
    toast("Erro ao salvar módulo: " + err.message, false);
  }
}

function openAcademyLessonModal(moduleId, lesson = null) {
  document.getElementById('academy-lesson-id').value = lesson ? lesson.id : '';
  document.getElementById('academy-lesson-module-id').value = moduleId;
  document.getElementById('academy-lesson-title-input').value = lesson ? lesson.title : '';
  const urlVal = lesson ? (lesson.video_url || '') : '';
  document.getElementById('academy-lesson-url').value = urlVal;
  detectAcademyVideoProvider(urlVal);
  if (lesson && lesson.video_provider) {
    document.getElementById('academy-lesson-provider').value = lesson.video_provider;
  }
  document.getElementById('academy-lesson-duration-input').value = lesson ? (lesson.duration_seconds ? Math.round(lesson.duration_seconds / 60) : '') : '';
  document.getElementById('academy-lesson-position-input').value = lesson ? (lesson.position || 0) : 0;
  document.getElementById('academy-lesson-desc-input').value = lesson ? (lesson.description || '') : '';

  const coverInput = document.getElementById('academy-lesson-cover-input');
  if (coverInput) {
    const coverVal = lesson ? (lesson.cover_image || '') : '';
    coverInput.value = coverVal;
    updateLessonCoverPreview(coverVal);
  }

  let attachStr = '';
  if (lesson && lesson.attachments_list) {
    attachStr = lesson.attachments_list.map(att => typeof att === 'string' ? att : (att.url || '')).join(', ');
  }
  document.getElementById('academy-lesson-attachments-input').value = attachStr;

  document.getElementById('academy-lesson-modal-title').textContent = lesson ? 'Editar Aula' : 'Nova Aula';
  document.getElementById('mo-academy-lesson').classList.add('open');
}

function editAcademyLesson(lessonId) {
  if (!currentAcademyCourse) return;
  let targetModuleId = null;
  let targetLesson = null;

  (currentAcademyCourse.modules || []).forEach(m => {
    (m.lessons || []).forEach(l => {
      if (l.id === lessonId) {
        targetModuleId = m.id;
        targetLesson = l;
      }
    });
  });

  if (targetModuleId && targetLesson) {
    openAcademyLessonModal(targetModuleId, targetLesson);
  }
}

async function saveAcademyLesson(e) {
  e.preventDefault();
  const id = document.getElementById('academy-lesson-id').value;
  const module_id = document.getElementById('academy-lesson-module-id').value;
  const title = document.getElementById('academy-lesson-title-input').value;
  const video_provider = document.getElementById('academy-lesson-provider').value;
  const video_url = document.getElementById('academy-lesson-url').value;
  const durationMin = parseInt(document.getElementById('academy-lesson-duration-input').value, 10) || 0;
  const position = parseInt(document.getElementById('academy-lesson-position-input').value, 10) || 0;
  const description = document.getElementById('academy-lesson-desc-input').value;
  const rawAttachments = document.getElementById('academy-lesson-attachments-input').value;

  const attachments = rawAttachments.split(',').map(s => s.trim()).filter(s => s.length > 0);

  try {
    await req('/academy.php?action=save_lesson', {
      method: 'POST',
      body: {
        id, module_id, title, video_provider, video_url,
        duration_seconds: durationMin * 60,
        position, description, attachments
      }
    });

    closeModal('mo-academy-lesson');
    toast('Aula salva com sucesso!');
    if (currentAcademyCourse) openCoursePlayer(currentAcademyCourse.id);
  } catch (err) {
    console.error("Erro ao salvar aula:", err);
    toast("Erro ao salvar aula: " + err.message, false);
  }
}

// ── Alternância de Exibição do CRM Kanban ────────────────
function switchKanbanView(mode) {
  const boardCol = document.getElementById('kanban-cols-container');
  const tableCol = document.getElementById('kanban-table-container');
  const btnBoard = document.getElementById('btn-view-board');
  const btnTable = document.getElementById('btn-view-table');

  if (mode === 'table') {
    if (boardCol) boardCol.style.display = 'none';
    if (tableCol) tableCol.style.display = 'block';
    if (btnBoard) { btnBoard.classList.remove('active'); btnBoard.style.background = 'transparent'; btnBoard.style.color = 'var(--muted)'; }
    if (btnTable) { btnTable.classList.add('active'); btnTable.style.background = 'var(--gold)'; btnTable.style.color = '#07080c'; }
  } else {
    if (boardCol) boardCol.style.display = 'block';
    if (tableCol) tableCol.style.display = 'none';
    if (btnBoard) { btnBoard.classList.add('active'); btnBoard.style.background = 'var(--gold)'; btnBoard.style.color = '#07080c'; }
    if (btnTable) { btnTable.classList.remove('active'); btnTable.style.background = 'transparent'; btnTable.style.color = 'var(--muted)'; }
  }
}

// ── Alternância de Abas do Financeiro ──────────────────────
function switchFinTab(tab) {
  const btnOverview = document.getElementById('btn-fin-tab-overview');
  const btnTx = document.getElementById('btn-fin-tab-transactions');
  const btnContracts = document.getElementById('btn-fin-tab-contracts');
  const chartPanel = document.getElementById('fin-chart-panel');
  const titleEl = document.getElementById('fin-panel-title');

  if (btnOverview) { btnOverview.style.background = tab === 'overview' ? 'var(--gold)' : 'transparent'; btnOverview.style.color = tab === 'overview' ? '#07080c' : 'var(--muted)'; }
  if (btnTx) { btnTx.style.background = tab === 'transactions' ? 'var(--gold)' : 'transparent'; btnTx.style.color = tab === 'transactions' ? '#07080c' : 'var(--muted)'; }
  if (btnContracts) { btnContracts.style.background = tab === 'contracts' ? 'var(--gold)' : 'transparent'; btnContracts.style.color = tab === 'contracts' ? '#07080c' : 'var(--muted)'; }

  if (chartPanel) {
    chartPanel.style.display = (tab === 'overview') ? 'block' : 'none';
  }
  if (titleEl) {
    if (tab === 'contracts') {
      titleEl.innerHTML = '<i class="ti ti-file-text" style="color:var(--gold)"></i> Contratos Recorrentes de Mentoria';
    } else {
      titleEl.innerHTML = '<i class="ti ti-receipt" style="color:var(--gold)"></i> Lançamentos Financeiros';
    }
  }
}

// ── Renderização do Gráfico do Dashboard (Chart.js) ──────
function renderDashboardChart(stats) {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById('dashStatusChart');
  if (!ctx) return;

  if (window.dashStatusChartInstance) {
    window.dashStatusChartInstance.destroy();
  }

  const values = [
    stats.cinza || 0,
    stats.azul || 0,
    stats.verde || 0,
    stats.amarela || 0,
    stats.vermelha || 0
  ];

  window.dashStatusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Não Alocado', 'Iniciante', 'Engajado', 'Morno', 'Atenção Urgente'],
      datasets: [{
        data: values,
        backgroundColor: ['#94a3b8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        borderColor: '#0f111a',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f1f5f9', font: { family: 'Outfit', size: 12 } }
        }
      }
    }
  });
}

// ── Renderização do Gráfico Financeiro (Chart.js) ─────────
function renderFinancialChart() {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById('finOverviewChart');
  if (!ctx) return;

  if (window.finChartInstance) {
    window.finChartInstance.destroy();
  }

  window.finChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Receitas (R$)',
          data: [12000, 19000, 24000, 31000, 38000, 42000, 48000],
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderRadius: 6
        },
        {
          label: 'Despesas (R$)',
          data: [4000, 5500, 7000, 8200, 9100, 10500, 11200],
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8', font: { family: 'Outfit' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8', font: { family: 'Outfit' } }, grid: { color: 'rgba(255,255,255,0.05)' } }
      },
      plugins: {
        legend: {
          labels: { color: '#f1f5f9', font: { family: 'Outfit', size: 12 } }
        }
      }
    }
  });
}

// Renderizar gráfico financeiro quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    renderFinancialChart();
  }, 500);
});

// ============================================================================
// ── MÓDULO DA WIKI & BASE DE CONHECIMENTO ─────────────────────────────────────
// ============================================================================

let wikiArticles = [];
let wikiDepartments = [];
let currentWikiArticleId = null;
let activeWikiDeptFilter = 'all';
let wikiLikesMap = {};

// Dados Demonstrativos Iniciais (Garantem uma experiência incrível imediatamente)
const demoWikiArticles = [
  {
    id: 'demo-sop-01',
    title: 'SOP 01 — Processo de Onboarding de Novos Clientes',
    category: 'SOPs & Processos',
    summary: 'Procedimento operacional padrão para recepcionar, cadastrar e alinhar a jornada dos novos participantes do Rocket Club.',
    content: `## 📌 Objetivo do Processo
Este **Procedimento Operacional Padrão (SOP)** estabelece o fluxo exato de integração de novos empresários e alunos no ecossistema **Rocket Club**.

> [!NOTE]
> Todos os novos membros devem passar por esta etapa em até **48 horas úteis** após a confirmação da matrícula.

---

## 🚀 Etapas do Onboarding

### 1. Boas-Vindas & Acesso à Plataforma
- [x] Enviar mensagem oficial de boas-vindas pelo WhatsApp.
- [x] Liberar credenciais de acesso ao painel do aluno (**Rocket Academy**).
- [x] Convidar para o grupo restrito de membros no WhatsApp/Telegram.

### 2. Mapeamento Inicial & Anamnese
- [ ] Enviar link do formulário de diagnóstico empresarial (**Ficha Executive**).
- [ ] Validar faturamento atual, nicho de atuação e principal gargalo do negócio.
- [ ] Agendar reunião de alinhamento inicial com o mentor responsável.

> [!TIP]
> Durante a anamnese, certifique-se de perguntar sobre datas comemorativas e hobbies do cliente para personalizar os cards do Members Book.

---

## 📊 Matriz de Responsabilidades

| Etapa | Responsável | Prazo Máximo | Canal |
| :--- | :--- | :--- | :--- |
| Envio de Boas-Vindas | Sucesso do Cliente | 2 horas | WhatsApp |
| Liberação da Plataforma | Suporte Técnico | 4 horas | E-mail |
| Reunião de Alinhamento | Mentoria | 48 horas | Zoom / Presencial |

\`\`\`json
{
  "status": "onboarding_active",
  "sla_hours": 48,
  "automation": "enabled"
}
\`\`\`

---

### ⚠️ Ações de Riscos (SLA Vencido)
Se o aluno não responder no prazo de 24 horas, acionar o gestor comercial para contato telefônico direto.`,
    department_name: 'Operacional',
    department_id: null,
    is_public: true,
    views_count: 142,
    creator_name: 'Equipe de Operações',
    created_at: '2026-08-01 10:00:00',
    updated_at: '2026-08-03 14:20:00'
  },
  {
    id: 'demo-sop-02',
    title: 'Manual do Comercial — Script de Vendas & Objeções 10X',
    category: 'Manuais & Guias',
    summary: 'Guia prático para fechamento de mentorias, estratégias de contorno de objeções de preço e escassez.',
    content: `## 🎯 Diretrizes Comerciais Rocket Club
Este manual reúne o posicionamento comercial oficial para conversão de mentores, empresários e alunos de alta performance.

---

## 🗣️ Estrutura da Ligação de Vendas (Pitch de 4 Passos)

### 1. Conexão & Diagnóstico (10 min)
- Entenda a fundo a dor atual do prospect.
- Faça perguntas abertas: *"Qual o seu faturamento médio mensal hoje e onde você quer chegar nos próximos 12 meses?"*

### 2. Apresentação da Solução (15 min)
- Demonstre o valor do ecossistema e networking do **Rocket Club**.
- Mostre casos reais de sucesso de membros do mesmo setor.

### 3. Apresentação da Oferta & Escassez (5 min)
> [!WARNING]
> Nunca ofereça desconto direto. Trabalhe sempre com bônus de aceleração ou extensão de acompanhamento.

### 4. Fechamento & Matrícula (10 min)
- Apresente as formas de pagamento disponíveis.

---

## 💡 Como Contornar Objeções Frequentes

> [!TIP]
> **Objeção:** *"Preciso falar com meu sócio/esposa antes."*  
> **Resposta recomendada:** *"Perfeito! Entendo perfeitamente. O que acha de agendarmos 10 minutos amanhã cedo para tirarmos as dúvidas de vocês dois juntos?"*`,
    department_name: 'Comercial',
    department_id: null,
    is_public: true,
    views_count: 98,
    creator_name: 'Diretoria Comercial',
    created_at: '2026-07-28 11:30:00',
    updated_at: '2026-08-02 09:15:00'
  },
  {
    id: 'demo-sop-03',
    title: 'Diretrizes Financeiras — Reembolsos, NF & Cobranças',
    category: 'Políticas & Regras',
    summary: 'Instruções para prestação de contas da equipe, solicitação de reembolsos e emissão de notas fiscais de mentorias.',
    content: `## 💳 Política Financeira Interna
Instruções obrigatórias para toda a equipe sobre controle de caixa, emissão de notas e solicitações de ressarcimento.

---

## 📝 Regras de Reembolso
1. Todas as notas fiscais de despesas devem ser enviadas até o dia 25 de cada mês.
2. Despesas acima de R$ 500,00 exigem pré-aprovação da diretoria.
3. Não são aceitos recibos simples sem CNPJ do fornecedor.

> [!NOTE]
> O prazo médio de pagamento dos reembolsos aprovados é de **3 dias úteis**.`,
    department_name: 'Financeiro',
    department_id: null,
    is_public: true,
    views_count: 65,
    creator_name: 'Departamento Financeiro',
    created_at: '2026-07-20 15:00:00',
    updated_at: '2026-08-01 16:45:00'
  }
];

// Inicialização Automática da Wiki ao carregar a página
function initWikiPage() {
  if (window.currentPage !== 'wiki') return;
  loadWikiArticles();
}

async function loadWikiArticles() {
  try {
    const statsEl = document.getElementById('wiki-stats-summary');
    if (statsEl) statsEl.innerHTML = '<i class="ti ti-loader rotate"></i> Carregando artigos...';

    const res = await req('/wiki.php');
    
    if (res && res.articles && res.articles.length > 0) {
      wikiArticles = res.articles;
      wikiDepartments = res.departments || [];
    } else {
      // Usar dados demonstrativos se o banco ainda não tiver artigos
      wikiArticles = demoWikiArticles;
      wikiDepartments = [
        { id: 'd1', name: 'Operacional', is_fixed: true },
        { id: 'd2', name: 'Comercial', is_fixed: true },
        { id: 'd3', name: 'Financeiro', is_fixed: true },
        { id: 'd4', name: 'Jurídico', is_fixed: true },
        { id: 'd5', name: 'Tecnologia & Growth', is_fixed: false }
      ];
    }

    renderWikiStats();
    renderWikiDeptPills();
    renderWikiArticleList();
    
    // Selecionar o primeiro artigo por padrão se nenhum estiver ativo
    if (wikiArticles.length > 0 && !currentWikiArticleId) {
      selectWikiArticle(wikiArticles[0].id);
    }
  } catch (err) {
    console.warn("Utilizando dados de demonstração da Wiki devido a aviso no backend:", err);
    wikiArticles = demoWikiArticles;
    renderWikiStats();
    renderWikiDeptPills();
    renderWikiArticleList();
    if (wikiArticles.length > 0 && !currentWikiArticleId) {
      selectWikiArticle(wikiArticles[0].id);
    }
  }
}

function renderWikiStats() {
  const statsEl = document.getElementById('wiki-stats-summary');
  if (!statsEl) return;
  const total = wikiArticles.length;
  const deptsCount = new Set(wikiArticles.map(a => a.department_name || 'Geral')).size;
  statsEl.innerHTML = `<strong>${total}</strong> artigos cadastrados • <strong>${deptsCount}</strong> departamentos`;
}

function renderWikiDeptPills() {
  const container = document.getElementById('wiki-dept-pills');
  if (!container) return;

  const deptsSet = new Set(['Operacional', 'Comercial', 'Financeiro', 'Jurídico', 'SOPs & Processos']);
  wikiArticles.forEach(a => { if (a.department_name) deptsSet.add(a.department_name); });

  let html = `
    <button class="wiki-pill ${activeWikiDeptFilter === 'all' ? 'active' : ''}" onclick="filterWikiByDept('all', this)">
      <i class="ti ti-apps"></i> Todos
    </button>
  `;

  deptsSet.forEach(d => {
    const isActive = activeWikiDeptFilter === d;
    html += `
      <button class="wiki-pill ${isActive ? 'active' : ''}" onclick="filterWikiByDept('${d.replace(/'/g, "\\'")}', this)">
        ${getDeptIcon(d)} ${d}
      </button>
    `;
  });

  container.innerHTML = html;
}

function getDeptIcon(deptName) {
  const d = (deptName || '').toLowerCase();
  if (d.includes('operac')) return '<i class="ti ti-settings"></i>';
  if (d.includes('comerc')) return '<i class="ti ti-chart-dots"></i>';
  if (d.includes('financ')) return '<i class="ti ti-receipt-2"></i>';
  if (d.includes('jurid')) return '<i class="ti ti-scale"></i>';
  if (d.includes('sop') || d.includes('proc')) return '<i class="ti ti-list-check"></i>';
  return '<i class="ti ti-folder"></i>';
}

function filterWikiByDept(deptName, el) {
  activeWikiDeptFilter = deptName;
  if (el) {
    document.querySelectorAll('.wiki-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  }
  renderWikiArticleList();
}

function onWikiSearchInput() {
  renderWikiArticleList();
}

function renderWikiArticleList() {
  const container = document.getElementById('wiki-articles-list');
  const searchInput = document.getElementById('wiki-search-input');
  if (!container) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = wikiArticles.filter(a => {
    const matchDept = (activeWikiDeptFilter === 'all') || (a.department_name === activeWikiDeptFilter) || (a.category === activeWikiDeptFilter);
    const matchSearch = !query || 
      (a.title && a.title.toLowerCase().includes(query)) ||
      (a.summary && a.summary.toLowerCase().includes(query)) ||
      (a.content && a.content.toLowerCase().includes(query));
    return matchDept && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding:24px 16px; text-align:center; color:var(--muted); font-size:12.5px;">
        <i class="ti ti-file-search" style="font-size:28px; color:var(--gold); margin-bottom:8px; display:block;"></i>
        Nenhum artigo encontrado para o filtro atual.
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(a => {
    const isActive = currentWikiArticleId === a.id;
    const readingTime = calculateReadingTime(a.content || '');
    const dept = a.department_name || 'Geral';
    const summary = a.summary || (a.content ? a.content.replace(/[#*`>[-]/g, '').substring(0, 90) + '...' : '');

    html += `
      <div class="wiki-article-card ${isActive ? 'active' : ''}" onclick="selectWikiArticle('${a.id}')">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
          <span class="badge badge-gold" style="font-size:10px; padding:1px 6px;">${dept}</span>
          <span style="font-size:10px; color:var(--muted);"><i class="ti ti-eye"></i> ${a.views_count || 0}</span>
        </div>
        <div class="wiki-article-card-title">${escapeHtml(a.title)}</div>
        <div class="wiki-article-card-summary">${escapeHtml(summary)}</div>
        <div class="wiki-article-card-meta">
          <span><i class="ti ti-clock"></i> ${readingTime}</span>
          <span>${a.is_public ? '🌐 Público' : '🔒 Equipe'}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function selectWikiArticle(id) {
  currentWikiArticleId = id;
  renderWikiArticleList();

  const emptyState = document.getElementById('wiki-empty-state');
  const activeView = document.getElementById('wiki-active-article-view');
  if (emptyState) emptyState.style.display = 'none';
  if (activeView) activeView.style.display = 'flex';

  let article = wikiArticles.find(a => a.id === id);

  // Tentar buscar detalhes atualizados no backend se for um artigo do servidor
  if (!id.startsWith('demo-')) {
    try {
      const fullArticle = await req(`/wiki.php?id=${id}`);
      if (fullArticle) {
        article = fullArticle;
        // Atualizar views count local
        const idx = wikiArticles.findIndex(a => a.id === id);
        if (idx !== -1) wikiArticles[idx] = fullArticle;
      }
    } catch (e) {
      console.log("Exibindo cache local do artigo");
    }
  }

  if (!article) return;

  // Atualizar visualizações localmente se demonstrativo
  if (id.startsWith('demo-')) {
    article.views_count = (article.views_count || 0) + 1;
  }

  // Preencher elementos do leitor
  const titleEl = document.getElementById('wiki-article-title');
  const summaryBox = document.getElementById('wiki-article-summary-box');
  const deptBadge = document.getElementById('wiki-article-dept-badge');
  const categoryBadge = document.getElementById('wiki-article-category-badge');
  const visBadge = document.getElementById('wiki-article-vis-badge');
  const authorEl = document.getElementById('wiki-article-author');
  const dateEl = document.getElementById('wiki-article-date');
  const readingTimeEl = document.getElementById('wiki-article-reading-time');
  const viewsEl = document.getElementById('wiki-article-views');
  const formattedBody = document.getElementById('wiki-article-formatted-body');
  const likeCountEl = document.getElementById('wiki-like-count');

  if (titleEl) titleEl.textContent = article.title;
  if (summaryBox) {
    if (article.summary) {
      summaryBox.textContent = article.summary;
      summaryBox.style.display = 'block';
    } else {
      summaryBox.style.display = 'none';
    }
  }

  if (deptBadge) deptBadge.textContent = article.department_name || 'Geral';
  if (categoryBadge) categoryBadge.textContent = article.category || 'SOP';
  if (visBadge) {
    visBadge.textContent = article.is_public ? '🌐 Público' : '🔒 Equipe Interna';
    visBadge.className = article.is_public ? 'badge badge-green' : 'badge badge-yellow';
  }

  if (authorEl) authorEl.textContent = article.creator_name || 'Tripulação Master';
  if (dateEl) dateEl.textContent = article.updated_at ? formatDateBr(article.updated_at) : 'Recente';
  if (readingTimeEl) readingTimeEl.textContent = calculateReadingTime(article.content);
  if (viewsEl) viewsEl.textContent = `${article.views_count || 0} visualizações`;
  
  if (likeCountEl) {
    const likes = wikiLikesMap[id] || 0;
    likeCountEl.textContent = likes > 0 ? `Útil (${likes})` : 'Útil';
  }

  // Renderizar o conteúdo e gerar o Sumário (TOC)
  if (formattedBody) {
    const { html, toc } = parseWikiMarkdown(article.content || '');
    formattedBody.innerHTML = html;
    renderWikiTOC(toc);
  }
}

// Parser Completo de Markdown & Mídias para a Wiki
function parseWikiMarkdown(markdown) {
  if (!markdown) return { html: '', toc: [] };

  const lines = markdown.split('\n');
  let html = '';
  const toc = [];
  let inList = false;
  let inCode = false;
  let codeBuffer = '';

  lines.forEach((line, index) => {
    let trimmed = line.trim();

    // Bloco de código
    if (trimmed.startsWith('```')) {
      if (inCode) {
        html += `<pre><code>${escapeHtml(codeBuffer)}</code></pre>`;
        codeBuffer = '';
        inCode = false;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeBuffer += line + '\n';
      return;
    }

    // Fechar listas desordenadas
    if (!trimmed.startsWith('- ') && !trimmed.startsWith('* ') && !trimmed.startsWith('1. ') && inList) {
      html += '</ul>';
      inList = false;
    }

    // Headings (H2, H3, H4)
    if (trimmed.startsWith('## ')) {
      const text = trimmed.substring(3).trim();
      const slug = 'heading-' + index + '-' + text.toLowerCase().replace(/[^\w]+/g, '-');
      toc.push({ level: 2, text: text, id: slug });
      html += `<h2 id="${slug}">${parseInlineWiki(text)}</h2>`;
      return;
    }

    if (trimmed.startsWith('### ')) {
      const text = trimmed.substring(4).trim();
      const slug = 'heading-' + index + '-' + text.toLowerCase().replace(/[^\w]+/g, '-');
      toc.push({ level: 3, text: text, id: slug });
      html += `<h3 id="${slug}">${parseInlineWiki(text)}</h3>`;
      return;
    }

    if (trimmed.startsWith('#### ')) {
      const text = trimmed.substring(5).trim();
      html += `<h4>${parseInlineWiki(text)}</h4>`;
      return;
    }

    // Detectar Tag/Sintaxe de Vídeo ou URLs de Vídeo (YouTube, Vimeo, MP4)
    if (trimmed.startsWith('[video](') && trimmed.endsWith(')')) {
      const videoUrl = trimmed.substring(8, trimmed.length - 1).trim();
      html += renderWikiVideoEmbed(videoUrl);
      return;
    }

    // Callout / Alertas (> [!NOTE], > [!TIP], > [!WARNING])
    if (trimmed.startsWith('> [!NOTE]')) {
      html += `<div class="wiki-callout wiki-callout-note"><i class="ti ti-info-circle"></i><div>`;
      return;
    }
    if (trimmed.startsWith('> [!TIP]')) {
      html += `<div class="wiki-callout wiki-callout-tip"><i class="ti ti-bulb"></i><div>`;
      return;
    }
    if (trimmed.startsWith('> [!WARNING]')) {
      html += `<div class="wiki-callout wiki-callout-warning"><i class="ti ti-alert-triangle"></i><div>`;
      return;
    }
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed.substring(2).trim();
      html += `<blockquote style="margin:8px 0;">${parseInlineWiki(quoteText)}</blockquote>`;
      return;
    }

    // Separador horizontal
    if (trimmed === '---' || trimmed === '***') {
      html += '<hr style="border:none; border-top:1px solid var(--border); margin:24px 0;" />';
      return;
    }

    // Checklists e Listas
    if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      if (!inList) { html += '<ul style="list-style:none; padding-left:4px;">'; inList = true; }
      const checked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
      const text = trimmed.substring(6);
      html += `
        <li style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <input type="checkbox" ${checked ? 'checked' : ''} disabled style="accent-color:var(--gold);" />
          <span style="${checked ? 'text-decoration:line-through; opacity:0.6;' : ''}">${parseInlineWiki(text)}</span>
        </li>
      `;
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${parseInlineWiki(trimmed.substring(2))}</li>`;
      return;
    }

    if (trimmed.match(/^\d+\.\s/)) {
      if (!inList) { html += '<ol style="padding-left:24px; color:#cbd5e1; margin-bottom:18px;">'; inList = true; }
      const text = trimmed.replace(/^\d+\.\s/, '');
      html += `<li style="margin-bottom:6px;">${parseInlineWiki(text)}</li>`;
      return;
    }

    // Parágrafos regulares (com verificação de URLs soltas de vídeo/mídia)
    if (trimmed.length > 0) {
      if (isDirectVideoUrl(trimmed)) {
        html += renderWikiVideoEmbed(trimmed);
      } else {
        html += `<p>${parseInlineWiki(trimmed)}</p>`;
      }
    }
  });

  if (inList) html += '</ul>';

  return { html, toc };
}

function isDirectVideoUrl(url) {
  return (url.includes('youtube.com/') || url.includes('youtu.be/') || url.includes('vimeo.com/') || url.endsWith('.mp4'));
}

function renderWikiVideoEmbed(url) {
  let embedUrl = url;
  
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`;
  }

  if (embedUrl.endsWith('.mp4')) {
    return `
      <div style="margin:20px 0; width:100%;">
        <video controls src="${escapeHtml(embedUrl)}" style="width:100%; max-height:420px; border-radius:12px; border:1px solid var(--border); background:#000; box-shadow:0 8px 24px rgba(0,0,0,0.5);"></video>
      </div>
    `;
  }

  return `
    <div class="wiki-video-embed">
      <iframe src="${escapeHtml(embedUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  `;
}

function parseInlineWiki(text) {
  if (!text) return '';
  let s = escapeHtml(text);
  
  // Imagens Markdown ![alt](url)
  s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:12px; margin:16px 0; border:1px solid var(--border); box-shadow:0 8px 24px rgba(0,0,0,0.4); display:block;" />');

  // Links Markdown [text](url)
  s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--gold); text-decoration:underline; font-weight:500;">$1 <i class="ti ti-external-link" style="font-size:12px;"></i></a>');

  // Negrito **texto**
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text);">$1</strong>');
  // Itálico *texto*
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Riscado ~~texto~~
  s = s.replace(/~~(.*?)~~/g, '<del style="opacity:0.7;">$1</del>');
  // Código inline `codigo`
  s = s.replace(/`(.*?)`/g, '<code>$1</code>');
  
  return s;
}

function renderWikiTOC(toc) {
  const container = document.getElementById('wiki-toc-list');
  if (!container) return;

  if (!toc || toc.length === 0) {
    container.innerHTML = '<li style="font-size:11.5px; color:var(--muted);">Sem títulos cadastrados</li>';
    return;
  }

  let html = '';
  toc.forEach(item => {
    html += `
      <li class="wiki-toc-item ${item.level === 3 ? 'h3' : ''}">
        <a href="#${item.id}" onclick="smoothScrollToWikiHeader(event, '${item.id}')">${escapeHtml(item.text)}</a>
      </li>
    `;
  });

  container.innerHTML = html;
}

function smoothScrollToWikiHeader(event, id) {
  event.preventDefault();
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.color = 'var(--gold)';
    setTimeout(() => { el.style.color = ''; }, 1500);
  }
}

function calculateReadingTime(text) {
  if (!text) return '1 min de leitura';
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min de leitura`;
}

function formatDateBr(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return dateStr;
  }
}

// ── Funções dos Modais e Editor Rico da Wiki ────────────────────────

function toggleWikiPublicCheckbox() {
  const isPublic = document.getElementById('wiki-form-public') ? document.getElementById('wiki-form-public').checked : true;
  const deptWrapper = document.getElementById('wiki-dept-select-wrapper');
  if (deptWrapper) {
    deptWrapper.style.display = isPublic ? 'none' : 'block';
  }
}

function openWikiModal(articleId = null) {
  const modalTitle = document.getElementById('wiki-modal-title');
  const formId = document.getElementById('wiki-form-article-id');
  const titleInp = document.getElementById('wiki-form-title');
  const summaryInp = document.getElementById('wiki-form-summary');
  const deptSel = document.getElementById('wiki-form-dept');
  const catSel = document.getElementById('wiki-form-category');
  const publicCheck = document.getElementById('wiki-form-public');
  const contentTxt = document.getElementById('wiki-form-content');

  // Resetar abas para 'Editar'
  switchWikiEditorTab('edit');

  // Alimentar dropdown de departamentos
  if (deptSel) {
    let deptOptions = '<option value="">Selecione o Departamento Exclusivo...</option>';
    const deptsList = wikiDepartments.length > 0 ? wikiDepartments : [
      { id: 'd1', name: 'Operacional' },
      { id: 'd2', name: 'Comercial' },
      { id: 'd3', name: 'Financeiro' },
      { id: 'd4', name: 'Jurídico' },
      { id: 'd5', name: 'Tecnologia & Growth' }
    ];
    deptsList.forEach(d => {
      deptOptions += `<option value="${d.id}">${d.name}</option>`;
    });
    deptSel.innerHTML = deptOptions;
  }

  if (articleId) {
    const art = wikiArticles.find(a => a.id === articleId);
    if (art) {
      if (modalTitle) modalTitle.textContent = 'Editar Artigo — Base de Conhecimento';
      if (formId) formId.value = art.id;
      if (titleInp) titleInp.value = art.title || '';
      if (summaryInp) summaryInp.value = art.summary || '';
      if (deptSel && art.department_id) deptSel.value = art.department_id;
      if (catSel && art.category) catSel.value = art.category;
      if (publicCheck) publicCheck.checked = !!art.is_public;
      if (contentTxt) contentTxt.value = art.content || '';
    }
  } else {
    if (modalTitle) modalTitle.textContent = 'Novo Artigo — Base de Conhecimento';
    if (formId) formId.value = '';
    if (titleInp) titleInp.value = '';
    if (summaryInp) summaryInp.value = '';
    if (publicCheck) publicCheck.checked = true;
    if (contentTxt) contentTxt.value = '';
  }

  toggleWikiPublicCheckbox();
  openModal('mo-wiki-article');
}

function switchWikiEditorTab(mode) {
  const tabEdit = document.getElementById('wiki-editor-tab-edit');
  const tabPreview = document.getElementById('wiki-editor-tab-preview');
  const btnEdit = document.getElementById('btn-wiki-tab-edit');
  const btnPreview = document.getElementById('btn-wiki-tab-preview');
  const toolbar = document.getElementById('wiki-editor-toolbar');

  if (mode === 'preview') {
    if (tabEdit) tabEdit.style.display = 'none';
    if (tabPreview) {
      tabPreview.style.display = 'block';
      const content = document.getElementById('wiki-form-content').value;
      const { html } = parseWikiMarkdown(content || '_Nenhum conteúdo digitado ainda._');
      tabPreview.innerHTML = html;
    }
    if (btnEdit) { btnEdit.classList.remove('active'); btnEdit.style.background = 'transparent'; btnEdit.style.color = 'var(--muted)'; }
    if (btnPreview) { btnPreview.classList.add('active'); btnPreview.style.background = 'var(--gold)'; btnPreview.style.color = '#07080c'; }
    if (toolbar) toolbar.style.opacity = '0.4';
  } else {
    if (tabEdit) tabEdit.style.display = 'block';
    if (tabPreview) tabPreview.style.display = 'none';
    if (btnEdit) { btnEdit.classList.add('active'); btnEdit.style.background = 'var(--gold)'; btnEdit.style.color = '#07080c'; }
    if (btnPreview) { btnPreview.classList.remove('active'); btnPreview.style.background = 'transparent'; btnPreview.style.color = 'var(--muted)'; }
    if (toolbar) toolbar.style.opacity = '1';
  }
}

function insertWikiMarkdown(prefix, suffix = '') {
  const textarea = document.getElementById('wiki-form-content');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);

  const replacement = prefix + selected + suffix;
  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + prefix.length, end + prefix.length);
}

// Upload de arquivo de imagem do computador para a Wiki
async function uploadWikiImageFile(fileInput) {
  const file = fileInput.files ? fileInput.files[0] : null;
  if (!file) return;

  toast('Enviando imagem...', true);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const r = await fetch('api/upload.php', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const res = await r.json();
    if (res && res.url) {
      insertWikiMarkdown(`![${file.name}](${res.url})\n`);
      toast('Imagem enviada e inserida!', true);
    } else {
      throw new Error(res.error || 'Erro no upload');
    }
  } catch (err) {
    // Fallback: carregar imagem em Base64 Data URL se ambiente estático
    const reader = new FileReader();
    reader.onload = function(e) {
      insertWikiMarkdown(`![${file.name}](${e.target.result})\n`);
      toast('Imagem carregada com sucesso!', true);
    };
    reader.readAsDataURL(file);
  } finally {
    fileInput.value = '';
  }
}

function promptInsertWikiVideo() {
  const url = prompt('Cole aqui o link do vídeo (YouTube, Vimeo ou link MP4):');
  if (!url) return;
  insertWikiMarkdown(`\n[video](${url.trim()})\n`);
}

function promptInsertWikiLink() {
  const url = prompt('Cole a URL do link (ex: https://exemplo.com):');
  if (!url) return;
  const text = prompt('Texto de exibição do link:', 'Clique aqui para acessar');
  insertWikiMarkdown(`[${text || 'Link'}](${url.trim()})`);
}

function insertWikiTable() {
  const tableMarkdown = `\n| Coluna 1 | Coluna 2 | Coluna 3 |\n| :--- | :--- | :--- |\n| Dado 1 | Dado 2 | Dado 3 |\n| Dado 4 | Dado 5 | Dado 6 |\n`;
  insertWikiMarkdown(tableMarkdown);
}

async function saveWikiArticle(event) {
  event.preventDefault();
  const id = document.getElementById('wiki-form-article-id').value;
  const title = document.getElementById('wiki-form-title').value.trim();
  const summary = document.getElementById('wiki-form-summary').value.trim();
  const department_id = document.getElementById('wiki-form-dept').value || null;
  const category = document.getElementById('wiki-form-category').value;
  const is_public = document.getElementById('wiki-form-public').checked;
  const content = document.getElementById('wiki-form-content').value.trim();

  if (!title || !content) {
    toast('Título e Conteúdo são obrigatórios', false);
    return;
  }

  const deptObj = wikiDepartments.find(d => d.id === department_id);
  const department_name = deptObj ? deptObj.name : 'Geral';

  const bodyData = {
    title, summary, content, category, department_id, is_public
  };

  try {
    if (id) {
      if (!id.startsWith('demo-')) {
        await req(`/wiki.php?id=${id}`, { method: 'PATCH', body: bodyData });
      } else {
        const idx = wikiArticles.findIndex(a => a.id === id);
        if (idx !== -1) {
          wikiArticles[idx] = { ...wikiArticles[idx], ...bodyData, department_name, updated_at: new Date().toISOString() };
        }
      }
      toast('Artigo atualizado com sucesso!', true);
    } else {
      try {
        const newArt = await req('/wiki.php', { method: 'POST', body: bodyData });
        if (newArt && newArt.id) {
          currentWikiArticleId = newArt.id;
        }
      } catch (e) {
        const mockNew = {
          id: 'art-' + Date.now(),
          ...bodyData,
          department_name,
          views_count: 1,
          creator_name: 'Tripulação Master',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        wikiArticles.unshift(mockNew);
        currentWikiArticleId = mockNew.id;
      }
      toast('Novo artigo publicado com sucesso!', true);
    }

    closeModal('mo-wiki-article');
    await loadWikiArticles();
    if (currentWikiArticleId) selectWikiArticle(currentWikiArticleId);
  } catch (err) {
    toast('Erro ao salvar artigo: ' + err.message, false);
  }
}

async function deleteWikiArticle(id) {
  if (!id) return;
  if (!confirm('Deseja realmente excluir este artigo da Base de Conhecimento?')) return;

  try {
    if (!id.startsWith('demo-')) {
      await req(`/wiki.php?id=${id}`, { method: 'DELETE' });
    }
    wikiArticles = wikiArticles.filter(a => a.id !== id);
    toast('Artigo removido!', true);
    
    currentWikiArticleId = wikiArticles.length > 0 ? wikiArticles[0].id : null;
    renderWikiArticleList();
    if (currentWikiArticleId) {
      selectWikiArticle(currentWikiArticleId);
    } else {
      document.getElementById('wiki-empty-state').style.display = 'flex';
      document.getElementById('wiki-active-article-view').style.display = 'none';
    }
  } catch (err) {
    toast('Erro ao excluir artigo: ' + err.message, false);
  }
}

function copyWikiArticleLink() {
  const url = window.location.origin + window.location.pathname + '?article=' + (currentWikiArticleId || '');
  navigator.clipboard.writeText(url).then(() => {
    toast('Link do artigo copiado para a área de transferência!', true);
  }).catch(() => {
    toast('URL: ' + url);
  });
}

function printWikiArticle() {
  window.print();
}

function toggleWikiLike() {
  if (!currentWikiArticleId) return;
  wikiLikesMap[currentWikiArticleId] = (wikiLikesMap[currentWikiArticleId] || 0) + 1;
  const countEl = document.getElementById('wiki-like-count');
  if (countEl) countEl.textContent = `Útil (${wikiLikesMap[currentWikiArticleId]})`;
  toast('Obrigado pelo seu feedback! 👍');
}

// ── Gerenciador de Departamentos da Wiki ─────────────────────

function openDeptManagerModal() {
  renderDeptManagerList();
  openModal('mo-wiki-dept');
}

function renderDeptManagerList() {
  const listEl = document.getElementById('wiki-dept-manager-list');
  if (!listEl) return;

  let html = '';
  wikiDepartments.forEach(d => {
    html += `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg3); border-radius:8px; border:1px solid var(--border);">
        <span style="font-size:13px; font-weight:500; color:var(--text);">${escapeHtml(d.name)}</span>
        ${d.is_fixed ? '<span class="badge" style="font-size:10px;">Padrão</span>' : `
          <button class="btn btn-sm" onclick="deleteWikiDepartment('${d.id}')" style="color:var(--red); padding:2px 6px;"><i class="ti ti-trash"></i></button>
        `}
      </div>
    `;
  });

  listEl.innerHTML = html;
}

async function saveWikiDepartment(event) {
  event.preventDefault();
  const inp = document.getElementById('wiki-new-dept-name');
  const name = inp ? inp.value.trim() : '';
  if (!name) return;

  try {
    const created = await req('/departments.php', { method: 'POST', body: { name } });
    if (created && created.id) {
      wikiDepartments.push(created);
    } else {
      wikiDepartments.push({ id: 'd-' + Date.now(), name, is_fixed: false });
    }
    inp.value = '';
    toast('Departamento adicionado!', true);
    renderDeptManagerList();
    renderWikiDeptPills();
  } catch (err) {
    toast(err.message || 'Erro ao criar departamento', false);
  }
}

async function deleteWikiDepartment(id) {
  try {
    await req(`/departments.php?id=${id}`, { method: 'DELETE' });
    wikiDepartments = wikiDepartments.filter(d => d.id !== id);
    toast('Departamento removido!', true);
    renderDeptManagerList();
    renderWikiDeptPills();
  } catch (err) {
    toast(err.message || 'Erro ao excluir departamento', false);
  }
}

// Exposição Global de Funções da Wiki para o Objeto Window (Garantia de funcionamento dos botões)
window.initWikiPage = initWikiPage;
window.loadWikiArticles = loadWikiArticles;
window.filterWikiByDept = filterWikiByDept;
window.onWikiSearchInput = onWikiSearchInput;
window.renderWikiArticleList = renderWikiArticleList;
window.selectWikiArticle = selectWikiArticle;
window.openWikiModal = openWikiModal;
window.toggleWikiPublicCheckbox = toggleWikiPublicCheckbox;
window.switchWikiEditorTab = switchWikiEditorTab;
window.insertWikiMarkdown = insertWikiMarkdown;
window.uploadWikiImageFile = uploadWikiImageFile;
window.promptInsertWikiVideo = promptInsertWikiVideo;
window.promptInsertWikiLink = promptInsertWikiLink;
window.insertWikiTable = insertWikiTable;
window.saveWikiArticle = saveWikiArticle;
window.deleteWikiArticle = deleteWikiArticle;
window.copyWikiArticleLink = copyWikiArticleLink;
window.printWikiArticle = printWikiArticle;
window.toggleWikiLike = toggleWikiLike;
window.openDeptManagerModal = openDeptManagerModal;
window.saveWikiDepartment = saveWikiDepartment;
window.deleteWikiDepartment = deleteWikiDepartment;
window.smoothScrollToWikiHeader = smoothScrollToWikiHeader;

// Inicializar Wiki ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof renderFinancialChart === 'function') renderFinancialChart();
    initWikiPage();
  }, 300);
});

checkAuth();
