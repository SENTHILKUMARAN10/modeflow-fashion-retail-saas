(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const regions={IN:'India',US:'United States',GB:'United Kingdom',AE:'United Arab Emirates',SG:'Singapore',AU:'Australia',CA:'Canada'};
  const prices={INR:{monthly:'₹399',annual:'₹3,990'},USD:{monthly:'$4.99',annual:'$49.99'}};
  const currencySymbol=c=>c==='USD'?'$':'₹';
  const state={
    region:localStorage.getItem('mf_region')||'IN',
    currency:localStorage.getItem('mf_currency')||'INR',
    interval:localStorage.getItem('mf_plan_interval')||'monthly'
  };
  const nav=document.querySelector('.sidebar nav');
  if(!nav)return;

  function addNav(view,num,label){
    if(document.querySelector(`.nav[data-view="${view}"]`))return;
    const b=document.createElement('button');b.className='nav';b.dataset.view=view;b.innerHTML=`<i>${num}</i><span>${label}</span>`;nav.appendChild(b);
    b.addEventListener('click',()=>go(view));
  }
  addNav('subscription','08','Subscription');
  addNav('region','09','Region & currency');

  const main=document.querySelector('.app main');
  if(!main)return;
  if(!$('#subscription')) main.insertAdjacentHTML('beforeend',`<section id="subscription" class="view"><div class="page-intro"><div><p class="kicker">MODEFLOW PRO</p><h3>Simple pricing, built to <em>grow with you.</em></h3><p class="mf-section-copy">Choose monthly or annual billing. Payment gateway activation will be connected later; this page is ready now.</p></div><span class="mf-coming">Gateway coming soon</span></div><div class="mf-account-grid"><article class="mf-account-card featured"><p class="kicker light">PRO PLAN</p><h3>Everything your business needs.</h3><div class="mf-plan-switch"><button data-interval="monthly">Monthly</button><button data-interval="annual">Annual</button></div><div class="mf-plan-price" id="mfPlanPrice">₹399 <span>/ month</span></div><ul class="mf-feature-list"><li>Billing and sales management</li><li>Inventory and stock alerts</li><li>Customer records</li><li>Expenses and profit visibility</li><li>Analytics and cloud workspace</li><li>Responsive access on mobile, tablet and desktop</li></ul><div class="mf-billing-note">Payments are not required yet. When Razorpay is connected, this button will become the secure checkout.</div><div class="mf-account-actions"><button class="btn secondary" id="mfPayLater">Payment gateway coming soon</button></div></article><article class="mf-account-card"><p class="kicker">BILLING DETAILS</p><h3>Your current setup</h3><div class="mf-region-preview"><span>Region</span><strong id="mfBillingRegion">India</strong></div><div class="mf-region-preview"><span>Currency</span><strong id="mfBillingCurrency">INR · ₹</strong></div><div class="mf-region-preview"><span>Status</span><span class="mf-settings-status">Free access while gateway is pending</span></div><div class="mf-account-actions"><button class="btn primary" id="mfOpenRegion">Change region & currency</button></div></article></div></section>`);

  if(!$('#region')) main.insertAdjacentHTML('beforeend',`<section id="region" class="view"><div class="page-intro"><div><p class="kicker">PREFERENCES</p><h3>Your region. Your <em>currency.</em></h3><p>Choose how ModeFlow should display pricing and business values. You can change this anytime.</p></div></div><div class="mf-account-grid"><article class="mf-account-card"><div class="mf-region-form"><label>Business region<select id="mfRegionSelect">${Object.entries(regions).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>Display currency<select id="mfCurrencySelect"><option value="INR">INR — Indian Rupee ₹</option><option value="USD">USD — US Dollar $</option></select></label><div class="mf-region-preview"><div><small>PREVIEW</small><strong id="mfCurrencyPreview">₹399</strong></div><span id="mfRegionPreview">India · INR</span></div><div class="mf-account-actions"><button class="btn primary" id="mfSaveRegion">Save preferences</button></div></div></article><article class="mf-account-card"><p class="kicker">HOW IT WORKS</p><h3>Consistent across every screen.</h3><p class="mf-section-copy">Your selected region and currency are saved on this device. Once cloud preference sync is enabled, the same selection can follow your business account everywhere.</p><div class="mf-region-preview"><span>Monthly plan</span><strong id="mfMonthlyMini">₹399</strong></div><div class="mf-region-preview"><span>Annual plan</span><strong id="mfAnnualMini">₹3,990</strong></div></article></div></section>`);

  function go(id){
    $$('.view').forEach(v=>v.classList.toggle('active-view',v.id===id));
    $$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
    const titles={subscription:['ACCOUNT','Subscription & pricing'],region:['PREFERENCES','Region & currency']};
    if(titles[id]){if($('#eyebrow'))$('#eyebrow').textContent=titles[id][0];if($('#title'))$('#title').textContent=titles[id][1];}
    if(window.innerWidth<820)window.scrollTo({top:0,behavior:'smooth'});
  }
  function render(){
    const p=prices[state.currency];
    const annual=state.interval==='annual';
    $$('.mf-plan-switch button').forEach(b=>b.classList.toggle('active',b.dataset.interval===state.interval));
    if($('#mfPlanPrice'))$('#mfPlanPrice').innerHTML=`${annual?p.annual:p.monthly} <span>/ ${annual?'year':'month'}</span>`;
    if($('#mfBillingRegion'))$('#mfBillingRegion').textContent=regions[state.region]||'India';
    if($('#mfBillingCurrency'))$('#mfBillingCurrency').textContent=`${state.currency} · ${currencySymbol(state.currency)}`;
    if($('#mfRegionSelect'))$('#mfRegionSelect').value=state.region;
    if($('#mfCurrencySelect'))$('#mfCurrencySelect').value=state.currency;
    if($('#mfCurrencyPreview'))$('#mfCurrencyPreview').textContent=p.monthly;
    if($('#mfRegionPreview'))$('#mfRegionPreview').textContent=`${regions[state.region]} · ${state.currency}`;
    if($('#mfMonthlyMini'))$('#mfMonthlyMini').textContent=p.monthly;
    if($('#mfAnnualMini'))$('#mfAnnualMini').textContent=p.annual;
  }
  $$('.mf-plan-switch button').forEach(b=>b.onclick=()=>{state.interval=b.dataset.interval;localStorage.setItem('mf_plan_interval',state.interval);render();});
  $('#mfOpenRegion')?.addEventListener('click',()=>go('region'));
  $('#mfPayLater')?.addEventListener('click',()=>typeof toast==='function'?toast('Payment gateway will be connected later.'):alert('Payment gateway will be connected later.'));
  $('#mfRegionSelect')?.addEventListener('change',e=>{state.region=e.target.value;if(state.region==='IN')state.currency='INR';else if(state.currency==='INR')state.currency='USD';render();});
  $('#mfCurrencySelect')?.addEventListener('change',e=>{state.currency=e.target.value;render();});
  $('#mfSaveRegion')?.addEventListener('click',()=>{state.region=$('#mfRegionSelect').value;state.currency=$('#mfCurrencySelect').value;localStorage.setItem('mf_region',state.region);localStorage.setItem('mf_currency',state.currency);window.ModeFlowCurrency=state.currency;render();if(typeof toast==='function')toast('Region and currency saved');});
  render();
})();
