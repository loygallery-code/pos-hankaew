// ================================================================
// stock.js — ໜ້າສາງສິນຄ້າ
// ================================================================
let products = [];
let currentStockCat = 'ທັງໝົດ';
const PRODUCTS_CACHE_KEY = 'pos_products_cache';

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

function renderStockCats(){
  const wrap = document.getElementById('stockCats');
  const all = ['ທັງໝົດ', ...APP_CATEGORIES];
  wrap.innerHTML = '';
  all.forEach(c=>{
    const chip = document.createElement('button');
    chip.className = 'chip' + (c===currentStockCat ? ' active' : '');
    chip.textContent = c;
    chip.addEventListener('click', ()=>{ currentStockCat=c; renderStockCats(); renderStock(); });
    wrap.appendChild(chip);
  });
}

function renderStock(){
  const q = (document.getElementById('stockSearch').value||'').trim().toLowerCase();
  const tbody = document.getElementById('stockTbody');
  const list = products.filter(p => p.name.toLowerCase().includes(q) && (currentStockCat==='ທັງໝົດ' || p.category===currentStockCat));
  tbody.innerHTML = '';
  if(list.length===0){ tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);">ບໍ່ພົບສິນຄ້າ</td></tr>'; }
  list.forEach(p=>{
    const tr = document.createElement('tr');
    if(p.qty<=p.low_threshold) tr.className='low';
    tr.innerHTML = `
      <td><div style="display:flex;align-items:center;gap:8px;">
        ${p.image_url ? `<img src="${p.image_url}" style="width:34px;height:34px;border-radius:7px;object-fit:cover;flex-shrink:0;">` : `<div style="width:34px;height:34px;border-radius:7px;background:var(--paper-2);flex-shrink:0;"></div>`}
        <div><strong>${p.name}</strong>${p.barcode?`<div style="font-size:10.5px;color:var(--ink-soft);">${p.barcode}</div>`:''}</div>
      </div></td>
      <td>${p.category}</td>
      <td>${p.unit}</td>
      <td>${p.qty} ${p.qty<=p.low_threshold?'<span class="pill low">ໃກ້ໝົດ</span>':''}</td>
      <td class="mono">${fmt(p.cost)}</td>
      <td class="mono">${fmt(p.price)}</td>
      <td class="mono">${fmt(p.price-p.cost)}</td>
      <td><button class="icon-btn" data-act="edit" data-id="${p.id}">ແກ້ໄຂ</button><button class="icon-btn danger" data-act="del" data-id="${p.id}">ລຶບ</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-act="edit"]').forEach(b=>b.addEventListener('click', ()=>openProductModal(b.dataset.id)));
  tbody.querySelectorAll('[data-act="del"]').forEach(b=>b.addEventListener('click', async ()=>{
    if(!confirm('ລຶບສິນຄ້ານີ້ອອກຈາກສາງ?')) return;
    const { error } = await sb.from('products').delete().eq('id', b.dataset.id);
    if(error){ alert('ລຶບບໍ່ສຳເລັດ: '+error.message); return; }
    products = products.filter(p=>p.id!==b.dataset.id);
    renderStock();
  }));

  const totalValue = products.reduce((s,p)=>s+p.qty*p.cost,0);
  const lowCount = products.filter(p=>p.qty<=p.low_threshold).length;
  document.getElementById('stockStats').innerHTML = `
    <div class="stat"><div class="label">ຈຳນວນສິນຄ້າທັງໝົດ</div><div class="val">${products.length}</div></div>
    <div class="stat"><div class="label">ມູນຄ່າສາງ (ຕົ້ນທຶນ)</div><div class="val mono">${fmt(totalValue)}</div></div>
    <div class="stat alert"><div class="label">ສິນຄ້າໃກ້ໝົດ</div><div class="val">${lowCount}</div></div>
  `;
}
document.getElementById('stockSearch').addEventListener('input', renderStock);
document.getElementById('addProductBtn').addEventListener('click', ()=>openProductModal(null));

async function uploadProductImage(file){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${uid()}.${ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
  if(error) throw error;
  const { data } = sb.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
document.getElementById('pmImageFile').addEventListener('change', e=>{
  const file = e.target.files[0];
  const preview = document.getElementById('pmImagePreview');
  if(file){ preview.src = URL.createObjectURL(file); preview.style.display='block'; }
});

function populateCatSelect(){
  document.getElementById('pmCategory').innerHTML = APP_CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
}
function openProductModal(id){
  populateCatSelect();
  const p = id ? products.find(x=>x.id===id) : null;
  document.getElementById('productModalTitle').textContent = p ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າ';
  document.getElementById('pmId').value = p ? p.id : '';
  document.getElementById('pmName').value = p ? p.name : '';
  document.getElementById('pmCategory').value = p ? p.category : APP_CATEGORIES[0];
  document.getElementById('pmUnit').value = p ? p.unit : 'ອັນ';
  document.getElementById('pmCost').value = p ? p.cost : '';
  document.getElementById('pmPrice').value = p ? p.price : '';
  document.getElementById('pmQty').value = p ? p.qty : '';
  document.getElementById('pmLow').value = p ? p.low_threshold : '';
  document.getElementById('pmBarcode').value = p ? (p.barcode||'') : '';
  document.getElementById('pmImageFile').value = '';
  document.getElementById('pmId').dataset.existingImage = p ? (p.image_url||'') : '';
  const preview = document.getElementById('pmImagePreview');
  if(p && p.image_url){ preview.src = p.image_url; preview.style.display='block'; }
  else { preview.src=''; preview.style.display='none'; }
  document.getElementById('productModalBg').classList.add('open');
}
document.getElementById('pmCancel').addEventListener('click', ()=>document.getElementById('productModalBg').classList.remove('open'));
document.getElementById('pmSave').addEventListener('click', async ()=>{
  const name = document.getElementById('pmName').value.trim();
  if(!name){ alert('ກະລຸນາໃສ່ຊື່ສິນຄ້າ'); return; }
  const id = document.getElementById('pmId').value;
  const btn = document.getElementById('pmSave');
  btn.disabled = true;
  try{
    let imageUrl = document.getElementById('pmId').dataset.existingImage || null;
    const file = document.getElementById('pmImageFile').files[0];
    if(file){
      btn.textContent = 'ກຳລັງອັບໂຫລດຮູບ…';
      imageUrl = await uploadProductImage(file);
    }
    const data = {
      name,
      category: document.getElementById('pmCategory').value,
      unit: document.getElementById('pmUnit').value,
      cost: parseFloat(document.getElementById('pmCost').value)||0,
      price: parseFloat(document.getElementById('pmPrice').value)||0,
      qty: parseFloat(document.getElementById('pmQty').value)||0,
      low_threshold: parseFloat(document.getElementById('pmLow').value)||0,
      barcode: document.getElementById('pmBarcode').value.trim() || null,
      image_url: imageUrl,
    };
    if(id){
      const { data: updated, error } = await sb.from('products').update(data).eq('id', id).select().single();
      if(error) throw error;
      Object.assign(products.find(x=>x.id===id), updated);
    } else {
      const { data: inserted, error } = await sb.from('products').insert(data).select().single();
      if(error) throw error;
      products.push(inserted);
    }
    document.getElementById('productModalBg').classList.remove('open');
    renderStock();
  }catch(err){
    alert('ບັນທຶກບໍ່ສຳເລັດ: ' + err.message);
  }finally{
    btn.disabled = false;
    btn.textContent = 'ບັນທຶກ';
  }
});

/* ---------- Excel template + import ---------- */
const TEMPLATE_HEADERS = ['ຊື່ສິນຄ້າ','ໜ່ວຍ (ອັນ/ກິໂລ/ແມັດ/ຖົງ)','ຕົ້ນທຶນ/ໜ່ວຍ','ລາຄາຂາຍ/ໜ່ວຍ','ຈຳນວນຄົງເຫຼືອ','ເຕືອນເມື່ອເຫຼືອຕ່ຳກວ່າ','ບາໂຄດ (ຖ້າມີ)'];

document.getElementById('downloadTemplateBtn').addEventListener('click', ()=>{
  const wb = XLSX.utils.book_new();
  APP_CATEGORIES.forEach(cat=>{
    const existing = products.filter(p=>p.category===cat).map(p=>[p.name,p.unit,p.cost,p.price,p.qty,p.low_threshold,p.barcode||'']);
    const sample = existing.length ? existing : [['ຕົວຢ່າງ: ນ້ຳປາ ແກ້ວ','ອັນ',8000,12000,20,5,'']];
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...sample]);
    ws['!cols'] = [{wch:26},{wch:16},{wch:14},{wch:14},{wch:14},{wch:16},{wch:14}];
    const safeName = cat.replace(/[\\\/\?\*\[\]]/g,'').slice(0,31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  XLSX.writeFile(wb, `hankaew-template-${new Date().toISOString().slice(0,10)}.xlsx`);
});

document.getElementById('importExcelBtn').addEventListener('click', ()=>document.getElementById('importExcelFile').click());
document.getElementById('importExcelFile').addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = async evt => {
    try{
      const wb = XLSX.read(evt.target.result, {type:'array'});
      const toInsert = [], toUpdate = [];
      const newCats = [];
      wb.SheetNames.forEach(sheetName=>{
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1, defval:''});
        if(!rows.length) return;
        const cat = sheetName.trim();
        if(!APP_CATEGORIES.includes(cat) && !newCats.includes(cat)) newCats.push(cat);
        rows.forEach((row, idx)=>{
          if(idx===0) return;
          const [name, unit, cost, price, qty, low, barcode] = row;
          const nm = (name||'').toString().trim();
          if(!nm || nm.startsWith('ຕົວຢ່າງ')) return;
          const data = {
            name: nm, category: cat,
            unit: (unit||'ອັນ').toString().trim() || 'ອັນ',
            cost: parseFloat(cost)||0, price: parseFloat(price)||0,
            qty: parseFloat(qty)||0, low_threshold: parseFloat(low)||0,
            barcode: (barcode||'').toString().trim() || null,
          };
          const existing = products.find(p=>p.name===nm && p.category===cat);
          if(existing){ toUpdate.push({ id: existing.id, ...data }); }
          else { toInsert.push(data); }
        });
      });

      // ສ້າງໝວດໃໝ່ໃນ Supabase ຖ້າມີ
      for(const cat of newCats){
        await sb.from('categories').insert({ name: cat });
      }
      if(newCats.length){ await loadCategories(); }

      if(toInsert.length){
        const { error } = await sb.from('products').insert(toInsert);
        if(error) throw error;
      }
      for(const u of toUpdate){
        const { id, ...fields } = u;
        const { error } = await sb.from('products').update(fields).eq('id', id);
        if(error) throw error;
      }

      await loadProducts();
      renderStockCats(); renderStock();
      alert(`ນຳເຂົ້າສຳເລັດ — ເພີ່ມໃໝ່ ${toInsert.length} ລາຍການ, ອັບເດດ ${toUpdate.length} ລາຍການ`);
    }catch(err){
      alert('ນຳເຂົ້າບໍ່ສຳເລັດ: ' + err.message);
    }
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
});

initApp('stock', async ()=>{
  loadProductsFromCache();
  renderStockCats();
  renderStock();
  await loadProducts();
  renderStock(); // refresh with latest stock once network data arrives
});
