// ================================================================
// debtors.js — ໜ້າຈັດການລູກໜີ້
// ================================================================
let debtors = [];
let creditSales = [];
let payments = [];

async function loadDebtData(){
  const [{ data: d, error: dErr }, { data: s, error: sErr }, { data: p, error: pErr }] = await Promise.all([
    sb.from('debtors').select('*').order('created_at'),
    sb.from('sales').select('*, sale_items(*)').eq('is_credit', true),
    sb.from('debt_payments').select('*'),
  ]);
  if(dErr){ alert('ໂຫຼດລູກໜີ້ບໍ່ໄດ້: ' + dErr.message); return; }
  debtors = d || [];
  creditSales = s || [];
  payments = p || [];
}

function debtorBalance(debtorId){
  const owed = creditSales.filter(s=>s.debtor_id===debtorId).reduce((sum,s)=>sum+Number(s.total),0);
  const paid = payments.filter(p=>p.debtor_id===debtorId).reduce((sum,p)=>sum+Number(p.amount),0);
  return owed - paid;
}

function renderDebtors(){
  const q = (document.getElementById('debtorSearch').value||'').trim().toLowerCase();
  const tbody = document.getElementById('debtorsTbody');
  tbody.innerHTML = '';
  let totalOutstanding = 0;
  const list = debtors.filter(d=>d.name.toLowerCase().includes(q));
  list.forEach(d=>{
    const balance = debtorBalance(d.id);
    totalOutstanding += balance;
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `<td><strong>${d.name}</strong></td><td>${d.phone||'-'}</td>
      <td class="mono" style="${balance>0?'color:var(--brick);font-weight:700;':''}">${fmt(balance)}</td>
      <td><button class="icon-btn" data-id="${d.id}">ລາຍລະອຽດ</button></td>`;
    tr.querySelector('button').addEventListener('click', e=>{ e.stopPropagation(); openDebtorDetail(d.id); });
    tr.addEventListener('click', ()=>openDebtorDetail(d.id));
    tbody.appendChild(tr);
  });
  if(list.length===0) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">${debtors.length===0?'ຍັງບໍ່ມີລູກໜີ້':'ບໍ່ພົບລູກໜີ້'}</td></tr>`;

  // ສະຖິຕິລວມໃຊ້ຄ່າຈາກ debtors ທັງໝົດ (ບໍ່ຖືກກັ່ນຕອງໂດຍການຄົ້ນຫາ)
  const debtorsWithBalance = debtors.filter(d=>debtorBalance(d.id) > 0).length;
  const allTotalOutstanding = debtors.reduce((s,d)=>s+debtorBalance(d.id),0);
  document.getElementById('debtorStats').innerHTML = `
    <div class="stat alert"><div class="label">ໜີ້ຄົງເຫຼືອທັງໝົດ</div><div class="val mono">${fmt(allTotalOutstanding)}</div></div>
    <div class="stat"><div class="label">ຈຳນວນລູກໜີ້ຄ້າງຢູ່</div><div class="val">${debtorsWithBalance}</div></div>
    <div class="stat"><div class="label">ຈຳນວນລູກໜີ້ທັງໝົດ</div><div class="val">${debtors.length}</div></div>
  `;
}
document.getElementById('debtorSearch').addEventListener('input', renderDebtors);

document.getElementById('printDebtorsBtn').addEventListener('click', ()=>{
  const rows = debtors.map(d => [d.name, d.phone||'-', fmt(debtorBalance(d.id))]);
  const total = debtors.reduce((s,d)=>s+debtorBalance(d.id),0);
  const extra = `<div class="rp-stats"><div><strong>ໜີ້ຄົງເຫຼືອທັງໝົດ:</strong> ${fmt(total)}</div><div><strong>ຈຳນວນລູກໜີ້:</strong> ${debtors.length}</div></div>`;
  printReportTable('ລາຍງານລູກໜີ້', ['ຊື່ລູກໜີ້','ເບີໂທ','ໜີ້ຄົງເຫຼືອ'], rows, extra);
});

