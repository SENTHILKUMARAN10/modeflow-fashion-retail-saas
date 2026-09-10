// SalesDesk professional business suite: actionable health, quick workflows,
// business profile management and owner audit history. Uses existing secure RLS.
(function(){
  'use strict';
  if(window.SalesDeskBusinessSuite)return;window.SalesDeskBusinessSuite=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let workspace=null,profile=null,userFirstName='';
  const money=n=>{const v=Number(n||0),c=window.ModeFlowCurrency||'INR';return c==='USD'?'$'+v.toLocaleString('en-US',{maximumFractionDigits:0}):'₹'+v.toLocaleString('en-IN',{maximumFractionDigits:0});};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const data=()=>{try{return typeof store!=='undefined'?store:{products:[],invoices:[],expenses:[]};}catch{return{products:[],invoices:[],expenses:[]};}};
  const notice=m=>typeof toast==='function'?toast(m):alert(m);
  const footerRefresh=()=>{window.SalesDeskFooters?.refresh?.();window.VeloraFooters?.refresh?.();};

  function go(view){if(typeof window.gotoView==='function')window.gotoView(view);else{$$('.view').forEach(v=>v.classList.toggle('active-view',v.id===view));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===view));}if(view==='business-settings')loadProfile();if(view==='activity-log')loadActivity();if(view==='dashboard')updateGreeting();setTimeout(footerRefresh,0);}
  function addNav(view,num,label){const nav=$('.sidebar nav');if(!nav||$(`.nav[data-view="${view}"]`))return;const b=document.createElement('button');b.className='nav';b.dataset.view=view;b.innerHTML=`<i>${num}</i><span>${label}</span>`;b.onclick=()=>go(view);nav.appendChild(b);}

  function mountQuickActions(){
    const dash=$('#dashboard'),intro=dash?.querySelector('.page-intro');if(!dash||!intro||dash.querySelector('.sd-quick-strip'))return;
    intro.insertAdjacentHTML('afterend',`<div class="sd-quick-strip"><button class="sd-quick primary" data-sd-go="billing"><span>Quick action</span><strong>New sale →</strong></button><button class="sd-quick" data-sd-add-product><span>Catalogue</span><strong>Add product</strong></button><button class="sd-quick" data-sd-expense><span>Operations</span><strong>Record expense</strong></button><button class="sd-quick" data-sd-go="reports"><span>Decision support</span><strong>Business health</strong></button></div>`);
    dash.querySelectorAll('[data-sd-go]').forEach(b=>b.onclick=()=>go(b.dataset.sdGo));
    dash.querySelector('[data-sd-add-product]').onclick=()=>{go('inventory');setTimeout(()=>$('#addProduct')?.click(),0);};
    dash.querySelector('[data-sd-expense]').onclick=()=>{go('expenses');setTimeout(()=>$('#expenseCategory')?.focus(),0);};
  }

  function healthModel(){
    const s=data(),invoices=s.invoices||[],products=s.products||[],expenses=s.expenses||[];
    const revenue=invoices.reduce((a,i)=>a+Number(i.total||0),0);
    const cogs=invoices.reduce((a,i)=>a+Number(i.cost||0)*Number(i.qty||0),0);
    const exp=expenses.reduce((a,e)=>a+Number(e.amount||0),0);
    const profit=revenue-cogs-exp;
    const openRows=invoices.filter(i=>i.paymentStatus&&i.paymentStatus!=='paid');
    const openValue=openRows.reduce((a,i)=>a+Number(i.total||0),0);
    const low=products.filter(p=>Number(p.stock)<900&&Number(p.stock)<=Number(p.reorder||0));
    const byProduct={};invoices.forEach(i=>{const k=i.product||'Item';byProduct[k]=(byProduct[k]||0)+Number(i.total||0);});
    const byCustomer={};invoices.forEach(i=>{const k=i.customer||'Walk-in customer';byCustomer[k]=(byCustomer[k]||0)+Number(i.total||0);});
    const productsRank=Object.entries(byProduct).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const customersRank=Object.entries(byCustomer).sort((a,b)=>b[1]-a[1]).slice(0,4);
    return{revenue,cogs,exp,profit,openRows,openValue,low,productsRank,customersRank,margin:revenue?profit/revenue*100:0,expenseRatio:revenue?exp/revenue*100:0};
  }
  function insights(h){
    const list=[];
    if(h.low.length)list.push(['!',`Restock ${h.low.length} item${h.low.length===1?'':'s'}`,`${h.low.slice(0,3).map(x=>x.name).join(', ')}${h.low.length>3?' and more':''}`]);else list.push(['✓','Stock levels look healthy','No tracked product is currently below its reorder level.']);
    if(h.openRows.length)list.push(['₹',`Follow up on ${h.openRows.length} open invoice${h.openRows.length===1?'':'s'}`,`${money(h.openValue)} is attached to unpaid or partial sales.`]);else list.push(['✓','No open invoices','All recorded transactions are currently marked paid.']);
    if(h.revenue>0&&h.expenseRatio>45)list.push(['↗','Review operating costs',`Expenses are ${h.expenseRatio.toFixed(0)}% of recorded sales.`]);else if(h.revenue>0)list.push(['↗','Operating cost ratio',`${h.expenseRatio.toFixed(0)}% of recorded sales is currently logged as operating expense.`]);
    if(h.productsRank[0])list.push(['★',`${h.productsRank[0][0]} leads sales`,`${money(h.productsRank[0][1])} in recorded revenue.`]);
    return list;
  }
  function rankMarkup(items,type){return items.length?items.map(([name,value],i)=>`<div class="sd-rank"><span>${i+1}</span><div><b>${esc(name)}</b><small>${type}</small></div><strong>${money(value)}</strong></div>`).join(''):'<div class="sd-empty">More sales data will build this ranking.</div>';}

  function mountHealth(){
    const reports=$('#reports');if(!reports||reports.querySelector('#sdBusinessHealth'))return;
    reports.insertAdjacentHTML('beforeend',`<section class="sd-health" id="sdBusinessHealth"><div class="sd-health-head"><div><p class="kicker">BUSINESS HEALTH</p><h3>Turn your numbers into next actions.</h3></div><p>SalesDesk continuously turns the business records already in your workspace into practical signals.</p></div><div class="sd-health-grid"><article class="sd-health-stat"><span>Estimated net result</span><strong id="sdHealthProfit">—</strong><small>Sales minus item costs and recorded expenses</small></article><article class="sd-health-stat"><span>Open invoice value</span><strong id="sdHealthOpen">—</strong><small>Transactions marked unpaid or partial</small></article><article class="sd-health-stat"><span>Net margin</span><strong id="sdHealthMargin">—</strong><small>Estimated from available cost data</small></article><article class="sd-health-stat"><span>Needs restocking</span><strong id="sdHealthStock">—</strong><small>Products at or below reorder level</small></article></div><div class="sd-health-body"><div class="sd-health-column"><h4>What needs your attention</h4><div class="sd-insight-list" id="sdInsights"></div></div><div class="sd-health-column"><h4>Top products & services</h4><div class="sd-ranking" id="sdTopProducts"></div><h4 style="margin-top:24px">Top customers</h4><div class="sd-ranking" id="sdTopCustomers"></div></div></div></section>`);
  }
  function updateHealth(){
    mountQuickActions();mountHealth();const h=healthModel();
    if($('#sdHealthProfit'))$('#sdHealthProfit').textContent=money(h.profit);
    if($('#sdHealthOpen'))$('#sdHealthOpen').textContent=money(h.openValue);
    if($('#sdHealthMargin'))$('#sdHealthMargin').textContent=(Number.isFinite(h.margin)?h.margin:0).toFixed(1)+'%';
    if($('#sdHealthStock'))$('#sdHealthStock').textContent=String(h.low.length);
    if($('#sdInsights'))$('#sdInsights').innerHTML=insights(h).map(x=>`<div class="sd-insight"><i>${esc(x[0])}</i><div><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div></div>`).join('');
    if($('#sdTopProducts'))$('#sdTopProducts').innerHTML=rankMarkup(h.productsRank,'Recorded revenue');
    if($('#sdTopCustomers'))$('#sdTopCustomers').innerHTML=rankMarkup(h.customersRank,'Lifetime recorded value');
    updateHistorySummary(h);
  }

  function mountHistorySummary(){const history=$('#history'),panel=history?.querySelector('.table-panel');if(!history||!panel||history.querySelector('.sd-history-summary'))return;panel.insertAdjacentHTML('beforebegin',`<div class="sd-history-summary"><article class="sd-mini-stat"><span>Open invoices</span><strong id="sdOpenCount">0</strong><small>Unpaid or partial</small></article><article class="sd-mini-stat"><span>Open invoice value</span><strong id="sdOpenValue">₹0</strong><small>Follow-up opportunity</small></article><article class="sd-mini-stat"><span>Recorded sales</span><strong id="sdRecordedSales">₹0</strong><small>Across visible history</small></article></div>`);}
  function updateHistorySummary(h=healthModel()){mountHistorySummary();if($('#sdOpenCount'))$('#sdOpenCount').textContent=String(h.openRows.length);if($('#sdOpenValue'))$('#sdOpenValue').textContent=money(h.openValue);if($('#sdRecordedSales'))$('#sdRecordedSales').textContent=money(h.revenue);}

  function mountSettings(){
    addNav('business-settings','10','Business settings');addNav('activity-log','11','Activity log');
    const main=$('#app main');if(!main)return;
    if(!$('#business-settings'))main.insertAdjacentHTML('beforeend',`<section id="business-settings" class="view"><div class="page-intro"><div><p class="kicker">BUSINESS SETTINGS</p><h3>Make SalesDesk feel like <em>your business.</em></h3><p>Keep the details used across the workspace accurate. Owner access is required to save changes.</p></div></div><div class="sd-settings-shell"><article class="sd-settings-card"><p class="kicker">BUSINESS PROFILE</p><h3>Company information</h3><p>These details identify the active workspace and can be reused on invoices and reports.</p><form id="sdBusinessForm" class="sd-form"><label>Business name<input id="sdBusinessName" maxlength="120" required></label><label>Business phone<input id="sdBusinessPhone" maxlength="30" inputmode="tel"></label><label class="full">Address<textarea id="sdBusinessAddress" maxlength="500"></textarea></label><label>Currency<select id="sdBusinessCurrency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></label><label>Region<input id="sdBusinessRegion" maxlength="12" placeholder="IN"></label><label class="sd-advanced">Business email<input id="sdBusinessEmail" type="email" maxlength="200"></label><label class="sd-advanced">Tax / registration ID<input id="sdBusinessTax" maxlength="80"></label><label class="sd-advanced">Timezone<input id="sdBusinessTimezone" maxlength="80" placeholder="Asia/Kolkata"></label><label class="sd-advanced">Invoice prefix<input id="sdInvoicePrefix" maxlength="10" placeholder="SD"></label><div class="sd-settings-actions full"><button class="btn primary" type="submit">Save business profile</button><span id="sdBusinessSaveStatus" class="sd-muted"></span></div></form></article><aside class="sd-settings-card"><p class="kicker">WORKSPACE SECURITY</p><h3>Production controls</h3><p>SalesDesk keeps tenant data behind authenticated workspace membership and role-based database rules.</p><div class="sd-security-list"><div class="sd-security-row"><span>Current role</span><b id="sdRole">—</b></div><div class="sd-security-row"><span>Cloud connection</span><b class="sd-good">Authenticated</b></div><div class="sd-security-row"><span>Realtime</span><b class="sd-good">Enabled</b></div><div class="sd-security-row"><span>Audit history</span><b class="sd-good">Owner protected</b></div><div class="sd-security-row"><span>Business isolation</span><b class="sd-good">RLS enforced</b></div></div><div class="sd-owner-note">Changes to business profile information are written directly to your protected SalesDesk workspace. Other businesses cannot update this workspace through the browser client.</div></aside></div></section>`);
    if(!$('#activity-log'))main.insertAdjacentHTML('beforeend',`<section id="activity-log" class="view"><div class="page-intro"><div><p class="kicker">AUDIT HISTORY</p><h3>Know what changed, <em>and when.</em></h3><p>Owner-only activity history for sensitive business records.</p></div><button class="btn secondary" id="sdRefreshActivity">Refresh</button></div><div class="sd-activity-tools"><input id="sdActivitySearch" class="search-input" placeholder="Search action or record type"></div><article class="panel table-panel"><div class="table-wrap"><table class="sd-activity-table"><thead><tr><th>ACTION</th><th>RECORD</th><th>ACTOR</th><th>DATE & TIME</th></tr></thead><tbody id="sdActivityRows"><tr><td colspan="4">Open this page to load activity.</td></tr></tbody></table></div></article></section>`);
    $('#sdBusinessForm')?.addEventListener('submit',saveProfile);$('#sdRefreshActivity')?.addEventListener('click',loadActivity);$('#sdActivitySearch')?.addEventListener('input',renderActivityFilter);
    $$('.nav[data-view="business-settings"],.nav[data-view="activity-log"]').forEach(b=>b.onclick=()=>go(b.dataset.view));
    footerRefresh();
  }

  async function loadProfile(){
    if(!workspace?.id||!window.tkCloud?.client)return;const c=window.tkCloud.client;let advanced=true;
    let result=await c.from('businesses').select('id,name,phone,address,currency,region,email,tax_id,timezone,invoice_prefix').eq('id',workspace.id).single();
    if(result.error){advanced=false;result=await c.from('businesses').select('id,name,phone,address,currency,region').eq('id',workspace.id).single();}
    if(result.error){notice(result.error.message||'Unable to load business profile');return;}profile=result.data;
    $('#sdBusinessName').value=profile.name||'';$('#sdBusinessPhone').value=profile.phone||'';$('#sdBusinessAddress').value=profile.address||'';$('#sdBusinessCurrency').value=profile.currency||'INR';$('#sdBusinessRegion').value=profile.region||'IN';
    $$('.sd-advanced').forEach(x=>x.hidden=!advanced);if(advanced){$('#sdBusinessEmail').value=profile.email||'';$('#sdBusinessTax').value=profile.tax_id||'';$('#sdBusinessTimezone').value=profile.timezone||'Asia/Kolkata';$('#sdInvoicePrefix').value=profile.invoice_prefix||'SD';}
    if($('#sdRole'))$('#sdRole').textContent=(workspace.role||'member').replace(/^./,c=>c.toUpperCase());updateGreeting();
  }
  async function saveProfile(e){
    e.preventDefault();if(!workspace?.id||!window.tkCloud?.client)return;if(workspace.role!=='owner')return notice('Only the business owner can update company settings.');
    const btn=e.currentTarget.querySelector('button[type="submit"]'),status=$('#sdBusinessSaveStatus');btn.disabled=true;if(status)status.textContent='Saving…';
    const base={name:$('#sdBusinessName').value.trim(),phone:$('#sdBusinessPhone').value.trim()||null,address:$('#sdBusinessAddress').value.trim()||null,currency:$('#sdBusinessCurrency').value,region:$('#sdBusinessRegion').value.trim().toUpperCase()||'IN'};
    if(!base.name||base.name.length<2){btn.disabled=false;return notice('Enter a valid business name.');}
    const advancedVisible=!$('.sd-advanced')?.hidden;const payload={...base};if(advancedVisible){Object.assign(payload,{email:$('#sdBusinessEmail').value.trim()||null,tax_id:$('#sdBusinessTax').value.trim()||null,timezone:$('#sdBusinessTimezone').value.trim()||'Asia/Kolkata',invoice_prefix:($('#sdInvoicePrefix').value.trim()||'SD').toUpperCase()});}
    try{const {data:updated,error}=await window.tkCloud.client.from('businesses').update(payload).eq('id',workspace.id).select().single();if(error)throw error;profile=updated;workspace.business={...workspace.business,...updated};window.ModeFlowBusiness=workspace;window.ModeFlowCurrency=updated.currency||window.ModeFlowCurrency;const card=$('.store-card div b');if(card)card.textContent=updated.name;window.dispatchEvent(new CustomEvent('modeflow:workspace',{detail:workspace}));if(status)status.textContent='Saved';notice('Business profile updated');updateGreeting();}catch(error){if(status)status.textContent='Not saved';notice(error.message||'Unable to save business settings');window.SalesDeskReportError?.(error.message,error.stack,'business-settings');}finally{btn.disabled=false;}
  }

  let activityRows=[];
  async function loadActivity(){
    const body=$('#sdActivityRows');if(!body||!workspace?.id)return;if(workspace.role!=='owner'){body.innerHTML='<tr><td colspan="4">Activity history is available to the business owner only.</td></tr>';return;}body.innerHTML='<tr><td colspan="4">Loading secure audit history…</td></tr>';
    try{activityRows=await window.tkCloud.audit.list(workspace.id)||[];renderActivityFilter();}catch(error){body.innerHTML=`<tr><td colspan="4">${esc(error.message||'Unable to load activity history')}</td></tr>`;}
  }
  function renderActivityFilter(){const body=$('#sdActivityRows');if(!body)return;const q=($('#sdActivitySearch')?.value||'').toLowerCase();const rows=activityRows.filter(r=>(`${r.action} ${r.entity_type} ${r.entity_id||''}`).toLowerCase().includes(q));body.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.action)}</td><td><span class="sd-activity-entity">${esc(String(r.entity_type||'record').replaceAll('_',' '))}</span><div class="muted" style="margin-top:5px;font-size:9px">${esc(r.entity_id||'')}</div></td><td>${esc((r.actor_user_id||'system').slice(0,8))}…</td><td>${esc(new Date(r.created_at).toLocaleString())}</td></tr>`).join(''):'<tr><td colspan="4">No matching audit activity.</td></tr>';}

  async function resolveUser(){try{const {data:u}=await window.tkCloud?.auth?.user?.();const raw=u?.user?.user_metadata?.full_name||u?.user?.user_metadata?.name||u?.user?.email?.split('@')[0]||'';userFirstName=String(raw).trim().split(/\s+/)[0]||'';}catch{}updateGreeting();}
  function timezone(){if(profile?.timezone)return profile.timezone;const region=profile?.region||localStorage.getItem('mf_region')||'IN';return({IN:'Asia/Kolkata',US:'America/New_York',GB:'Europe/London',AE:'Asia/Dubai',SG:'Asia/Singapore',AU:'Australia/Sydney',CA:'America/Toronto'})[region]||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}
  function updateGreeting(){const dash=$('#dashboard');if(!dash?.classList.contains('active-view'))return;let hour=new Date().getHours();try{hour=Number(new Intl.DateTimeFormat('en-US',{hour:'2-digit',hourCycle:'h23',timeZone:timezone()}).format(new Date()));}catch{}const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';if($('#title'))$('#title').textContent=`${greeting}${userFirstName?', '+userFirstName:''}.`;}

  function wrapRender(){try{if(typeof window.renderAll==='function'&&!window.renderAll.__salesdeskSuite){const original=window.renderAll;const wrapped=function(){const out=original.apply(this,arguments);queueMicrotask(()=>{updateHealth();updateGreeting();});return out;};wrapped.__salesdeskSuite=true;window.renderAll=wrapped;}}catch{}}
  function bind(){mountQuickActions();mountHistorySummary();mountSettings();mountHealth();wrapRender();updateHealth();resolveUser();document.addEventListener('click',e=>{const nav=e.target.closest?.('.nav[data-view]');if(nav&&nav.dataset.view==='dashboard')setTimeout(updateGreeting,0);if(nav&&nav.dataset.view==='reports')setTimeout(updateHealth,0);},true);setInterval(updateGreeting,60000);}
  addEventListener('modeflow:workspace',e=>{workspace=e.detail;profile=e.detail?.business||profile;resolveUser();loadProfile();updateHealth();});
  if(window.ModeFlowBusiness){workspace=window.ModeFlowBusiness;profile=workspace.business;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();