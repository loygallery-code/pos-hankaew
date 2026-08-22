// ================================================================
// pos.js — ໜ້າຂາຍເຄື່ອງ
// ================================================================
let products = [];
let cart = [];
let currentCat = 'ທັງໝົດ';

async function loadProducts(){
  const { data, error } = await sb.from('products').select('*').order('name');
  if(error){ alert('ໂຫຼດສິນຄ້າບໍ່ໄດ້: ' + error.message); return; }
  products = data;
}

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
    cart.push({productId:p.id, name:p.name, unit:p.unit, price:p.price, cost:p.cost, qty:step, maxQty:p.qty});
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

document.getElementById('checkoutBtn').addEventListener('click', ()=>{
  const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
  document.getElementById('coCount').textContent = cart.length+' ລາຍການ';
  document.getElementById('coTotal').textContent = fmt(total);
  document.getElementById('coCash').value='';
  document.getElementById('coChange').textContent='0 ₭';
  document.getElementById('checkoutModalBg').classList.add('open');
});
document.getElementById('coCash').addEventListener('input', ()=>{
  const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
  const cash = parseFloat(document.getElementById('coCash').value)||0;
  document.getElementById('coChange').textContent = fmt(Math.max(0,cash-total));
});
document.getElementById('coCancel').addEventListener('click', ()=>document.getElementById('checkoutModalBg').classList.remove('open'));

document.getElementById('coConfirm').addEventListener('click', async ()=>{
  const btn = document.getElementById('coConfirm');
  btn.disabled = true; btn.textContent = 'ກຳລັງບັນທຶກ…';
  try{
    const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
    const totalCost = cart.reduce((s,c)=>s+c.cost*c.qty,0);
    const cash = parseFloat(document.getElementById('coCash').value)||null;

    const { data: sale, error: saleErr } = await sb.from('sales')
      .insert({ total, total_cost: totalCost, profit: total-totalCost, cash_received: cash })
      .select().single();
    if(saleErr) throw saleErr;

    const items = cart.map(c => ({
      sale_id: sale.id, product_id: c.productId, name: c.name, unit: c.unit, qty: c.qty, price: c.price, cost: c.cost
    }));
    const { error: itemsErr } = await sb.from('sale_items').insert(items);
    if(itemsErr) throw itemsErr;

    // ຫຼຸດສະຕັອກ ທີລະລາຍການ
    for(const c of cart){
      const p = products.find(pp=>pp.id===c.productId);
      const newQty = +(p.qty - c.qty).toFixed(2);
      const { error: updErr } = await sb.from('products').update({ qty: newQty }).eq('id', p.id);
      if(updErr) throw updErr;
      p.qty = newQty;
    }

    printReceipt({ items: cart, total });
    cart=[]; renderCart(); renderGrid();
    document.getElementById('checkoutModalBg').classList.remove('open');
  }catch(err){
    alert('ບັນທຶກການຂາຍບໍ່ສຳເລັດ: ' + err.message + '\nກະລຸນາກວດການເຊື່ອມຕໍ່ອິນເຕີເນັດແລ້ວລອງໃໝ່');
  }finally{
    btn.disabled = false; btn.textContent = 'ຢືນຢັນ & ພິມໃບບິນ';
  }
});

function printReceipt(sale){
  const d = new Date();
  let html = `<div style="text-align:center;font-weight:700;">${APP_SETTINGS.shop_name}</div>
  <div style="text-align:center;font-size:11px;margin-bottom:8px;">${d.toLocaleString('lo-LA')}</div>
  <div>------------------------------</div>`;
  sale.items.forEach(it=>{
    html += `<div>${it.name}</div><div style="display:flex;justify-content:space-between;"><span>${it.qty} ${it.unit} x ${fmt(it.price)}</span><span>${fmt(it.qty*it.price)}</span></div>`;
  });
  html += `<div>------------------------------</div>
  <div style="display:flex;justify-content:space-between;font-weight:700;"><span>ລວມ</span><span>${fmt(sale.total)}</span></div>
  <div style="text-align:center;margin-top:10px;">ຂອບໃຈທີ່ອຸດໜູນ 🙏</div>`;
  document.getElementById('printArea').innerHTML = html;
  window.print();
}

initApp('pos', async ()=>{
  await loadProducts();
  renderCats();
  renderGrid();
  renderCart();
});
