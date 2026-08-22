// ================================================================
// exchange.js — ໜ້າແລກປ່ຽນເງິນຕາ
// ================================================================
let direction = 'lak_to_thb'; // ຫຼື 'thb_to_lak'

function setDirection(d){
  direction = d;
  document.getElementById('dirLakToThb').classList.toggle('active', d==='lak_to_thb');
  document.getElementById('dirThbToLak').classList.toggle('active', d==='thb_to_lak');
  if(d==='lak_to_thb'){
    document.getElementById('exInLabel').textContent = 'ລູກຄ້າເອົາມາ (ກີບ)';
    document.getElementById('exOutLabel').textContent = 'ຈ່າຍໃຫ້ລູກຄ້າ (ບາດ)';
  } else {
    document.getElementById('exInLabel').textContent = 'ລູກຄ້າເອົາມາ (ບາດ)';
    document.getElementById('exOutLabel').textContent = 'ຈ່າຍໃຫ້ລູກຄ້າ (ກີບ)';
  }
  document.getElementById('exAmountIn').value = '';
  document.getElementById('exAmountOut').value = '';
  updateRateNote();
}
document.getElementById('dirLakToThb').addEventListener('click', ()=>setDirection('lak_to_thb'));
document.getElementById('dirThbToLak').addEventListener('click', ()=>setDirection('thb_to_lak'));

function updateRateNote(){
  const rBuy = Number(APP_SETTINGS.rate_buy_thb)||0;
  const rSell = Number(APP_SETTINGS.rate_sell_thb)||0;
  document.getElementById('exRateNote').textContent = direction==='lak_to_thb'
    ? `ອັດຕາຂາຍບາດ: 1 ບາດ = ${rSell.toLocaleString('en-US')} ກີບ`
    : `ອັດຕາຊື້ບາດ: 1 ບາດ = ${rBuy.toLocaleString('en-US')} ກີບ`;
}

function calcOutput(){
  const amountIn = parseFloat(document.getElementById('exAmountIn').value) || 0;
  const rBuy = Number(APP_SETTINGS.rate_buy_thb)||0;
  const rSell = Number(APP_SETTINGS.rate_sell_thb)||0;
  let out = 0;
  if(direction==='lak_to_thb'){ out = rSell>0 ? amountIn / rSell : 0; }
  else { out = amountIn * rBuy; }
  document.getElementById('exAmountOut').value = direction==='lak_to_thb'
    ? out.toFixed(2) + ' ບາດ'
    : fmt(out);
  return { amountIn, out };
}
document.getElementById('exAmountIn').addEventListener('input', calcOutput);

document.getElementById('exSaveBtn').addEventListener('click', async ()=>{
  const { amountIn, out } = calcOutput();
  if(amountIn<=0){ alert('ກະລຸນາໃສ່ຈຳນວນເງິນ'); return; }
  const rate = direction==='lak_to_thb' ? Number(APP_SETTINGS.rate_sell_thb) : Number(APP_SETTINGS.rate_buy_thb);
  const record = direction==='lak_to_thb'
    ? { direction, amount_in: amountIn, currency_in: 'LAK', amount_out: +out.toFixed(2), currency_out: 'THB', rate }
    : { direction, amount_in: amountIn, currency_in: 'THB', amount_out: +out.toFixed(0), currency_out: 'LAK', rate };

  const btn = document.getElementById('exSaveBtn');
  btn.disabled = true;
  try{
    const { error } = await sb.from('currency_exchanges').insert(record);
    if(error) throw error;
    document.getElementById('exAmountIn').value = '';
    document.getElementById('exAmountOut').value = '';
    await renderHistory();
    alert('ບັນທຶກສຳເລັດ');
  }catch(err){
    alert('ບັນທຶກບໍ່ສຳເລັດ: ' + err.message);
  }finally{
    btn.disabled = false;
  }
});

async function renderHistory(){
  const cutoff = new Date(Date.now() - 30*86400000).toISOString();
  const { data, error } = await sb.from('currency_exchanges').select('*').gte('created_at', cutoff).order('created_at', {ascending:false});
  if(error){ alert('ໂຫຼດປະຫວັດບໍ່ໄດ້: ' + error.message); return; }

  const tbody = document.getElementById('exTbody');
  tbody.innerHTML = '';
  data.slice(0,50).forEach(r=>{
    const tr = document.createElement('tr');
    const dirLabel = r.direction==='lak_to_thb' ? 'ກີບ→ບາດ' : 'ບາດ→ກີບ';
    const inStr = r.currency_in==='LAK' ? fmt(r.amount_in) : r.amount_in.toLocaleString('en-US')+' ບາດ';
    const outStr = r.currency_out==='LAK' ? fmt(r.amount_out) : r.amount_out.toLocaleString('en-US')+' ບາດ';
    tr.innerHTML = `<td>${new Date(r.created_at).toLocaleString('lo-LA',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
      <td>${dirLabel}</td><td class="mono">${inStr}</td><td class="mono">${outStr}</td><td class="mono">${r.rate.toLocaleString('en-US')}</td>`;
    tbody.appendChild(tr);
  });
  if(data.length===0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">ຍັງບໍ່ມີການແລກປ່ຽນ</td></tr>';

  const lakIn = data.filter(r=>r.currency_in==='LAK').reduce((s,r)=>s+Number(r.amount_in),0);
  const thbOut = data.filter(r=>r.currency_out==='THB').reduce((s,r)=>s+Number(r.amount_out),0);
  const thbIn = data.filter(r=>r.currency_in==='THB').reduce((s,r)=>s+Number(r.amount_in),0);
  const lakOut = data.filter(r=>r.currency_out==='LAK').reduce((s,r)=>s+Number(r.amount_out),0);

  document.getElementById('exStats').innerHTML = `
    <div class="stat"><div class="label">ຮັບກີບເຂົ້າ (ຂາຍບາດ)</div><div class="val mono">${fmt(lakIn)}</div></div>
    <div class="stat"><div class="label">ຈ່າຍບາດອອກ</div><div class="val mono">${thbOut.toLocaleString('en-US')} ບາດ</div></div>
    <div class="stat"><div class="label">ຮັບບາດເຂົ້າ (ຊື້ບາດ)</div><div class="val mono">${thbIn.toLocaleString('en-US')} ບາດ</div></div>
    <div class="stat"><div class="label">ຈ່າຍກີບອອກ</div><div class="val mono">${fmt(lakOut)}</div></div>
  `;
}

initApp('exchange', async ()=>{
  setDirection('lak_to_thb');
  await renderHistory();
});
