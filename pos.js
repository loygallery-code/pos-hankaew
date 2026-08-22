// ================================================================
// pos.js — ໜ້າຂາຍເຄື່ອງ
// ================================================================
let products = [];
let cart = [];
let currentCat = 'ທັງໝົດ';
const PRODUCTS_CACHE_KEY = 'pos_products_cache';
const PENDING_KEY = 'pos_pending_sales';

function loadProductsFromCache(){
  try{
    const cached = JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) || 'null');
    if(cached) products = cached;
  }catch(e){}
}
async function loadProducts(){
  const { data, error } = await sb.from('products').select('*').order('name');
  if(error){ if(!products.length) alert('ໂຫຼດສິນຄ້າບໍ່ໄດ້: ' + error.message); return; }
  products = data;
  try{ localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(data)); }catch(e){}
}

// ---------------- ຄິວລໍ sync ຕອນອອຟລາຍ ----------------
function getPending(){ try{ return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); }catch(e){ return []; } }
function savePending(list){ try{ localStorage.setItem(PENDING_KEY, JSON.stringify(list)); }catch(e){} updateOnlineBadge(); }

function updateOnlineBadge(){
  const badge = document.getElementById('onlineBadge');
  if(!badge) return;
  const pendingCount = getPending().length;
  if(!navigator.onLine){
    badge.textContent = pendingCount>0 ? `🔴 ອອຟລາຍ (${pendingCount} ບິນລໍ sync)` : '🔴 ອອຟລາຍ';
  } else if(pendingCount>0){
    badge.textContent = `🟡 ກຳລັງ sync (${pendingCount})`;
  } else {
    badge.textContent = '🟢 ອອນລາຍ';
  }
}

function queueOffline(saleRecord, cartItems){
  cartItems.forEach(c=>{
    const p = products.find(pp=>pp.id===c.productId);
    if(p) p.qty = +(p.qty - c.qty).toFixed(2);
  });
  try{ localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products)); }catch(e){}
  const pending = getPending();
  pending.push({ saleRecord, items: cartItems, queuedAt: Date.now() });
  savePending(pending);
}

async function trySyncPending(){
  if(!navigator.onLine) { updateOnlineBadge(); return; }
  let pending = getPending();
  if(pending.length===0){ updateOnlineBadge(); return; }
  const remaining = [];
  let anySynced = false;
  for(const p of pending){
    try{
      const { data: sale, error: saleErr } = await sb.from('sales').insert(p.saleRecord).select().single();
      if(saleErr) throw saleErr;
      const items = p.items.map(c => ({
        sale_id: sale.id, product_id: c.productId, name: c.name, unit: c.unit, qty: c.qty, price: c.price, cost: c.cost, category: c.category
      }));
      const { error: itemsErr } = await sb.from('sale_items').insert(items);
      if(itemsErr) throw itemsErr;
      for(const c of p.items){
        const { data: prod } = await sb.from('products').select('qty').eq('id', c.productId).single();
        if(prod){
          const newQty = +(prod.qty - c.qty).toFixed(2);
          await sb.from('products').update({ qty: newQty }).eq('id', c.productId);
        }
      }
      anySynced = true;
    }catch(err){
      remaining.push(p);
    }
  }
  savePending(remaining);
  if(anySynced){ await loadProducts(); renderGrid(); }
}
window.addEventListener('online', trySyncPending);
window.addEventListener('offline', updateOnlineBadge);
setInterval(trySyncPending, 30000);

