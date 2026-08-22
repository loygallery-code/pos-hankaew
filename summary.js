// ================================================================
// summary.js — ໜ້າສະຫຼຸບບັນຊີ (ລາຍເດືອນ / ລາຍປີ)
// ================================================================
const MONTH_NAMES = ['ມັງກອນ','ກຸມພາ','ມີນາ','ເມສາ','ພຶດສະພາ','ມິຖຸນາ','ກໍລະກົດ','ສິງຫາ','ກັນຍາ','ຕຸລາ','ພະຈິກ','ທັນວາ'];

function populateSelectors(){
  const now = new Date();
  const monthSel = document.getElementById('sumMonth');
  monthSel.innerHTML = MONTH_NAMES.map((m,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${m}</option>`).join('');
  const yearSel = document.getElementById('sumYear');
  const thisYear = now.getFullYear();
  let years = '';
  for(let y=thisYear; y>=thisYear-4; y--){ years += `<option value="${y}" ${y===thisYear?'selected':''}>${y}</option>`; }
  yearSel.innerHTML = years;
}
function updateModeUI(){
  document.getElementById('sumMonth').style.display = document.getElementById('sumMode').value==='month' ? 'inline-block' : 'none';
}
document.getElementById('sumMode').addEventListener('change', ()=>{ updateModeUI(); renderSummary(); });
document.getElementById('sumMonth').addEventListener('change', renderSummary);
document.getElementById('sumYear').addEventListener('change', renderSummary);

function getPeriodRange(){
  const mode = document.getElementById('sumMode').value;
  const year = parseInt(document.getElementById('sumYear').value, 10);
  if(mode==='month'){
    const month = parseInt(document.getElementById('sumMonth').value, 10);
    const start = new Date(year, month-1, 1);
    const end = new Date(year, month, 1);
    return { start: start.toISOString(), end: end.toISOString(), label: `${MONTH_NAMES[month-1]} ${year}` };
  } else {
    const start = new Date(year, 0, 1);
    const end = new Date(year+1, 0, 1);
    return { start: start.toISOString(), end: end.toISOString(), label: `ປີ ${year}` };
  }
}

async function renderSummary(){
  const { start, end, label } = getPeriodRange();

  const { data: sales, error: salesErr } = await sb.from('sales').select('*, sale_items(*)').gte('created_at', start).lt('created_at', end);
  if(salesErr){ alert('ໂຫຼດຂໍ້ມູນບໍ່ໄດ້: ' + salesErr.message); return; }

  const totalRevenue = sales.reduce((s,x)=>s+Number(x.total),0);
  const totalCost = sales.reduce((s,x)=>s+Number(x.total_cost),0);
  const totalProfit = sales.reduce((s,x)=>s+Number(x.profit),0);
  const creditCount = sales.filter(s=>s.is_credit).length;

  document.getElementById('sumTotals').innerHTML = `
    <div class="stat"><div class="label">ຍອດຂາຍ</div><div class="val mono">${fmt(totalRevenue)}</div></div>
    <div class="stat"><div class="label">ຕົ້ນທຶນ</div><div class="val mono">${fmt(totalCost)}</div></div>
    <div class="stat profit"><div class="label">ກຳໄລສຸດທິ</div><div class="val mono">${fmt(totalProfit)}</div></div>
    <div class="stat"><div class="label">ຈຳນວນບິນ</div><div class="val">${sales.length}</div></div>
    <div class="stat alert"><div class="label">ບິນຕິດໜີ້ໃນຊ່ວງນີ້</div><div class="val">${creditCount}</div></div>
  `;

  // ສະຫຼຸບຕາມໝວດ
  const catTally = {};
  sales.forEach(s => (s.sale_items||[]).forEach(it=>{
    const cat = it.category || 'ອື່ນໆ';
    catTally[cat] = catTally[cat] || { revenue:0, cost:0 };
    catTally[cat].revenue += Number(it.qty)*Number(it.price);
    catTally[cat].cost += Number(it.qty)*Number(it.cost);
  }));
  const catRows = Object.entries(catTally).sort((a,b)=>b[1].revenue-a[1].revenue);
  const catTbody = document.getElementById('sumCatTbody');
  catTbody.innerHTML = catRows.length ? '' : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">ບໍ່ມີຂໍ້ມູນ</td></tr>';
  catRows.forEach(([cat,d])=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${cat}</td><td class="mono">${fmt(d.revenue)}</td><td class="mono">${fmt(d.cost)}</td><td class="mono">${fmt(d.revenue-d.cost)}</td>`;
    catTbody.appendChild(tr);
  });

  // ສະຫຼຸບແລກປ່ຽນເງິນຕາ
  const { data: fx, error: fxErr } = await sb.from('currency_exchanges').select('*').gte('created_at', start).lt('created_at', end);
  if(!fxErr && fx){
    const lakIn = fx.filter(r=>r.currency_in==='LAK').reduce((s,r)=>s+Number(r.amount_in),0);
    const thbOut = fx.filter(r=>r.currency_out==='THB').reduce((s,r)=>s+Number(r.amount_out),0);
    const thbIn = fx.filter(r=>r.currency_in==='THB').reduce((s,r)=>s+Number(r.amount_in),0);
    const lakOut = fx.filter(r=>r.currency_out==='LAK').reduce((s,r)=>s+Number(r.amount_out),0);
    document.getElementById('sumFxStats').innerHTML = `
      <div class="stat"><div class="label">ຮັບກີບ (ຂາຍບາດ)</div><div class="val mono">${fmt(lakIn)}</div></div>
      <div class="stat"><div class="label">ຈ່າຍບາດອອກ</div><div class="val mono">${thbOut.toLocaleString('en-US')} ບາດ</div></div>
      <div class="stat"><div class="label">ຮັບບາດ (ຊື້ບາດ)</div><div class="val mono">${thbIn.toLocaleString('en-US')} ບາດ</div></div>
      <div class="stat"><div class="label">ຈ່າຍກີບອອກ</div><div class="val mono">${fmt(lakOut)}</div></div>
    `;
  }

  // ໜີ້ຕ້ອງຮັບ
  const [{ data: allCredit }, { data: allPayments }] = await Promise.all([
    sb.from('sales').select('total, created_at').eq('is_credit', true),
    sb.from('debt_payments').select('amount, created_at'),
  ]);
  const totalOutstandingNow = (allCredit||[]).reduce((s,x)=>s+Number(x.total),0) - (allPayments||[]).reduce((s,x)=>s+Number(x.amount),0);
  const newDebtInPeriod = sales.filter(s=>s.is_credit).reduce((s,x)=>s+Number(x.total),0);
  const { data: paymentsInPeriod } = await sb.from('debt_payments').select('amount').gte('created_at', start).lt('created_at', end);
  const paidInPeriod = (paymentsInPeriod||[]).reduce((s,x)=>s+Number(x.amount),0);

  document.getElementById('sumDebtStats').innerHTML = `
    <div class="stat alert"><div class="label">ໜີ້ຄົງເຫຼືອທັງໝົດ (ປັດຈຸບັນ)</div><div class="val mono">${fmt(totalOutstandingNow)}</div></div>
    <div class="stat"><div class="label">ໜີ້ໃໝ່ໃນຊ່ວງນີ້</div><div class="val mono">${fmt(newDebtInPeriod)}</div></div>
    <div class="stat"><div class="label">ຮັບຊຳລະໜີ້ໃນຊ່ວງນີ້</div><div class="val mono">${fmt(paidInPeriod)}</div></div>
  `;

  lastSummary = { label, totalRevenue, totalCost, totalProfit, saleCount: sales.length, creditCount, catRows, totalOutstandingNow, newDebtInPeriod, paidInPeriod };
}

