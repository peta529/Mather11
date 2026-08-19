let settings = null;
let products = [];
let isAdmin = false;
let filterCat = 'Всі';
let filterSeason = null;
let showSold = true;
let searchQ = '';
let cardPhotoIndex = {};
let pendingPhotos = [];
const SEASONS = ['Зима','Демісезон','Літо'];

const app = document.getElementById('app');

const ICON_TG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 4L2.5 11.5l6 2 2 6.5 3-4 4.5 3.5L21 4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const ICON_VIBER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4 4v-4H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const ICON_IG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>';
const SOCIAL_META = {
  telegram: { label:'Telegram', icon:ICON_TG, placeholder:'https://t.me/imya' },
  viber: { label:'Viber', icon:ICON_VIBER, placeholder:'viber://chat?number=%2B380...' },
  instagram: { label:'Instagram', icon:ICON_IG, placeholder:'https://instagram.com/imya' }
};

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function renderSocialLinks(){
  if(!settings) return '';
  const keys = Object.keys(SOCIAL_META);
  if(isAdmin){
    return keys.map(k => {
      const meta = SOCIAL_META[k];
      const filled = Boolean(settings[k]);
      return `<button type="button" class="btn small icon${filled ? '' : ' icon-empty'}" data-social-edit="${k}" title="${filled ? meta.label : 'Додати ' + meta.label}">${meta.icon}</button>`;
    }).join('');
  }
  return keys.filter(k => settings[k]).map(k => {
    const meta = SOCIAL_META[k];
    return `<a class="btn small icon" href="${escapeHtml(settings[k])}" target="_blank" rel="noopener" title="${meta.label}">${meta.icon}</a>`;
  }).join('');
}
function bindSocialLinks(){
  document.querySelectorAll('[data-social-edit]').forEach(el => el.onclick = () => openSocialModal(el.dataset.socialEdit));
}
function openSocialModal(key){
  const meta = SOCIAL_META[key];
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <h2>${meta.label}</h2>
      <div class="field">
        <label for="soc-val">Посилання</label>
        <input type="url" id="soc-val" value="${escapeHtml(settings[key]||'')}" placeholder="${meta.placeholder}">
        <div class="hint">Залиште порожнім, щоб прибрати кнопку з сайту.</div>
      </div>
      <div class="err" id="soc-err"></div>
      <div class="modal-actions">
        <button class="btn ghost" id="soc-cancel">Скасувати</button>
        <button class="btn primary" id="soc-save">Зберегти</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  const input = document.getElementById('soc-val');
  input.focus();
  document.getElementById('soc-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
  document.getElementById('soc-save').onclick = async () => {
    settings[key] = input.value.trim();
    const ok = await saveData();
    if(ok){ bg.remove(); render(); }
    else { document.getElementById('soc-err').textContent = 'Не вдалося зберегти.'; }
  };
}
async function api(url, opts){
  try{
    const res = await fetch(url, Object.assign({ headers:{'Content-Type':'application/json'} }, opts));
    let body = null;
    try{ body = await res.json(); }catch(e){}
    return { ok: res.ok, status: res.status, body };
  }catch(networkErr){
    return { ok:false, status:0, body:null, networkError:true };
  }
}

async function boot(){
  const statusRes = await api('/api/auth-status');
  if(statusRes.networkError){ renderLoadError(); return; }
  isAdmin = Boolean(statusRes.body && statusRes.body.admin);
  if(isAdmin) filterSeason = 'Всі';

  const dataRes = await api('/api/data');
  if(dataRes.networkError){ renderLoadError(); return; }
  settings = dataRes.body ? dataRes.body.settings : null;
  products = dataRes.body ? (dataRes.body.products || []) : [];

  if(isAdmin && !settings){
    renderSettingsSetup();
    return;
  }
  render();
}

function renderLoadError(){
  app.innerHTML = `
    <div class="empty-state" style="margin-top:60px;">
      <h3>Не вдалося завантажити каталог</h3>
      <p>Схоже, сервер тимчасово недоступний. Спробуйте ще раз.</p>
      <div style="margin-top:16px;"><button class="btn primary" id="retry-btn">Спробувати ще раз</button></div>
    </div>
  `;
  document.getElementById('retry-btn').onclick = () => { app.innerHTML = '<div class="loading">Відкриваємо каталог…</div>'; boot(); };
}

async function saveData(){
  const res = await api('/api/data', { method:'POST', body: JSON.stringify({ settings, products }) });
  if(!res.ok){
    showBanner((res.body && res.body.error) || 'Не вдалося зберегти. Перевірте підключення Blob-сховища в Vercel.', true);
    return false;
  }
  return true;
}

function showBanner(msg, isError){
  let el = document.getElementById('save-banner');
  if(el) el.remove();
  el = document.createElement('div');
  el.id = 'save-banner';
  el.style.cssText = `position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:300;
    max-width:min(560px,92vw);padding:12px 18px;border-radius:6px;font-size:13.5px;
    background:${isError ? '#9B4430' : '#5C6B4A'};color:#fff;box-shadow:2px 4px 10px rgba(0,0,0,.25);`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { if(el.parentNode) el.remove(); }, isError ? 7000 : 3000);
}