function renderCats(){
  const wrap = document.getElementById('posCats');
  const all = ['ທັງໝົດ', ...APP_CATEGORIES];
  wrap.innerHTML = '';
  all.forEach(c=>{
    const chip = document.createElement('button');
    chip.className = 'chip' + (c===currentCat ? ' active' : '');
    chip.textContent = c;
    chip.addEventListener('click', ()=>{ currentCat=c; renderCats(); renderGrid(); });
    wrap.appendChild(chip);
  });
}
function catColor(cat){
  const palette = {'ເຄື່ອງແຫ້ງ':'#E2963A','ອາຫານສົດ':'#1F4B3F','ວັດສະດຸກໍ່ສ້າງ':'#B8452F'};
  return palette[cat] || '#8A8370';
}
function renderGrid(){
  const grid = document.getElementById('posGrid');
  const q = document.getElementById('posSearch').value.trim().toLowerCase();
  let list = products.filter(p => currentCat==='ທັງໝົດ' || p.category===currentCat);
  if(q) list = list.filter(p => p.name.toLowerCase().includes(q) || (p.barcode||'').includes(q));
  grid.innerHTML = '';
  if(list.length===0){ grid.innerHTML = '<div class="empty-note">ບໍ່ພົບສິນຄ້າ</div>'; return; }
  list.forEach(p=>{
    const card = document.createElement('button');
    card.className = 'pcard' + (p.qty<=p.low_threshold ? ' low' : '');
    card.innerHTML = `
      ${p.image_url ? `<img src="${p.image_url}" style="width:100%;height:76px;object-fit:cover;border-radius:8px;margin-bottom:2px;">` : ''}
      <span class="catdot" style="background:${catColor(p.category)}"></span>
      <span class="name">${p.name}</span>
      <span class="price mono">${fmt(p.price)}</span>
      <span class="unit">/ ${p.unit}</span>
      <span class="stock">ຄົງເຫຼືອ: ${p.qty} ${p.unit}</span>
    `;
    card.addEventListener('click', ()=>addToCart(p));
    grid.appendChild(card);
  });
}
document.getElementById('posSearch').addEventListener('input', renderGrid);
document.getElementById('posSearch').addEventListener('keydown', e=>{
  if(e.key==='Enter'){
    const q = e.target.value.trim();
    const exact = products.find(p => p.barcode && p.barcode===q);
    if(exact){ addToCart(exact); e.target.value=''; renderGrid(); }
  }
});

function addToCart(p){
  if(p.qty<=0){ alert('ສິນຄ້າໝົດສະຕັອກ'); return; }
  const existing = cart.find(c=>c.productId===p.id);
  const step = (p.unit==='ອັນ'||p.unit==='ຖົງ') ? 1 : 0.1;
  if(existing){
    if(existing.qty + step > p.qty){ alert('ສິນຄ້າໃນສາງບໍ່ພຽງພໍ'); return; }
    existing.qty = +(existing.qty+step).toFixed(2);
  } else {
    cart.push({productId:p.id, name:p.name, unit:p.unit, price:p.price, cost:p.cost, category:p.category, qty:step, maxQty:p.qty});
  }
  renderCart();
}
function renderCart(){
  const wrap = document.getElementById('cartItems');
  document.getElementById('cartCount').textContent = cart.length+' ລາຍການ';
  if(cart.length===0){ wrap.innerHTML='<div class="empty-note">ຍັງບໍ່ມີສິນຄ້າໃນກະຕ່າ</div>'; }
  else{
    wrap.innerHTML='';
    cart.forEach((c,i)=>{
      const row=document.createElement('div');
      row.className='cart-row';
      row.innerHTML = `
        <div style="flex:1;">
          <div class="ci-name">${c.name}</div>
          <div class="ci-sub">${fmt(c.price)} / ${c.unit}</div>
        </div>
        <div class="qty-ctl">
          <button data-act="dec">−</button>
          <input type="text" class="mono" value="${c.qty}" data-act="edit">
          <button data-act="inc">+</button>
        </div>
        <div class="ci-total mono">${fmt(c.price*c.qty)}</div>
        <button class="ci-del" data-act="del">✕</button>
      `;
      const step = (c.unit==='ອັນ'||c.unit==='ຖົງ') ? 1 : 0.1;
      row.querySelector('[data-act="inc"]').addEventListener('click', ()=>{
        if(c.qty+step<=c.maxQty){ c.qty=+(c.qty+step).toFixed(2); renderCart(); } else alert('ສາງບໍ່ພຽງພໍ');
      });
      row.querySelector('[data-act="dec"]').addEventListener('click', ()=>{
        c.qty=+(c.qty-step).toFixed(2);
        if(c.qty<=0){ cart.splice(i,1); }
        renderCart();
      });
      row.querySelector('[data-act="edit"]').addEventListener('change', e=>{
        let v = parseFloat(e.target.value)||0;
        if(v>c.maxQty){ v=c.maxQty; alert('ສາງບໍ່ພຽງພໍ'); }
        if(v<=0){ cart.splice(i,1); } else { c.qty=v; }
        renderCart();
      });
      row.querySelector('[data-act="del"]').addEventListener('click', ()=>{ cart.splice(i,1); renderCart(); });
      wrap.appendChild(row);
    });
  }
  const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
  const count = cart.reduce((s,c)=>s+c.qty,0);
  document.getElementById('rfCount').textContent = count.toFixed(2).replace(/\.00$/,'');
  document.getElementById('rfTotal').textContent = fmt(total);
  document.getElementById('checkoutBtn').disabled = cart.length===0;
}
document.getElementById('clearCartBtn').addEventListener('click', ()=>{ cart=[]; renderCart(); });

