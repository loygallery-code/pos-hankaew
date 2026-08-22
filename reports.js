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

  document.getElementById('reportStats').innerHTML = `
    <div class="stat"><div class="label">ຍອດຂາຍ</div><div class="val mono">${fmt(totalRevenue)}</div></div>
    <div class="stat"><div class="label">ຕົ້ນທຶນ</div><div class="val mono">${fmt(totalCost)}</div></div>
    <div class="stat profit"><div class="label">ກຳໄລສຸດທິ</div><div class="val mono">${fmt(totalProfit)}</div></div>
    <div class="stat"><div class="label">ຈຳນວນບິນ</div><div class="val">${sales.length}</div></div>
  `;

  const tbody = document.getElementById('salesTbody');
  tbody.innerHTML = '';
  sales.slice(0,50).forEach(s=>{
    const tr = document.createElement('tr');
    const itemCount = (s.sale_items||[]).length;
    tr.innerHTML = `<td>${new Date(s.created_at).toLocaleString('lo-LA',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
      <td>${itemCount} ລາຍການ</td><td class="mono">${fmt(s.total)}</td><td class="mono">${fmt(s.profit)}</td>`;
    tbody.appendChild(tr);
  });
  if(sales.length===0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງນີ້</td></tr>';

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

initApp('reports', renderReports);
