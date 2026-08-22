// ================================================================
// app.js — ຟັງຊັນລວມທີ່ໃຊ້ຮ່ວມກັນທຸກໜ້າ (POS, ສາງ, ລາຍງານ, ຕັ້ງຄ່າ)
// ໂຫຼດຫຼັງ supabase-client.js ໃນທຸກໜ້າ HTML
// ================================================================

const fmt = n => Math.round(n||0).toLocaleString('en-US') + ' ₭';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

let APP_SETTINGS = { shop_name: 'ຮ້ານເອື້ອຍ', pin: '1234' };
let APP_CATEGORIES = [];

const UNLOCK_KEY = 'pos_unlocked_until';
const UNLOCK_DURATION_MS = 8 * 60 * 60 * 1000; // ຈື່ຈຳການປົດລັອກໄວ້ 8 ຊົ່ວໂມງ

function isUnlocked(){
  const until = parseInt(localStorage.getItem(UNLOCK_KEY) || '0', 10);
  return Date.now() < until;
}
function setUnlocked(){
  localStorage.setItem(UNLOCK_KEY, String(Date.now() + UNLOCK_DURATION_MS));
}
function lockNow(){
  localStorage.removeItem(UNLOCK_KEY);
  location.reload();
}

async function loadSettings(){
  const { data, error } = await sb.from('app_settings').select('*').eq('id', 1).single();
  if(!error && data) APP_SETTINGS = data;
  return APP_SETTINGS;
}

async function loadCategories(){
  const { data, error } = await sb.from('categories').select('name').order('created_at');
  if(!error && data) APP_CATEGORIES = data.map(c => c.name);
  return APP_CATEGORIES;
}

// ---------------- PIN LOCK ----------------
let pinBuffer = '';
function renderPinDots(){
  const el = document.getElementById('pinDots'); if(!el) return;
  el.innerHTML = '';
  for(let i=0;i<4;i++){
    const d = document.createElement('div');
    d.className = 'pin-dot' + (i < pinBuffer.length ? ' filled' : '');
    el.appendChild(d);
  }
}
function buildPinPad(onUnlock){
  const pad = document.getElementById('pinPad'); if(!pad) return;
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  pad.innerHTML = '';
  keys.forEach(k=>{
    const b = document.createElement('button');
    if(k===''){ b.style.visibility='hidden'; }
    else{
      b.textContent = k;
      if(k==='⌫') b.classList.add('wide');
      b.addEventListener('click', ()=>pinPress(k, onUnlock));
    }
    pad.appendChild(b);
  });
}
function pinPress(k, onUnlock){
  if(k==='⌫'){ pinBuffer = pinBuffer.slice(0,-1); }
  else if(pinBuffer.length<4){ pinBuffer += k; }
  renderPinDots();
  const errEl = document.getElementById('lockErr');
  if(errEl) errEl.textContent='';
  if(pinBuffer.length===4){
    setTimeout(()=>{
      if(pinBuffer === (APP_SETTINGS.pin || '1234')){
        document.getElementById('lock').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        onUnlock();
      } else {
        if(errEl) errEl.textContent = 'ລະຫັດບໍ່ຖືກຕ້ອງ, ລອງໃໝ່';
        pinBuffer = '';
        renderPinDots();
      }
    }, 120);
  }
}

/**
 * ເອີ້ນຄັ້ງດຽວໃນທຸກໜ້າ — ໂຫຼດ settings+categories ຈາກ Supabase,
 * ສະແດງໜ້າ lock screen, ແລ້ວເອີ້ນ onUnlock() ຫຼັງໃສ່ PIN ຖືກ
 */
async function initApp(pageName, onUnlock){
  await loadSettings();
  await loadCategories();
  document.getElementById('shopNameLbl').textContent = APP_SETTINGS.shop_name;
  document.querySelectorAll('nav a').forEach(a=>{
    a.classList.toggle('active', a.dataset.page === pageName);
  });
  const lockBtn = document.getElementById('lockBtn');
  if(lockBtn) lockBtn.addEventListener('click', lockNow);

  if(isUnlocked()){
    document.getElementById('lock').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    onUnlock();
    return;
  }

  const unlockAndGo = () => { setUnlocked(); onUnlock(); };
  buildPinPad(unlockAndGo);
  renderPinDots();
  document.addEventListener('keydown', e=>{
    if(document.getElementById('app').style.display === 'flex') return;
    if(/^[0-9]$/.test(e.key)) pinPress(e.key, unlockAndGo);
    if(e.key === 'Backspace') pinPress('⌫', unlockAndGo);
  });
}