let allDebtors = [];
async function loadDebtorsForCheckout(){
  const { data, error } = await sb.from('debtors').select('*').order('name');
  if(!error && data) allDebtors = data;
  const sel = document.getElementById('coDebtorSelect');
  sel.innerHTML = '<option value="">— ເລືອກລູກໜີ້ —</option>' + allDebtors.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
}
document.getElementById('coAddDebtorBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('coNewDebtorName').value.trim();
  if(!name){ alert('ກະລຸນາໃສ່ຊື່ລູກໜີ້'); return; }
  const { data, error } = await sb.from('debtors').insert({ name }).select().single();
  if(error){ alert('ເພີ່ມບໍ່ສຳເລັດ: '+error.message); return; }
  await loadDebtorsForCheckout();
  document.getElementById('coDebtorSelect').value = data.id;
  document.getElementById('coNewDebtorName').value = '';
});

document.getElementById('checkoutBtn').addEventListener('click', async ()=>{
  const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
  document.getElementById('coCount').textContent = cart.length+' ລາຍການ';
  document.getElementById('coTotal').textContent = fmt(total);
  document.getElementById('coCash').value='';
  document.getElementById('coIsThb').checked = false;
  document.getElementById('coIsCredit').checked = false;
  document.getElementById('coNewDebtorName').value = '';
  document.getElementById('coChange').textContent='0 ₭';
  document.getElementById('coBreakdown').innerHTML='';
  updateCashLabel();
  updateCreditUI();
  await loadDebtorsForCheckout();
  document.getElementById('checkoutModalBg').classList.add('open');
});

function updateCreditUI(){
  const isCredit = document.getElementById('coIsCredit').checked;
  document.getElementById('coCreditFields').style.display = isCredit ? 'block' : 'none';
  document.getElementById('coCashFields').style.display = isCredit ? 'none' : 'block';
  document.getElementById('coIsThb').disabled = isCredit;
}
document.getElementById('coIsCredit').addEventListener('change', updateCreditUI);

function updateCashLabel(){
  const isThb = document.getElementById('coIsThb').checked;
  document.getElementById('coCashLabel').textContent = isThb ? 'ຮັບເງິນມາ (ບາດ)' : 'ຮັບເງິນມາ (ກີບ)';
  const note = document.getElementById('coThbNote');
  if(isThb){
    const rate = Number(APP_SETTINGS.rate_buy_thb)||0;
    note.style.display = 'block';
    note.textContent = `ອັດຕາຊື້ບາດ: 1 ບາດ = ${rate.toLocaleString('en-US')} ກີບ`;
  } else {
    note.style.display = 'none';
  }
}
document.getElementById('coIsThb').addEventListener('change', ()=>{ updateCashLabel(); computeChange(); });

function computeChange(){
  const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
  const isThb = document.getElementById('coIsThb').checked;
  const rawInput = parseFloat(document.getElementById('coCash').value)||0;
  const rate = Number(APP_SETTINGS.rate_buy_thb)||0;
  const cashLak = isThb ? rawInput * rate : rawInput;
  const rawChange = Math.max(0, cashLak-total);
  let rounded = rawChange;
  if(rawChange > 0){ rounded = Math.round(rawChange/1000)*1000; }
  document.getElementById('coChange').textContent = fmt(rounded);
  const noteEl = document.getElementById('coRoundNote');
  if(noteEl){
    noteEl.textContent = (rounded !== Math.round(rawChange)) ? `(ປັດເສດຈາກ ${fmt(rawChange)} ໃຫ້ເປັນຈຳນວນເຕັມ 1,000 ກີບ)` : '';
  }
  renderChangeBreakdown(rounded);
  return { rawInput, cashLak, change: rounded, rawChange };
}
document.getElementById('coCash').addEventListener('input', computeChange);

