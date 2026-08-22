// ================================================================
// settings.js — ໜ້າຕັ້ງຄ່າ
// ================================================================
function fillSettingsForm(){
  document.getElementById('setShopName').value = APP_SETTINGS.shop_name;
  document.getElementById('setPin').value = '';
  renderCatList();
}
function renderCatList(){
  const wrap = document.getElementById('catList');
  wrap.innerHTML = '';
  APP_CATEGORIES.forEach(c=>{
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.cssText = 'display:flex;align-items:center;gap:6px;';
    chip.innerHTML = `${c} <button style="border:none;background:none;color:var(--brick);cursor:pointer;font-weight:700;">✕</button>`;
    chip.querySelector('button').addEventListener('click', async ()=>{
      const { count } = await sb.from('products').select('id', {count:'exact', head:true}).eq('category', c);
      if(count>0){ alert('ຍັງມີສິນຄ້າໃນໝວດນີ້ຢູ່, ບໍ່ສາມາດລຶບໄດ້'); return; }
      const { error } = await sb.from('categories').delete().eq('name', c);
      if(error){ alert('ລຶບບໍ່ສຳເລັດ: '+error.message); return; }
      await loadCategories();
      renderCatList();
    });
    wrap.appendChild(chip);
  });
}
document.getElementById('addCatBtn').addEventListener('click', async ()=>{
  const v = document.getElementById('newCatInput').value.trim();
  if(!v) return;
  if(APP_CATEGORIES.includes(v)){ document.getElementById('newCatInput').value=''; return; }
  const { error } = await sb.from('categories').insert({ name: v });
  if(error){ alert('ເພີ່ມບໍ່ສຳເລັດ: '+error.message); return; }
  await loadCategories();
  document.getElementById('newCatInput').value = '';
  renderCatList();
});
document.getElementById('saveSettingsBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('setShopName').value.trim();
  const pin = document.getElementById('setPin').value.trim();
  const updates = {};
  if(name) updates.shop_name = name;
  if(pin){
    if(!/^\d{4}$/.test(pin)){ alert('PIN ຕ້ອງເປັນໂຕເລກ 4 ໂຕ'); return; }
    updates.pin = pin;
  }
  if(Object.keys(updates).length===0) return;
  const { error } = await sb.from('app_settings').update(updates).eq('id', 1);
  if(error){ alert('ບັນທຶກບໍ່ສຳເລັດ: '+error.message); return; }
  Object.assign(APP_SETTINGS, updates);
  document.getElementById('shopNameLbl').textContent = APP_SETTINGS.shop_name;
  alert('ບັນທຶກສຳເລັດ');
});

initApp('settings', fillSettingsForm);
