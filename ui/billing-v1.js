// ModeFlow pricing preview + region/currency preferences. Payments stay optional until gateway launch.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud,qs=s=>document.querySelector(s);
  const prices={INR:{monthly:'₹399',annual:'₹3,990'},USD:{monthly:'$4.99',annual:'$49.99'}};
  const regions={IN:'India',US:'United States',GB:'United Kingdom',AE:'United Arab Emirates',SG:'Singapore',AU:'Australia',CA:'Canada'};
  let workspace=null;
  const toastMsg=m=>typeof toast==='function'?toast(m):alert(m);
  const regionOptions=Object.entries(regions).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  const localRegion=()=>localStorage.getItem('modeflow-region')||'IN';

  function ensureUI(){
    if(!qs('#mfPaywall')){
      document.body.insertAdjacentHTML('beforeend',`<div id="mfPaywall" class="mf-paywall hidden" aria-live="polite"><div class="mf-paywall-card"><div class="mf-paywall-head"><div><small>MODEFLOW PRO</small><h2>Choose your plan</h2><p>Pricing is ready now. Online payments will be connected later, so all ModeFlow features remain usable for now.</p></div><button id="mfClosePlans" class="btn" type="button">Close</button></div><div class="mf-billing-controls"><select id="mfRegion" aria-label="Region">${regionOptions}</select><select id="mfCurrency" aria-label="Currency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></div><div class="mf-plan-grid"><article class="mf-plan featured"><small>MONTHLY</small><strong id="mfMonthlyPrice">₹399</strong><span>per month</span><button class="btn primary" type="button" data-mf-pay="monthly">Payment gateway coming soon</button></article><article class="mf-plan"><small>ANNUAL</small><strong id="mfAnnualPrice">₹3,990</strong><span>per year</span><button class="btn" type="button" data-mf-pay="annual">Payment gateway coming soon</button></article></div><div id="mfBillingStatus" class="mf-paywall-note">Plans are visible for customers. Payments are not required yet.</div></div></div>`);
      qs('#mfClosePlans').onclick=()=>qs('#mfPaywall').classList.add('hidden');
      qs('#mfRegion').onchange=()=>{const region=qs('#mfRegion').value;qs('#mfCurrency').value=region==='IN'?'INR':'USD';renderPrices();};
      qs('#mfCurrency').onchange=renderPrices;
      document.querySelectorAll('[data-mf-pay]').forEach(b=>b.onclick=()=>toastMsg('Online payment will be available soon. You can continue using ModeFlow now.'));
    }
    if(!qs('#mfSettingsDialog')){
      document.body.insertAdjacentHTML('beforeend',`<dialog id="mfSettingsDialog" class="mf-settings-dialog"><div class="mf-settings-inner"><h3>Region & currency</h3><div class="mf-settings-grid"><label>Region<select id="mfSettingsRegion">${regionOptions}</select></label><label>Business currency<select id="mfSettingsCurrency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></label></div><div class="mf-settings-actions"><button class="btn" id="mfSettingsCancel">Cancel</button><button class="btn primary" id="mfSettingsSave">Save</button></div></div></dialog>`);
      qs('#mfSettingsCancel').onclick=()=>qs('#mfSettingsDialog').close();
      qs('#mfSettingsSave').onclick=saveSettings;
    }
    const footer=qs('.side-footer');
    if(footer&&!qs('#mfSettingsButton')){const b=document.createElement('button');b.id='mfSettingsButton';b.className='mf-settings-btn';b.textContent='Region & currency';b.onclick=openSettings;footer.appendChild(b);}
    if(footer&&!qs('#mfPlansButton')){const b=document.createElement('button');b.id='mfPlansButton';b.className='mf-settings-btn';b.textContent='Plans & pricing';b.onclick=openPlans;footer.appendChild(b);}
  }

  function renderPrices(){const c=qs('#mfCurrency')?.value||'INR';if(qs('#mfMonthlyPrice'))qs('#mfMonthlyPrice').textContent=prices[c].monthly;if(qs('#mfAnnualPrice'))qs('#mfAnnualPrice').textContent=prices[c].annual;}

  function openPlans(){ensureUI();const region=workspace?.business?.region||localRegion();const currency=workspace?.business?.currency||(region==='IN'?'INR':'USD');qs('#mfRegion').value=region;qs('#mfCurrency').value=currency;renderPrices();qs('#mfPaywall').classList.remove('hidden');document.body.classList.remove('mf-payment-required');}

  async function saveBusinessPreference(region,currency){
    localStorage.setItem('modeflow-region',region);
    if(!workspace?.id){window.ModeFlowCurrency=currency;return;}
    let {error}=await cloud.client.from('businesses').update({region,currency}).eq('id',workspace.id);
    if(error&&/region|column/i.test(error.message||'')){
      ({error}=await cloud.client.from('businesses').update({currency}).eq('id',workspace.id));
    }
    if(error)throw error;
    workspace.business.region=region;
    workspace.business.currency=currency;
    window.ModeFlowCurrency=currency;
  }

  function openSettings(){ensureUI();const region=workspace?.business?.region||localRegion();qs('#mfSettingsRegion').value=region;qs('#mfSettingsCurrency').value=workspace?.business?.currency||(region==='IN'?'INR':'USD');qs('#mfSettingsDialog').showModal();}

  async function saveSettings(){try{await saveBusinessPreference(qs('#mfSettingsRegion').value,qs('#mfSettingsCurrency').value);qs('#mfSettingsDialog').close();toastMsg('Region and currency updated');if(typeof renderAll==='function')renderAll();}catch(err){toastMsg(err.message||'Could not update settings');}}

  function setWorkspace(detail){workspace=detail;const region=detail?.business?.region||localRegion();window.ModeFlowCurrency=detail?.business?.currency||(region==='IN'?'INR':'USD');ensureUI();if(typeof renderAll==='function')renderAll();}

  addEventListener('modeflow:workspace',e=>setWorkspace(e.detail));
  ensureUI();
  if(window.ModeFlowBusiness)setWorkspace(window.ModeFlowBusiness);
})();
