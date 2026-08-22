// ================================================================
// reports.js — ໜ້າລາຍງານ
// ================================================================
async function renderReports(){
  const range = document.getElementById('reportRange').value;
  const now = new Date();
  let cutoffIso = null;
  if(range==='today'){ const t = new Date(); t.setHours(0,0,0,0); cutoffIso = t.toISOString(); }
  else if(range==='week'){ cutoffIso = new Date(now.getTime()-7*86400000).toISOString(); }
  else if(range==='month'){ cutoffIso = new Date(now.getTime()-30*86400000).toISOString(); }

  let query = sb.from('sales').select('*, sale_items(*)').order('created_at', {ascending:false});
  if(cutoffIso) query = query.gte('created_at', cutoffIso);
  const { data: sales, error } = await query;
  if(error){ alert('ໂຫຼດລາຍງານບໍ່ໄດ້: ' + error.message); return; }

  const totalRevenue = sales.reduce((s,x)=>s+Number(x.total),0);
  const totalCost = sales.reduce((s,x)=>s+Number(x.total_cost),0);
  const totalProfit = sales.reduce((s,x)=>s+Number(x.profit),0);
  const thbSales = sales.filter(s=>s.paid_currency==='THB');
  const thbReceivedTotal = thbSales.reduce((s,x)=>s+Number(x.cash_foreign||0),0);
  const thbLakEquivTotal = thbSales.reduce((s,x)=>s+Number(x.total),0);

  document.getElementById('reportStats').innerHTML = `
    <div class="stat"><div class="label">ຍອດຂາຍ (ທຽບເທົ່າກີບ)</div><div class="val mono">${fmt(totalRevenue)}</div></div>
    <div class="stat"><div class="label">ຕົ້ນທຶນ</div><div class="val mono">${fmt(totalCost)}</div></div>
    <div class="stat profit"><div class="label">ກຳໄລສຸດທິ</div><div class="val mono">${fmt(totalProfit)}</div></div>
    <div class="stat"><div class="label">ຈຳນວນບິນ</div><div class="val">${sales.length}</div></div>
    <div class="stat"><div class="label">ບິນທີ່ຮັບເປັນເງິນບາດ</div><div class="val">${thbSales.length} ບິນ</div></div>
    <div class="stat"><div class="label">ຍອດຮັບເປັນບາດ (ຈາກລູກຄ້າ)</div><div class="val mono">${thbReceivedTotal.toLocaleString('en-US')} ບາດ<br><span style="font-size:11px;font-weight:400;color:var(--ink-soft);">= ${fmt(thbLakEquivTotal)}</span></div></div>
  `;

  lastReportSales = sales;
  lastReportRangeLabel = document.getElementById('reportRange').selectedOptions[0].textContent;

  const tbody = document.getElementById('salesTbody');
  tbody.innerHTML = '';
  sales.slice(0,50).forEach(s=>{
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    const itemCount = (s.sale_items||[]).length;
    const payCell = s.paid_currency==='THB'
      ? `<span class="pill" style="background:#FDE8D0;color:var(--marigold-dark);">${Number(s.cash_foreign||0).toLocaleString('en-US')} ບາດ</span>`
      : `<span class="pill">ກີບ</span>`;
    tr.innerHTML = `<td>${new Date(s.created_at).toLocaleString('lo-LA',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
      <td>${itemCount} ລາຍການ</td><td>${payCell}</td><td class="mono">${fmt(s.total)}</td><td class="mono">${fmt(s.profit)}</td>`;
    tr.addEventListener('click', ()=>openSaleDetail(s));
    tbody.appendChild(tr);
  });
  if(sales.length===0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງນີ້</td></tr>';

  const tally = {};
  sales.forEach(s => (s.sale_items||[]).forEach(it=>{
    tally[it.name] = tally[it.name] || {qty:0, revenue:0};
    tally[it.name].qty += Number(it.qty);
    tally[it.name].revenue += Number(it.qty)*Number(it.price);
  }));
  const ranked = Object.entries(tally).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,8);
  const maxRev = ranked.length ? ranked[0][1].revenue : 1;
  const best = document.getElementById('bestSellers');
  best.innerHTML = ranked.length ? '' : '<div class="empty-note">ບໍ່ມີຂໍ້ມູນ</div>';
  ranked.forEach(([name,d])=>{
    const bar = document.createElement('div');
    bar.style.marginBottom = '10px';
    bar.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
        <span>${name}</span><span class="mono">${fmt(d.revenue)}</span>
      </div>
      <div style="background:var(--paper-2);border-radius:6px;height:8px;overflow:hidden;">
        <div style="background:var(--marigold);height:100%;width:${(d.revenue/maxRev*100).toFixed(0)}%;"></div>
      </div>`;
    best.appendChild(bar);
  });
}
document.getElementById('reportRange').addEventListener('change', renderReports);

function openSaleDetail(s){
  const d = new Date(s.created_at);
  const rows = (s.sale_items||[]).map(it => `
    <div class="cart-row">
      <div style="flex:1;">
        <div class="ci-name">${it.name}</div>
        <div class="ci-sub">${it.qty} ${it.unit} × ${fmt(it.price)}</div>
      </div>
      <div class="ci-total mono">${fmt(it.qty*it.price)}</div>
    </div>`).join('');
  let payLine = '';
  if(s.paid_currency==='THB' && s.cash_foreign){
    payLine = `<div class="rf-row"><span>ຮັບເງິນ</span><span>${Number(s.cash_foreign).toLocaleString('en-US')} ບາດ (ອັດຕາ ${s.fx_rate_used?Number(s.fx_rate_used).toLocaleString('en-US'):'-'})</span></div>`;
  } else if(s.cash_received){
    payLine = `<div class="rf-row"><span>ຮັບເງິນ</span><span>${fmt(s.cash_received)}</span></div>`;
  }
  document.getElementById('sdTime').textContent = d.toLocaleString('lo-LA');
  document.getElementById('sdItems').innerHTML = rows || '<div class="empty-note">ບໍ່ມີລາຍການ</div>';
  document.getElementById('sdTotal').textContent = fmt(s.total);
  document.getElementById('sdCost').textContent = fmt(s.total_cost);
  document.getElementById('sdProfit').textContent = fmt(s.profit);
  document.getElementById('sdPayLine').innerHTML = payLine;
  document.getElementById('saleDetailModalBg').classList.add('open');
}
document.getElementById('sdClose').addEventListener('click', ()=>document.getElementById('saleDetailModalBg').classList.remove('open'));
document.getElementById('saleDetailModalBg').addEventListener('click', e=>{
  if(e.target.id==='saleDetailModalBg') document.getElementById('saleDetailModalBg').classList.remove('open');
});

let lastReportSales = [];
let lastReportRangeLabel = '';
document.getElementById('printReportBtn').addEventListener('click', ()=>{
  const rows = lastReportSales.slice(0,200).map(s => [
    new Date(s.created_at).toLocaleString('lo-LA',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),
    (s.sale_items||[]).length + ' ລາຍການ',
    s.is_credit ? 'ຕິດໜີ້' : (s.paid_currency==='THB' ? `${Number(s.cash_foreign||0).toLocaleString('en-US')} ບາດ` : 'ກີບ'),
    fmt(s.total), fmt(s.profit)
  ]);
  const totalRevenue = lastReportSales.reduce((s,x)=>s+Number(x.total),0);
  const totalProfit = lastReportSales.reduce((s,x)=>s+Number(x.profit),0);
  const extra = `<div class="rp-stats"><div><strong>ຍອດຂາຍ:</strong> ${fmt(totalRevenue)}</div><div><strong>ກຳໄລ:</strong> ${fmt(totalProfit)}</div><div><strong>ຈຳນວນບິນ:</strong> ${lastReportSales.length}</div></div>`;
  printReportTable(`ລາຍງານການຂາຍ — ${lastReportRangeLabel}`, ['ເວລາ','ລາຍການ','ຊຳລະ','ລວມ','ກຳໄລ'], rows, extra);
});

initApp('reports', renderReports);