/* ---------- FIRST-TIME SETTINGS (only reachable once logged in) ---------- */
function renderSettingsSetup(){
  app.innerHTML = `
    <div class="login-box" style="max-width:440px;">
      <h1 class="slab" style="font-size:24px;margin:0 0 4px;">Налаштування каталогу</h1>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 20px;">Це перший запуск — заповніть основні дані каталогу.</p>
      <div class="field">
        <label for="s-name">Назва каталогу</label>
        <input type="text" id="s-name" placeholder="Наприклад: Взуття від Світлани">
      </div>
      <div class="field">
        <label for="s-tag">Короткий опис (необов'язково)</label>
        <input type="text" id="s-tag" placeholder="Наприклад: вживане і нове взуття в хорошому стані">
      </div>
      <div class="field">
        <label for="s-telegram">Посилання на Telegram (необов'язково)</label>
        <input type="url" id="s-telegram" placeholder="https://t.me/imya">
      </div>
      <div class="field">
        <label for="s-viber">Посилання на Viber (необов'язково)</label>
        <input type="url" id="s-viber" placeholder="viber://chat?number=%2B380...">
      </div>
      <div class="field">
        <label for="s-instagram">Посилання на Instagram (необов'язково)</label>
        <input type="url" id="s-instagram" placeholder="https://instagram.com/imya">
      </div>
      <div class="err" id="s-err"></div>
      <div class="modal-actions" style="justify-content:flex-start;">
        <button class="btn primary" id="s-save">Створити каталог</button>
      </div>
    </div>
  `;
  document.getElementById('s-save').onclick = async () => {
    const name = document.getElementById('s-name').value.trim();
    if(!name){ document.getElementById('s-err').textContent = 'Введіть назву каталогу.'; return; }
    settings = {
      name,
      tagline: document.getElementById('s-tag').value.trim(),
      telegram: document.getElementById('s-telegram').value.trim(),
      viber: document.getElementById('s-viber').value.trim(),
      instagram: document.getElementById('s-instagram').value.trim()
    };
    products = [];
    const ok = await saveData();
    if(ok) render();
  };
}