const DENOMS = [100000, 50000, 20000, 10000, 5000, 2000, 1000];
function renderChangeBreakdown(change){
  const wrap = document.getElementById('coBreakdown');
  let remaining = Math.round(change);
  const rows = [];
  DENOMS.forEach(d=>{
    const count = Math.floor(remaining / d);
    if(count > 0){ rows.push([d, count]); remaining -= count * d; }
  });
  if(rows.length === 0){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = `
    <div style="font-size:11px;color:var(--ink-soft);font-weight:700;margin-bottom:4px;">ແຍກໃບເງິນທອນ</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${rows.map(([d,c])=>`<span class="pill" style="background:var(--paper-2);color:var(--ink);">ໃບ ${d.toLocaleString('en-US')} × ${c}</span>`).join('')}
    </div>
    ${remaining>0 ? `<div style="font-size:11px;color:var(--brick);margin-top:4px;">ເສດ ${remaining} ກີບ (ຕ່ຳກວ່າໃບ 1,000)</div>` : ''}
  `;
}
document.getElementById('coCancel').addEventListener('click', ()=>document.getElementById('checkoutModalBg').classList.remove('open'));

let lastSaleForPrint = null;

document.getElementById('coConfirm').addEventListener('click', async ()=>{
  const btn = document.getElementById('coConfirm');
  const isCredit = document.getElementById('coIsCredit').checked;
  let debtorId = null;
  if(isCredit){
    debtorId = document.getElementById('coDebtorSelect').value;
    if(!debtorId){ alert('ກະລຸນາເລືອກ ຫຼື ເພີ່ມລູກໜີ້ກ່ອນ'); return; }
  }
  btn.disabled = true; btn.textContent = 'ກຳລັງບັນທຶກ…';
  try{
    const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
    const totalCost = cart.reduce((s,c)=>s+c.cost*c.qty,0);
    const isThb = !isCredit && document.getElementById('coIsThb').checked;
    const { rawInput, cashLak, change, rawChange } = isCredit ? {rawInput:0,cashLak:0,change:0,rawChange:0} : computeChange();
    const rate = Number(APP_SETTINGS.rate_buy_thb)||null;

    const saleRecord = {
      total, total_cost: totalCost, profit: total-totalCost,
      cash_received: isCredit ? null : (rawInput ? cashLak : null),
      paid_currency: isThb ? 'THB' : 'LAK',
      cash_foreign: isThb ? rawInput : null,
      fx_rate_used: isThb ? rate : null,
      is_credit: isCredit,
      debtor_id: isCredit ? debtorId : null,
    };

    let wentOffline = false;
    if(navigator.onLine){
      try{
        const { data: sale, error: saleErr } = await sb.from('sales').insert(saleRecord).select().single();
        if(saleErr) throw saleErr;
        const items = cart.map(c => ({
          sale_id: sale.id, product_id: c.productId, name: c.name, unit: c.unit, qty: c.qty, price: c.price, cost: c.cost, category: c.category
        }));
        const { error: itemsErr } = await sb.from('sale_items').insert(items);
        if(itemsErr) throw itemsErr;
        for(const c of cart){
          const p = products.find(pp=>pp.id===c.productId);
          const newQty = +(p.qty - c.qty).toFixed(2);
          const { error: updErr } = await sb.from('products').update({ qty: newQty }).eq('id', p.id);
          if(updErr) throw updErr;
          p.qty = newQty;
        }
        try{ localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products)); }catch(e){}
      }catch(networkErr){
        wentOffline = true;
        queueOffline(saleRecord, cart);
      }
    } else {
      wentOffline = true;
      queueOffline(saleRecord, cart);
    }

    const debtorName = isCredit ? (allDebtors.find(d=>d.id===debtorId)?.name || document.getElementById('coDebtorSelect').selectedOptions[0]?.textContent) : null;
    lastSaleForPrint = {
      items: cart, total,
      cash: rawInput ? cashLak : null, change, rawChange,
      isThb, cashForeign: isThb ? rawInput : null, rate: isThb ? rate : null,
      offline: wentOffline, isCredit, debtorName,
    };

    document.getElementById('doneTotal').textContent = fmt(total);
    document.getElementById('doneChange').textContent = isCredit ? 'ຕິດໜີ້' : fmt(change);
    document.getElementById('doneModalBg').querySelector('h3').textContent = isCredit
      ? `✅ ບັນທຶກຕິດໜີ້ສຳເລັດ (${debtorName})`
      : (wentOffline ? '✅ ຂາຍສຳເລັດ (ບໍ່ມີເນັດ — ຈະ sync ອັດຕະໂນມັດ)' : '✅ ຂາຍສຳເລັດ');
    document.getElementById('checkoutModalBg').classList.remove('open');
    document.getElementById('doneModalBg').classList.add('open');

    cart=[]; renderCart(); renderGrid();
    updateOnlineBadge();
  }catch(err){
    alert('ບັນທຶກການຂາຍບໍ່ສຳເລັດ: ' + err.message + '\nກະລຸນາກວດການເຊື່ອມຕໍ່ອິນເຕີເນັດແລ້ວລອງໃໝ່');
  }finally{
    btn.disabled = false; btn.textContent = 'ຢືນຢັນການຂາຍ';
  }
});