let lastSummary = null;
document.getElementById('printSummaryBtn').addEventListener('click', ()=>{
  if(!lastSummary) return;
  const s = lastSummary;
  const rows = s.catRows.map(([cat,d]) => [cat, fmt(d.revenue), fmt(d.cost), fmt(d.revenue-d.cost)]);
  const extra = `<div class="rp-stats">
    <div><strong>ຍອດຂາຍ:</strong> ${fmt(s.totalRevenue)}</div>
    <div><strong>ຕົ້ນທຶນ:</strong> ${fmt(s.totalCost)}</div>
    <div><strong>ກຳໄລສຸດທິ:</strong> ${fmt(s.totalProfit)}</div>
    <div><strong>ຈຳນວນບິນ:</strong> ${s.saleCount}</div>
    <div><strong>ບິນຕິດໜີ້:</strong> ${s.creditCount}</div>
    <div><strong>ໜີ້ຄົງເຫຼືອທັງໝົດ:</strong> ${fmt(s.totalOutstandingNow)}</div>
    <div><strong>ໜີ້ໃໝ່ໃນຊ່ວງນີ້:</strong> ${fmt(s.newDebtInPeriod)}</div>
    <div><strong>ຮັບຊຳລະໜີ້ໃນຊ່ວງນີ້:</strong> ${fmt(s.paidInPeriod)}</div>
  </div>`;
  printReportTable(`ສະຫຼຸບບັນຊີ — ${s.label}`, ['ໝວດ','ຍອດຂາຍ','ຕົ້ນທຶນ','ກຳໄລ'], rows, extra);
});

initApp('summary', async ()=>{
  populateSelectors();
  updateModeUI();
  await renderSummary();
});
