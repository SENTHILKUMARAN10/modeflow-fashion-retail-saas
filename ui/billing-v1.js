// ModeFlow paid-access UI + region/currency preferences.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud,qs=s=>document.querySelector(s);
  const prices={INR:{monthly:'₹399',annual:'₹3,990'},USD:{monthly:'$4.99',annual:'$49.99'}};
  const regions={IN:'India',US:'United States',GB:'United Kingdom',AE:'United Arab Emirates',SG:'Singapore',AU:'Australia',CA:'Canada'};
  let workspace=null,checking=false;
  const toastMsg=m=>typeof toast==='function'?toast(m):alert(m);
  const loadRazorpay=()=>new Promise((resolve,reject)=>{if(window.Razorpay)return resolve();const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  const session=async()=>{const {data}=await cloud.auth.session();return data?.session||null;};
  const regionOptions=Object.entries(regions).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  function ensureUI(){
    if(!qs('#mfPaywall')){
      document.body.insertAdjacentHTML('beforeend',`<div id="mfPaywall" class="mf-paywall hidden" aria-live="polite"><div class="mf-paywall-card"><div class="mf-paywall-head"><div><small>MODEFLOW PRO</small><h2>Choose your plan to continue</h2><p>Billing, inventory, customers, analytics and cloud sync unlock after successful payment.</p></div></div><div class="mf-billing-controls"><select id="mfRegion" aria-label="Region">${regionOptions}</select><select id="mfCurrency" aria-label="Currency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></div><div class="mf-plan-grid"><article class="mf-plan featured"><small>MONTHLY</small><strong id="mfMonthlyPrice">₹399</strong><span>per month</span><button class="btn primary" data-mf-pay="monthly">Pay monthly</button></article><article class="mf-plan"><small>ANNUAL · SAVE</small><strong id="mfAnnualPrice">₹3,990</strong><span>per year</span><button class="btn" data-mf-pay="annual">Pay annually</button></article></div><div id="mfBillingStatus" class="mf-paywall-note">Secure payments powered by Razorpay.</div></div></div>`);
      qs('#mfRegion').onchange=()=>{const region=qs('#mfRegion').value;qs('#mfCurrency').value=region==='IN'?'INR':'USD';renderPrices();};
      qs('#mfCurrency').onchange=renderPrices;
      document.querySelectorAll('[data-mf-pay]').forEach(b=>b.onclick=()=>startPayment(b.dataset.mfPay,b));
    }
    if(!qs('#mfSettingsDialog')){
      document.body.insertAdjacentHTML('beforeend',`<dialog id="mfSettingsDialog" class="mf-settings-dialog"><div class="mf-settings-inner"><h3>Region & currency</h3><div class="mf-settings-grid"><label>Region<select id="mfSettingsRegion">${regionOptions}</select></label><label>Business currency<select id="mfSettingsCurrency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></label></div><div class="mf-settings-actions"><button class="btn" id="mfSettingsCancel">Cancel</button><button class="btn primary" id="mfSettingsSave">Save</button></div></div></dialog>`);
      qs('#mfSettingsCancel').onclick=()=>qs('#mfSettingsDialog').close();
      qs('#mfSettingsSave').onclick=saveSettings;
    }
    const footer=qs('.side-footer');
    if(footer&&!qs('#mfSettingsButton')){const b=document.createElement('button');b.id='mfSettingsButton';b.className='mf-settings-btn';b.textContent='Region & currency';b.onclick=openSettings;footer.appendChild(b);}
  }
  function renderPrices(){const c=qs('#mfCurrency')?.value||'INR';if(qs('#mfMonthlyPrice'))qs('#mfMonthlyPrice').textContent=prices[c].monthly;if(qs('#mfAnnualPrice'))qs('#mfAnnualPrice').textContent=prices[c].annual;}
  async function subscription(){if(!workspace?.id)return null;const {data,error}=await cloud.client.from('business_subscriptions').select('*').eq('business_id',workspace.id).maybeSingle();if(error)throw error;return data;}
  const active=s=>!!s&&['active','authenticated'].includes(s.status)&&(!s.current_period_end||new Date(s.current_period_end)>new Date());
  async function check(){if(checking||!workspace?.id)return;checking=true;ensureUI();try{const s=await subscription();const wall=qs('#mfPaywall');if(active(s)){wall.classList.add('hidden');document.body.classList.remove('mf-payment-required');}else{qs('#mfRegion').value=workspace.business?.region||'IN';qs('#mfCurrency').value=workspace.business?.currency||((workspace.business?.region||'IN')==='IN'?'INR':'USD');renderPrices();wall.classList.remove('hidden');document.body.classList.add('mf-payment-required');}}catch(err){console.warn('Billing check failed',err);}finally{checking=false;}}
  async function startPayment(interval,button){if(!workspace?.id)return;const currency=qs('#mfCurrency').value,region=qs('#mfRegion').value;button.disabled=true;const old=button.textContent;button.innerHTML='<span class="mf-spinner"></span> Preparing…';try{await saveBusinessPreference(region,currency);const s=await session();if(!s)throw new Error('Please sign in again');const r=await fetch('/api/billing/create-subscription',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${s.access_token}`},body:JSON.stringify({businessId:workspace.id,interval,currency})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Unable to start payment');await loadRazorpay();const rz=new Razorpay({key:data.keyId,subscription_id:data.subscriptionId,name:'ModeFlow',description:`ModeFlow ${interval} plan`,prefill:{email:s.user?.email||''},theme:{color:'#4f46e5'},handler:async response=>{qs('#mfBillingStatus').textContent='Verifying payment…';const vr=await fetch('/api/billing/verify-payment',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${s.access_token}`},body:JSON.stringify({businessId:workspace.id,...response})});const out=await vr.json();if(!vr.ok)return toastMsg(out.error||'Payment verification failed');toastMsg('Payment successful. ModeFlow is unlocked.');setTimeout(()=>location.reload(),700);}});rz.open();}catch(err){toastMsg(err.message||'Payment could not be started');}finally{button.disabled=false;button.textContent=old;}}
  async function saveBusinessPreference(region,currency){if(!workspace?.id)return;const {error}=await cloud.client.from('businesses').update({region,currency}).eq('id',workspace.id);if(error)throw error;workspace.business.region=region;workspace.business.currency=currency;window.ModeFlowCurrency=currency;}
  function openSettings(){if(!workspace)return;qs('#mfSettingsRegion').value=workspace.business?.region||'IN';qs('#mfSettingsCurrency').value=workspace.business?.currency||'INR';qs('#mfSettingsDialog').showModal();}
  async function saveSettings(){try{await saveBusinessPreference(qs('#mfSettingsRegion').value,qs('#mfSettingsCurrency').value);qs('#mfSettingsDialog').close();toastMsg('Region and currency updated');if(typeof renderAll==='function')renderAll();}catch(err){toastMsg(err.message||'Could not update settings');}}
  function setWorkspace(detail){workspace=detail;window.ModeFlowCurrency=detail?.business?.currency||'INR';check();}
  addEventListener('modeflow:workspace',e=>setWorkspace(e.detail));
  ensureUI();if(window.ModeFlowBusiness)setWorkspace(window.ModeFlowBusiness);
})();