document.getElementById('doneClose').addEventListener('click', ()=>{
  document.getElementById('doneModalBg').classList.remove('open');
  lastSaleForPrint = null;
});
document.getElementById('donePrint').addEventListener('click', ()=>{
  if(lastSaleForPrint) printReceipt(lastSaleForPrint);
  document.getElementById('doneModalBg').classList.remove('open');
  lastSaleForPrint = null;
});

function printReceipt(sale){
  document.documentElement.style.setProperty('--receipt-width', APP_SETTINGS.receipt_width || '80mm');
  const d = new Date();
  let html = `<div style="text-align:center;font-weight:700;">${APP_SETTINGS.shop_name}</div>
  <div style="text-align:center;font-size:10px;margin-bottom:8px;">${d.toLocaleString('lo-LA')}</div>
  <div>------------------------------</div>`;
  sale.items.forEach(it=>{
    html += `<div>${it.name}</div><div style="display:flex;justify-content:space-between;"><span>${it.qty} ${it.unit} x ${fmt(it.price)}</span><span>${fmt(it.qty*it.price)}</span></div>`;
  });
  html += `<div>------------------------------</div>
  <div style="display:flex;justify-content:space-between;font-weight:700;"><span>ລວມ</span><span>${fmt(sale.total)}</span></div>`;
  if(sale.isCredit){
    html += `<div style="text-align:center;font-weight:700;margin-top:6px;border:1px solid #999;padding:4px;">ຕິດໜີ້ — ${sale.debtorName||''}</div>`;
  } else if(sale.isThb && sale.cashForeign){
    html += `<div style="display:flex;justify-content:space-between;"><span>ຮັບເງິນ (ບາດ)</span><span>${sale.cashForeign.toLocaleString('en-US')} ບາດ</span></div>
    <div style="display:flex;justify-content:space-between;"><span>ອັດຕາ</span><span>${sale.rate.toLocaleString('en-US')}</span></div>`;
  } else if(sale.cash){
    html += `<div style="display:flex;justify-content:space-between;"><span>ຮັບເງິນ</span><span>${fmt(sale.cash)}</span></div>`;
  }
  if(sale.cash){
    html += `<div style="display:flex;justify-content:space-between;"><span>ເງິນທອນ</span><span>${fmt(sale.change)}</span></div>`;
    if(sale.rawChange !== undefined && Math.round(sale.rawChange) !== sale.change){
      html += `<div style="font-size:9px;color:#555;">(ປັດເສດຈາກ ${fmt(sale.rawChange)})</div>`;
    }
  }
  html += `<div style="text-align:center;margin-top:10px;">ຂອບໃຈທີ່ອຸດໜູນ 🙏</div>`;
  document.getElementById('printArea').innerHTML = html;
  window.print();
}

initApp('pos', async ()=>{
  loadProductsFromCache();
  renderCats();
  renderGrid();
  renderCart();
  updateOnlineBadge();
  trySyncPending();
  await loadProducts();
  renderGrid(); // refresh with latest stock once network data arrives
});