/* ---------- MAIN VIEW ---------- */
function render(){
  if(!settings){
    app.innerHTML = `
      <div class="empty-state" style="margin-top:60px;">
        <h3>Каталог ще не налаштований</h3>
        <p>Власник ще не заповнив дані. Загляньте трохи пізніше.</p>
      </div>
      <div class="head-actions" style="position:fixed;top:16px;right:16px;">
        ${renderSocialLinks()}
        ${adminHeaderControls()}
      </div>
    `;
    bindSocialLinks();
    bindAdminHeaderControls();
    return;
  }

  if(!isAdmin && filterSeason === null){
    renderSeasonGate();
    return;
  }

  const categories = ['Всі','Жіноче','Чоловіче','Дитяче','Унісекс'];
  const filtered = getFilteredProducts();

  app.innerHTML = `
    <header class="shop-head">
      <div>
        <h1 class="shop-name">${escapeHtml(settings.name)}</h1>
        ${settings.tagline ? `<p class="shop-tagline">${escapeHtml(settings.tagline)}</p>` : ''}
      </div>
      <div class="head-actions">
        ${renderSocialLinks()}
        ${adminHeaderControls()}
      </div>
    </header>

    <div class="controls">
      <input type="text" class="search-input" id="search" placeholder="Пошук за назвою або описом" value="${escapeHtml(searchQ)}">
      <button class="chip" id="change-season">Сезон: ${escapeHtml(filterSeason)} · Змінити</button>
      ${categories.map(c => `<button class="chip${c===filterCat?' active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
      <label class="toggle-sold"><input type="checkbox" id="show-sold" ${showSold?'checked':''}> Показувати продане</label>
    </div>

    ${filtered.length === 0 ? `
      <div class="empty-state">
        <h3>${products.length === 0 ? 'Поки що тут порожньо' : 'Нічого не знайдено'}</h3>
        <p>${products.length === 0 ? (isAdmin ? 'Додайте першу пару взуття кнопкою нижче.' : "Скоро тут з'явиться взуття.") : 'Спробуйте змінити пошук або фільтр.'}</p>
      </div>
    ` : `<div class="grid">${filtered.map(cardHtml).join('')}</div>`}
  `;

  document.getElementById('search').oninput = e => { searchQ = e.target.value; render(); };
  document.getElementById('change-season').onclick = () => { filterSeason = isAdmin ? filterSeason : null; if(isAdmin){ openSeasonSwitchModal(); } else { render(); } };
  document.querySelectorAll('.chip[data-cat]').forEach(el => el.onclick = () => { filterCat = el.dataset.cat; render(); });
  document.getElementById('show-sold').onchange = e => { showSold = e.target.checked; render(); };
  document.querySelectorAll('[data-nav]').forEach(el => el.onclick = () => cycleCardPhoto(el.dataset.nav, parseInt(el.dataset.dir,10)));
  document.querySelectorAll('[data-zoom]').forEach(el => el.onclick = () => openLightbox(el.dataset.zoom));
  document.querySelectorAll('[data-readmore]').forEach(el => el.onclick = () => openReadMoreModal(el.dataset.readmore));
  if(isAdmin){
    document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => openProductModal(el.dataset.edit));
    document.querySelectorAll('[data-delete]').forEach(el => el.onclick = () => confirmDelete(el.dataset.delete));
  }
  bindSocialLinks();
  bindAdminHeaderControls();
  renderDock();
}

function renderSeasonGate(){
  app.innerHTML = `
    <div class="head-actions" style="position:fixed;top:16px;right:16px;z-index:50;">
      ${renderSocialLinks()}
      ${adminHeaderControls()}
    </div>
    <div style="max-width:640px;margin:70px auto 0;text-align:center;">
      <h1 class="shop-name">${escapeHtml(settings.name)}</h1>
      ${settings.tagline ? `<p class="shop-tagline" style="margin-bottom:30px;">${escapeHtml(settings.tagline)}</p>` : ''}
      <p style="color:var(--muted);font-size:14px;margin:30px 0 14px;">Оберіть сезон, щоб побачити відповідне взуття</p>
      <div class="season-grid">
        ${SEASONS.map(s => `<button class="season-tile" data-season="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
        <button class="season-tile" data-season="Всі">Весь каталог</button>
      </div>
    </div>
  `;
  document.querySelectorAll('[data-season]').forEach(el => el.onclick = () => { filterSeason = el.dataset.season; render(); });
  bindSocialLinks();
  bindAdminHeaderControls();
}

function openSeasonSwitchModal(){
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <h2>Оберіть сезон</h2>
      <div class="season-grid" style="margin-top:14px;">
        ${SEASONS.map(s => `<button class="season-tile" data-season="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
        <button class="season-tile" data-season="Всі">Весь каталог</button>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="season-cancel">Закрити</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  document.getElementById('season-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
  bg.querySelectorAll('[data-season]').forEach(el => el.onclick = () => { filterSeason = el.dataset.season; bg.remove(); render(); });
}

/* ---------- MAIN VIEW ---------- */
function getFilteredProducts(){
  return products.filter(p => {
    if(!showSold && p.status === 'sold') return false;
    if(filterCat !== 'Всі' && p.category !== filterCat) return false;
    if(filterSeason && filterSeason !== 'Всі' && p.season !== filterSeason) return false;
    if(searchQ){
      const hay = (p.title+' '+p.description).toLowerCase();
      if(!hay.includes(searchQ.toLowerCase())) return false;
    }
    return true;
  });
}

function adminHeaderControls(){
  if(isAdmin){
    return `
      <button class="btn small ghost" id="top-settings">Налаштування</button>
      <button class="btn small ghost" id="top-logout">Вийти</button>
    `;
  }
  return `<button class="btn small ghost" id="top-login">Увійти в акаунт адміна</button>`;
}
function bindAdminHeaderControls(){
  const loginBtn = document.getElementById('top-login');
  if(loginBtn) loginBtn.onclick = openLoginModal;
  const settingsBtn = document.getElementById('top-settings');
  if(settingsBtn) settingsBtn.onclick = openSettingsModal;
  const logoutBtn = document.getElementById('top-logout');
  if(logoutBtn) logoutBtn.onclick = async () => { await api('/api/logout', { method:'POST' }); isAdmin = false; render(); };
}

function cardHtml(p){
  const photos = p.photos || [];
  cardPhotoIndex[p.id] = 0;
  const photoInner = photos.length
    ? `<img class="card-photo" id="photo-${p.id}" src="${photos[0]}" alt="${escapeHtml(p.title)}" data-zoom="${p.id}">`
    : `<div class="card-photo empty">Без фото</div>`;
  const nav = photos.length > 1 ? `
      <button class="photo-nav prev" data-nav="${p.id}" data-dir="-1" aria-label="Попереднє фото">‹</button>
      <button class="photo-nav next" data-nav="${p.id}" data-dir="1" aria-label="Наступне фото">›</button>
      <div class="photo-dots" id="dots-${p.id}">${photos.map((_,i)=>`<span style="opacity:${i===0?1:.4}"></span>`).join('')}</div>
    ` : '';
  return `
    <div class="card">
      ${p.status === 'sold' ? `<div class="stamp">продано</div>` : ''}
      <div class="photo-box">${photoInner}${nav}</div>
      <h3 class="card-title">${escapeHtml(p.title)}</h3>
      ${p.description ? `<p class="card-desc" data-readmore="${p.id}">${escapeHtml(p.description)}</p>` : ''}
      <div class="card-meta">
        <span class="card-price mono">${escapeHtml(p.price || '—')}</span>
        ${p.sizes ? `<span class="card-size">р. ${escapeHtml(p.sizes)}</span>` : ''}
      </div>
      ${(p.category || p.season) ? `<div class="card-cat">${[p.category, p.season].filter(Boolean).map(escapeHtml).join(' · ')}</div>` : ''}
      ${isAdmin ? `
        <div class="card-admin-row">
          <button class="btn small" data-edit="${p.id}">Змінити</button>
          <button class="btn small ghost" data-delete="${p.id}">Видалити</button>
        </div>
      ` : ''}
    </div>
  `;
}

function cycleCardPhoto(id, dir){
  const p = products.find(x => x.id === id);
  if(!p) return;
  const photos = p.photos || [];
  if(photos.length < 2) return;
  const cur = ((cardPhotoIndex[id]||0) + dir + photos.length) % photos.length;
  cardPhotoIndex[id] = cur;
  const img = document.getElementById('photo-'+id);
  if(img) img.src = photos[cur];
  const dotsWrap = document.getElementById('dots-'+id);
  if(dotsWrap) Array.from(dotsWrap.children).forEach((d,i)=> d.style.opacity = i===cur ? '1' : '.4');
}

function openLightbox(id){
  const p = products.find(x => x.id === id);
  if(!p) return;
  const photos = p.photos || [];
  if(!photos.length) return;
  let idx = cardPhotoIndex[id] || 0;

  const bg = document.createElement('div');
  bg.className = 'lightbox-bg';
  const renderInner = () => {
    bg.innerHTML = `
      <div class="lightbox-img-wrap">
        <img class="lightbox-img" src="${photos[idx]}" alt="${escapeHtml(p.title)}">
        <button class="lightbox-close" id="lb-close" aria-label="Закрити">×</button>
        ${photos.length > 1 ? `
          <button class="lightbox-nav prev" id="lb-prev" aria-label="Попереднє фото">‹</button>
          <button class="lightbox-nav next" id="lb-next" aria-label="Наступне фото">›</button>
          <div class="lightbox-count">${idx+1} / ${photos.length}</div>
        ` : ''}
      </div>
    `;
    document.getElementById('lb-close').onclick = close;
    if(photos.length > 1){
      document.getElementById('lb-prev').onclick = e => { e.stopPropagation(); idx=(idx-1+photos.length)%photos.length; cardPhotoIndex[id]=idx; renderInner(); };
      document.getElementById('lb-next').onclick = e => { e.stopPropagation(); idx=(idx+1)%photos.length; cardPhotoIndex[id]=idx; renderInner(); };
    }
  };
  const onKey = e => {
    if(e.key === 'Escape') close();
    else if(e.key === 'ArrowLeft' && photos.length > 1){ idx=(idx-1+photos.length)%photos.length; cardPhotoIndex[id]=idx; renderInner(); }
    else if(e.key === 'ArrowRight' && photos.length > 1){ idx=(idx+1)%photos.length; cardPhotoIndex[id]=idx; renderInner(); }
  };
  function close(){
    document.removeEventListener('keydown', onKey);
    bg.remove();
    const mainImg = document.getElementById('photo-'+id);
    const dotsWrap = document.getElementById('dots-'+id);
    if(mainImg) mainImg.src = photos[idx];
    if(dotsWrap) Array.from(dotsWrap.children).forEach((d,i)=> d.style.opacity = i===idx ? '1' : '.4');
  }
  bg.onclick = e => { if(e.target === bg) close(); };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  renderInner();
}

function openReadMoreModal(id){
  const p = products.find(x => x.id === id);
  if(!p) return;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h2>${escapeHtml(p.title)}</h2>
      <p class="sub" style="white-space:pre-wrap;line-height:1.6;color:var(--ink);">${escapeHtml(p.description)}</p>
      <div class="card-meta" style="margin:14px 0 4px;">
        <span class="card-price mono">${escapeHtml(p.price || '—')}</span>
        ${p.sizes ? `<span class="card-size">р. ${escapeHtml(p.sizes)}</span>` : ''}
      </div>
      <div class="modal-actions">
        <button class="btn primary" id="rm-close">Закрити</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  document.getElementById('rm-close').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
}

/* ---------- DOCK (only add-product button, floating) ---------- */
function renderDock(){
  let dock = document.querySelector('.dock');
  if(dock) dock.remove();
  if(!isAdmin) return;
  dock = document.createElement('div');
  dock.className = 'dock';
  dock.innerHTML = `<button class="btn primary" id="dock-add">+ Додати товар</button>`;
  document.body.appendChild(dock);
  document.getElementById('dock-add').onclick = () => openProductModal(null);
}

/* ---------- LOGIN MODAL ---------- */
function openLoginModal(){
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <h2>Вхід для продавця</h2>
      <p class="sub">Введіть спільний пароль, щоб керувати каталогом.</p>
      <div class="field">
        <label for="l-pass">Пароль</label>
        <div style="position:relative;">
          <input type="password" id="l-pass" autocomplete="off" style="padding-right:70px;">
          <button type="button" id="l-toggle" class="btn small ghost" style="position:absolute;right:4px;top:4px;padding:5px 10px;">Показати</button>
        </div>
      </div>
      <div class="err" id="l-err"></div>
      <div class="modal-actions">
        <button class="btn ghost" id="l-cancel">Скасувати</button>
        <button class="btn primary" id="l-ok">Увійти</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  const passInput = document.getElementById('l-pass');
  passInput.focus();
  document.getElementById('l-toggle').onclick = () => {
    const btn = document.getElementById('l-toggle');
    if(passInput.type === 'password'){ passInput.type = 'text'; btn.textContent = 'Сховати'; }
    else { passInput.type = 'password'; btn.textContent = 'Показати'; }
  };
  const close = () => bg.remove();
  document.getElementById('l-cancel').onclick = close;
  bg.onclick = e => { if(e.target === bg) close(); };
  const tryLogin = async () => {
    const res = await api('/api/login', { method:'POST', body: JSON.stringify({ password: passInput.value }) });
    if(res.ok){
      isAdmin = true;
      close();
      boot();
    } else if(res.status === 401){
      document.getElementById('l-err').textContent = (res.body && res.body.error) || 'Невірний пароль.';
    } else if(res.networkError){
      document.getElementById('l-err').textContent = 'Немає з\'єднання з сервером. Перевірте інтернет і спробуйте ще раз.';
    } else {
      document.getElementById('l-err').textContent = `Сервер відповів з помилкою (код ${res.status || '?'}). Схоже, не всі файли сайту завантажені правильно — перевірте, чи є на GitHub папки "api" і "lib" з файлами всередині.`;
    }
  };
  document.getElementById('l-ok').onclick = tryLogin;
  passInput.onkeydown = e => { if(e.key === 'Enter') tryLogin(); };
}

/* ---------- SETTINGS MODAL ---------- */
function openSettingsModal(){
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h2>Налаштування каталогу</h2>
      <div class="field">
        <label for="st-name">Назва</label>
        <input type="text" id="st-name" value="${escapeHtml(settings.name)}">
      </div>
      <div class="field">
        <label for="st-tag">Короткий опис</label>
        <input type="text" id="st-tag" value="${escapeHtml(settings.tagline||'')}">
      </div>
      <div class="field">
        <label for="st-telegram">Посилання на Telegram</label>
        <input type="url" id="st-telegram" value="${escapeHtml(settings.telegram||'')}" placeholder="https://t.me/imya">
      </div>
      <div class="field">
        <label for="st-viber">Посилання на Viber</label>
        <input type="url" id="st-viber" value="${escapeHtml(settings.viber||'')}" placeholder="viber://chat?number=%2B380...">
      </div>
      <div class="field">
        <label for="st-instagram">Посилання на Instagram</label>
        <input type="url" id="st-instagram" value="${escapeHtml(settings.instagram||'')}" placeholder="https://instagram.com/imya">
      </div>
      <p class="hint">Щоб змінити пароль входу, відредагуйте його в файлі lib/auth.js у коді сайту.</p>
      <div class="err" id="st-err"></div>
      <div class="modal-actions">
        <button class="btn ghost" id="st-cancel">Скасувати</button>
        <button class="btn primary" id="st-save">Зберегти</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  document.getElementById('st-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
  document.getElementById('st-save').onclick = async () => {
    const name = document.getElementById('st-name').value.trim();
    if(!name){ document.getElementById('st-err').textContent = 'Назва не може бути порожньою.'; return; }
    settings.name = name;
    settings.tagline = document.getElementById('st-tag').value.trim();
    settings.telegram = document.getElementById('st-telegram').value.trim();
    settings.viber = document.getElementById('st-viber').value.trim();
    settings.instagram = document.getElementById('st-instagram').value.trim();
    const ok = await saveData();
    if(ok){ bg.remove(); render(); }
  };
}

/* ---------- PHOTO COMPRESS + UPLOAD ---------- */
function fileToCompressedDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const maxW = 1000;
        if(w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while(dataUrl.length > 1200000 && quality > 0.35){
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}

function renderPhotoArea(){
  const area = document.getElementById('photo-area');
  if(!area) return;
  area.innerHTML = `
    ${pendingPhotos.length ? `<div class="thumbs" id="thumbs">${pendingPhotos.map((src,i) => `
      <div class="thumb-item">
        <img src="${src}">
        <button type="button" class="thumb-remove" data-remove="${i}" aria-label="Видалити фото">×</button>
      </div>
    `).join('')}</div>` : ''}
    <div class="photo-drop" id="photo-drop">${pendingPhotos.length ? 'Додати ще фото' : 'Натисніть, щоб додати фото (можна декілька)'}</div>
    <input type="file" accept="image/*" id="photo-file" multiple style="display:none;">
  `;
  document.getElementById('photo-drop').onclick = () => document.getElementById('photo-file').click();
  document.getElementById('photo-file').onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if(!files.length) return;
    document.getElementById('photo-drop').textContent = 'Завантажуємо фото…';
    for(const file of files){
      try{
        const dataUrl = await fileToCompressedDataUrl(file);
        const up = await api('/api/upload', { method:'POST', body: JSON.stringify({ dataUrl }) });
        if(up.ok && up.body && up.body.url){
          pendingPhotos.push(up.body.url);
        } else {
          showBanner((up.body && up.body.error) || 'Не вдалося завантажити фото. Перевірте підключення Blob-сховища в Vercel.', true);
        }
      }catch(err){
        showBanner('Не вдалося обробити фото.', true);
      }
    }
    renderPhotoArea();
  };
  area.querySelectorAll('[data-remove]').forEach(btn => {
    btn.onclick = () => { pendingPhotos.splice(parseInt(btn.dataset.remove,10), 1); renderPhotoArea(); };
  });
}

/* ---------- PRODUCT MODAL ---------- */
function openProductModal(id){
  const existing = id ? products.find(x => x.id === id) : null;
  const p = existing || { title:'', description:'', price:'', sizes:'', category:'Жіноче', season:'Демісезон', status:'available', photos:[] };
  pendingPhotos = (p.photos || []).slice();

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h2>${id ? 'Змінити товар' : 'Новий товар'}</h2>
      <div class="field">
        <label>Фото (можна додати декілька)</label>
        <div id="photo-area"></div>
      </div>
      <div class="field">
        <label for="p-title">Назва</label>
        <input type="text" id="p-title" placeholder="Наприклад: Кросівки Nike Air, білі" value="${escapeHtml(p.title)}">
      </div>
      <div class="field">
        <label for="p-desc">Опис</label>
        <textarea id="p-desc" placeholder="Стан, матеріал, особливості…">${escapeHtml(p.description)}</textarea>
      </div>
      <div class="row2">
        <div class="field">
          <label for="p-price">Ціна</label>
          <input type="text" id="p-price" placeholder="Наприклад: 800 грн" value="${escapeHtml(p.price)}">
        </div>
        <div class="field">
          <label for="p-sizes">Розмір</label>
          <input type="text" id="p-sizes" placeholder="Наприклад: 38" value="${escapeHtml(p.sizes)}">
        </div>
      </div>
      <div class="row2">
        <div class="field">
          <label for="p-cat">Категорія</label>
          <select id="p-cat">
            ${['Жіноче','Чоловіче','Дитяче','Унісекс'].map(c => `<option ${c===p.category?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="p-season">Сезон</label>
          <select id="p-season">
            ${SEASONS.map(s => `<option ${s===p.season?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row2">
        <div class="field">
          <label for="p-status">Статус</label>
          <select id="p-status">
            <option value="available" ${p.status==='available'?'selected':''}>В наявності</option>
            <option value="sold" ${p.status==='sold'?'selected':''}>Продано</option>
          </select>
        </div>
      </div>
      <div class="err" id="p-err"></div>
      <div class="modal-actions">
        <button class="btn ghost" id="p-cancel">Скасувати</button>
        <button class="btn primary" id="p-save">Зберегти</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  renderPhotoArea();
  document.getElementById('p-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };

  document.getElementById('p-save').onclick = async () => {
    const title = document.getElementById('p-title').value.trim();
    if(!title){ document.getElementById('p-err').textContent = 'Введіть назву товару.'; return; }
    const saveBtn = document.getElementById('p-save');
    saveBtn.textContent = 'Зберігаємо…'; saveBtn.disabled = true;
    const product = {
      id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()),
      title,
      description: document.getElementById('p-desc').value.trim(),
      price: document.getElementById('p-price').value.trim(),
      sizes: document.getElementById('p-sizes').value.trim(),
      category: document.getElementById('p-cat').value,
      season: document.getElementById('p-season').value,
      status: document.getElementById('p-status').value,
      photos: pendingPhotos.slice(),
      createdAt: existing ? existing.createdAt : Date.now()
    };
    const prevProducts = products;
    if(existing){
      products = products.map(x => x.id === product.id ? product : x);
    } else {
      products.unshift(product);
    }
    const ok = await saveData();
    if(ok){
      bg.remove();
      render();
    } else {
      products = prevProducts;
      saveBtn.textContent = 'Зберегти'; saveBtn.disabled = false;
    }
  };
}

/* ---------- DELETE ---------- */
function confirmDelete(id){
  const p = products.find(x => x.id === id);
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <h2>Видалити товар?</h2>
      <p class="sub">«${escapeHtml(p ? p.title : '')}» буде видалено без можливості відновити.</p>
      <div class="modal-actions">
        <button class="btn ghost" id="d-cancel">Скасувати</button>
        <button class="btn primary" id="d-ok" style="background:var(--rust);border-color:var(--rust);">Видалити</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  document.getElementById('d-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
  document.getElementById('d-ok').onclick = async () => {
    const prevProducts = products;
    products = products.filter(x => x.id !== id);
    const ok = await saveData();
    if(ok){ bg.remove(); render(); }
    else { products = prevProducts; }
  };
}

boot();
