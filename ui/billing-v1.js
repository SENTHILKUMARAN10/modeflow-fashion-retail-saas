// ModeFlow pricing + simple UPI QR payment flow.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud,qs=s=>document.querySelector(s);
  const prices={INR:{monthly:'₹399',annual:'₹3,990'},USD:{monthly:'$4.99',annual:'$49.99'}};
  const amounts={monthly:399,annual:3990};
  const regions={IN:'India',US:'United States',GB:'United Kingdom',AE:'United Arab Emirates',SG:'Singapore',AU:'Australia',CA:'Canada'};
  let workspace=null;
  const toastMsg=m=>typeof toast==='function'?toast(m):alert(m);
  const regionOptions=Object.entries(regions).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  const localRegion=()=>localStorage.getItem('modeflow-region')||'IN';

  async function authToken(){
    const {data,error}=await cloud.auth.session();
    if(error) throw error;
    const token=data?.session?.access_token;
    if(!token) throw new Error('Please sign in before choosing a paid plan.');
    return token;
  }

  async function api(path,body){
    const token=await authToken();
    const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data?.error||`Payment request failed (${response.status})`);
    return data;
  }

  async function upiConfig(){
    const response=await fetch('/api/upi-config',{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data?.error||'UPI payment is not configured yet');
    return data;
  }

  async function ensureAdminButton(){
    const footer=qs('.side-footer');
    if(!footer||qs('#mfAdminPaymentsButton')) return;
    try{
      const token=await authToken();
      const response=await fetch('/api/admin-payments',{headers:{authorization:`Bearer ${token}`}});
      if(!response.ok) return;
      const b=document.createElement('button');
      b.id='mfAdminPaymentsButton';
      b.className='mf-settings-btn';
      b.textContent='Admin payments';
      b.onclick=()=>{location.href='/admin-payments';};
      footer.appendChild(b);
    }catch{}
  }

  function ensureUI(){
    if(!qs('#mfPaywall')){
      document.body.insertAdjacentHTML('beforeend',`<div id="mfPaywall" class="mf-paywall hidden" aria-live="polite"><div class="mf-paywall-card"><div class="mf-paywall-head"><div><small>MODEFLOW PRO</small><h2>Choose your plan</h2><p>Pay securely by scanning the UPI QR code. After payment, enter the transaction reference number for manual verification.</p></div><button id="mfClosePlans" class="btn" type="button">Close</button></div><div class="mf-billing-controls"><select id="mfRegion" aria-label="Region">${regionOptions}</select><select id="mfCurrency" aria-label="Currency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></div><div class="mf-plan-grid"><article class="mf-plan featured"><small>MONTHLY</small><strong id="mfMonthlyPrice">₹399</strong><span>per month</span><button class="btn primary" type="button" data-mf-pay="monthly">Pay by UPI QR</button></article><article class="mf-plan"><small>ANNUAL</small><strong id="mfAnnualPrice">₹3,990</strong><span>per year</span><button class="btn" type="button" data-mf-pay="annual">Pay by UPI QR</button></article></div><div id="mfBillingStatus" class="mf-paywall-note">Select a plan to show the UPI QR code.</div></div></div>`);
      qs('#mfClosePlans').onclick=()=>qs('#mfPaywall').classList.add('hidden');
      qs('#mfRegion').onchange=()=>{const region=qs('#mfRegion').value;qs('#mfCurrency').value=region==='IN'?'INR':'USD';renderPrices();};
      qs('#mfCurrency').onchange=renderPrices;
      document.querySelectorAll('[data-mf-pay]').forEach(b=>b.onclick=()=>startPayment(b.dataset.mfPay,b));
    }
    if(!qs('#mfUpiDialog')){
      document.body.insertAdjacentHTML('beforeend',`<dialog id="mfUpiDialog" class="mf-settings-dialog mf-upi-dialog"><div class="mf-settings-inner"><div class="mf-upi-head"><div><small>UPI PAYMENT</small><h3 id="mfUpiTitle">Pay ModeFlow</h3></div><button class="btn" id="mfUpiClose" type="button">Close</button></div><div class="mf-qr-wrap"><img id="mfUpiQr" alt="UPI payment QR code" width="260" height="260"><div class="mf-upi-amount" id="mfUpiAmount"></div><div class="mf-upi-id" id="mfUpiId"></div></div><a class="btn primary mf-upi-open" id="mfUpiOpen" href="#">Open UPI app</a><p class="mf-paywall-note">After you pay, enter the UPI transaction/reference number below. Your plan will remain pending until it is verified.</p><label class="mf-upi-label">UPI transaction/reference number<input id="mfUpiUtr" inputmode="numeric" autocomplete="off" placeholder="Example: 415812345678"></label><button class="btn primary" id="mfUpiSubmit" type="button">I have paid</button><div id="mfUpiStatus" class="mf-paywall-note"></div></div></dialog>`);
      qs('#mfUpiClose').onclick=()=>qs('#mfUpiDialog').close();
      qs('#mfUpiSubmit').onclick=submitManualPayment;
    }
    if(!qs('#mfSettingsDialog')){
      document.body.insertAdjacentHTML('beforeend',`<dialog id="mfSettingsDialog" class="mf-settings-dialog"><div class="mf-settings-inner"><h3>Region & currency</h3><div class="mf-settings-grid"><label>Region<select id="mfSettingsRegion">${regionOptions}</select></label><label>Business currency<select id="mfSettingsCurrency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></label></div><div class="mf-settings-actions"><button class="btn" id="mfSettingsCancel">Cancel</button><button class="btn primary" id="mfSettingsSave">Save</button></div></div></dialog>`);
      qs('#mfSettingsCancel').onclick=()=>qs('#mfSettingsDialog').close();
      qs('#mfSettingsSave').onclick=saveSettings;
    }
    const footer=qs('.side-footer');
    if(footer&&!qs('#mfSettingsButton')){const b=document.createElement('button');b.id='mfSettingsButton';b.className='mf-settings-btn';b.textContent='Region & currency';b.onclick=openSettings;footer.appendChild(b);}
    if(footer&&!qs('#mfPlansButton')){const b=document.createElement('button');b.id='mfPlansButton';b.className='mf-settings-btn';b.textContent='Plans & pricing';b.onclick=openPlans;footer.appendChild(b);}
    ensureAdminButton();
  }

  function renderPrices(){
    const c=qs('#mfCurrency')?.value||'INR';
    if(qs('#mfMonthlyPrice'))qs('#mfMonthlyPrice').textContent=prices[c].monthly;
    if(qs('#mfAnnualPrice'))qs('#mfAnnualPrice').textContent=prices[c].annual;
  }

  function openPlans(){
    ensureUI();
    const region=workspace?.business?.region||localRegion();
    const currency=workspace?.business?.currency||(region==='IN'?'INR':'USD');
    qs('#mfRegion').value=region;
    qs('#mfCurrency').value=currency;
    renderPrices();
    qs('#mfPaywall').classList.remove('hidden');
    document.body.classList.remove('mf-payment-required');
  }

  async function startPayment(interval,button){
    if(!workspace?.id) return toastMsg('Open your cloud workspace before starting payment.');
    const currency=qs('#mfCurrency')?.value||workspace?.business?.currency||'INR';
    if(currency!=='INR') return toastMsg('UPI QR payment is currently available only for INR.');
    const original=button.textContent;
    const status=qs('#mfBillingStatus');
    button.disabled=true;button.textContent='Preparing QR…';
    if(status)status.textContent='Preparing your UPI payment QR…';
    try{
      const config=await upiConfig();
      const amount=amounts[interval];
      const note=`ModeFlow ${interval} plan`;
      const params=new URLSearchParams({pa:config.upiId,pn:config.payeeName,am:String(amount),cu:'INR',tn:note});
      const upiUri=`upi://pay?${params.toString()}`;
      const qrUrl=`https://quickchart.io/qr?size=260&margin=2&text=${encodeURIComponent(upiUri)}`;
      const dialog=qs('#mfUpiDialog');
      dialog.dataset.interval=interval;
      dialog.dataset.amount=String(amount);
      qs('#mfUpiTitle').textContent=`${interval==='monthly'?'Monthly':'Annual'} plan`;
      qs('#mfUpiAmount').textContent=`₹${amount.toLocaleString('en-IN')}`;
      qs('#mfUpiId').textContent=config.upiId;
      qs('#mfUpiQr').src=qrUrl;
      qs('#mfUpiOpen').href=upiUri;
      qs('#mfUpiUtr').value='';
      qs('#mfUpiStatus').textContent='';
      dialog.showModal();
      if(status)status.textContent='Scan the QR code and complete the UPI payment.';
    }catch(error){
      const message=error?.message||'Unable to prepare UPI payment.';
      if(status)status.textContent=message;
      toastMsg(message);
    }finally{
      button.disabled=false;button.textContent=original;
    }
  }

  async function submitManualPayment(){
    const dialog=qs('#mfUpiDialog');
    const interval=dialog.dataset.interval;
    const amount=Number(dialog.dataset.amount||0);
    const utr=qs('#mfUpiUtr').value.trim();
    const status=qs('#mfUpiStatus');
    const button=qs('#mfUpiSubmit');
    if(!utr) return status.textContent='Enter the UPI transaction/reference number.';
    button.disabled=true;button.textContent='Submitting…';
    status.textContent='Submitting payment for verification…';
    try{
      await api('/api/manual-payment',{businessId:workspace.id,interval,currency:'INR',amount,utr});
      status.textContent='Payment submitted. Status: pending verification.';
      toastMsg('Payment submitted for verification');
    }catch(error){
      status.textContent=error.message||'Could not submit payment.';
      toastMsg(error.message||'Could not submit payment');
    }finally{
      button.disabled=false;button.textContent='I have paid';
    }
  }

  async function saveBusinessPreference(region,currency){
    localStorage.setItem('modeflow-region',region);
    if(!workspace?.id){window.ModeFlowCurrency=currency;return;}
    let {error}=await cloud.client.from('businesses').update({region,currency}).eq('id',workspace.id);
    if(error&&/region|column/i.test(error.message||''))({error}=await cloud.client.from('businesses').update({currency}).eq('id',workspace.id));
    if(error)throw error;
    workspace.business.region=region;workspace.business.currency=currency;window.ModeFlowCurrency=currency;
  }

  function openSettings(){ensureUI();const region=workspace?.business?.region||localRegion();qs('#mfSettingsRegion').value=region;qs('#mfSettingsCurrency').value=workspace?.business?.currency||(region==='IN'?'INR':'USD');qs('#mfSettingsDialog').showModal();}
  async function saveSettings(){try{await saveBusinessPreference(qs('#mfSettingsRegion').value,qs('#mfSettingsCurrency').value);qs('#mfSettingsDialog').close();toastMsg('Region and currency updated');if(typeof renderAll==='function')renderAll();}catch(err){toastMsg(err.message||'Could not update settings');}}
  function setWorkspace(detail){workspace=detail;const region=detail?.business?.region||localRegion();window.ModeFlowCurrency=detail?.business?.currency||(region==='IN'?'INR':'USD');ensureUI();ensureAdminButton();if(typeof renderAll==='function')renderAll();}

  addEventListener('modeflow:workspace',e=>setWorkspace(e.detail));
  ensureUI();
  if(window.ModeFlowBusiness)setWorkspace(window.ModeFlowBusiness);
})();