document.getElementById('addDebtorBtn').addEventListener('click', ()=>{
  document.getElementById('dmName').value=''; document.getElementById('dmPhone').value=''; document.getElementById('dmNotes').value='';
  document.getElementById('debtorModalBg').classList.add('open');
});
document.getElementById('dmCancel').addEventListener('click', ()=>document.getElementById('debtorModalBg').classList.remove('open'));
document.getElementById('dmSave').addEventListener('click', async ()=>{
  const name = document.getElementById('dmName').value.trim();
  if(!name){ alert('ກະລຸນາໃສ່ຊື່'); return; }
  const { error } = await sb.from('debtors').insert({
    name, phone: document.getElementById('dmPhone').value.trim()||null, notes: document.getElementById('dmNotes').value.trim()||null
  });
  if(error){ alert('ບັນທຶກບໍ່ສຳເລັດ: '+error.message); return; }
  document.getElementById('debtorModalBg').classList.remove('open');
  await loadDebtData();
  renderDebtors();
});

let currentDebtorId = null;
function openDebtorDetail(id){
  currentDebtorId = id;
  const d = debtors.find(x=>x.id===id);
  document.getElementById('ddName').textContent = d.name;
  document.getElementById('ddTotalOwed').textContent = fmt(debtorBalance(id));
  document.getElementById('ddSaleCount').textContent = creditSales.filter(s=>s.debtor_id===id).length;
  document.getElementById('ddPaymentAmount').value='';

  const events = [
    ...creditSales.filter(s=>s.debtor_id===id).map(s=>({ ts: s.created_at, label: 'ຕິດໜີ້ (ຊື້ເຄື່ອງ)', amount: Number(s.total), sign: 1, sale: s })),
    ...payments.filter(p=>p.debtor_id===id).map(p=>({ ts: p.created_at, label: 'ຮັບຊຳລະ', amount: Number(p.amount), sign: -1, sale: null })),
  ].sort((a,b)=> new Date(b.ts) - new Date(a.ts));

  const hist = document.getElementById('ddHistory');
  hist.innerHTML = events.length ? '' : '<div class="empty-note">ຍັງບໍ່ມີປະຫວັດ</div>';
  events.forEach(ev=>{
    const row = document.createElement('div');
    row.className = 'cart-row';
    if(ev.sale) row.style.cursor = 'pointer';
    row.innerHTML = `<div style="flex:1;">
        <div class="ci-name">${ev.label}${ev.sale?' <span style="font-size:10px;color:var(--marigold-dark);">(ກົດເບິ່ງສິນຄ້າ)</span>':''}</div>
        <div class="ci-sub">${new Date(ev.ts).toLocaleString('lo-LA',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div class="ci-total mono" style="color:${ev.sign>0?'var(--brick)':'var(--canopy-dark)'}">${ev.sign>0?'+':'−'}${fmt(ev.amount)}</div>`;
    if(ev.sale) row.addEventListener('click', ()=>openCreditItems(ev.sale));
    hist.appendChild(row);
  });
  document.getElementById('debtorDetailModalBg').classList.add('open');
}

function openCreditItems(sale){
  document.getElementById('ciTime').textContent = new Date(sale.created_at).toLocaleString('lo-LA');
  const items = sale.sale_items || [];
  document.getElementById('ciItems').innerHTML = items.length ? items.map(it => `
    <div class="cart-row">
      <div style="flex:1;">
        <div class="ci-name">${it.name}</div>
        <div class="ci-sub">${it.qty} ${it.unit} × ${fmt(it.price)}</div>
      </div>
      <div class="ci-total mono">${fmt(it.qty*it.price)}</div>
    </div>`).join('') : '<div class="empty-note">ບໍ່ມີລາຍການ</div>';
  document.getElementById('ciTotal').textContent = fmt(sale.total);
  document.getElementById('creditItemsModalBg').classList.add('open');
}
document.getElementById('ciClose').addEventListener('click', ()=>document.getElementById('creditItemsModalBg').classList.remove('open'));
document.getElementById('ddClose').addEventListener('click', ()=>document.getElementById('debtorDetailModalBg').classList.remove('open'));
document.getElementById('ddSavePayment').addEventListener('click', async ()=>{
  const amount = parseFloat(document.getElementById('ddPaymentAmount').value)||0;
  if(amount<=0){ alert('ກະລຸນາໃສ່ຈຳນວນເງິນ'); return; }
  const btn = document.getElementById('ddSavePayment');
  btn.disabled = true;
  try{
    const { error } = await sb.from('debt_payments').insert({ debtor_id: currentDebtorId, amount });
    if(error) throw error;
    await loadDebtData();
    renderDebtors();
    openDebtorDetail(currentDebtorId);
  }catch(err){
    alert('ບັນທຶກບໍ່ສຳເລັດ: ' + err.message);
  }finally{
    btn.disabled = false;
  }
});

initApp('debtors', async ()=>{
  await loadDebtData();
  renderDebtors();
});
