// ModeFlow pricing + Razorpay subscription checkout.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud,qs=s=>document.querySelector(s);
  const prices={INR:{monthly:'₹399',annual:'₹3,990'},USD:{monthly:'$4.99',annual:'$49.99'}};
  const regions={IN:'India',US:'United States',GB:'United Kingdom',AE:'United Arab Emirates',SG:'Singapore',AU:'Australia',CA:'Canada'};
  let workspace=null,checkoutPromise=null;
  const toastMsg=m=>typeof toast==='function'?toast(m):alert(m);
  const regionOptions=Object.entries(regions).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  const localRegion=()=>localStorage.getItem('modeflow-region')||'IN';

  function loadCheckout(){
    if(window.Razorpay) return Promise.resolve();
    if(checkoutPromise) return checkoutPromise;
    checkoutPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-modeflow-razorpay]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Razorpay Checkout failed to load')),{once:true});return;}
      const s=document.createElement('script');
      s.src='https://checkout.razorpay.com/v1/checkout.js';
      s.async=true;s.dataset.modeflowRazorpay='1';
      s.onload=resolve;s.onerror=()=>reject(new Error('Razorpay Checkout failed to load'));
      document.head.appendChild(s);
    });
    return checkoutPromise;
  }

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
    if(!response.ok) throw new Error(data?.error||'Payment request failed');
    return data;
  }

  function ensureUI(){
    if(!qs('#mfPaywall')){
      document.body.insertAdjacentHTML('beforeend',`<div id="mfPaywall" class="mf-paywall hidden" aria-live="polite"><div class="mf-paywall-card"><div class="mf-paywall-head"><div><small>MODEFLOW PRO</small><h2>Choose your plan</h2><p>Secure recurring payments are processed by Razorpay. You can test the flow without real money while test keys are enabled.</p></div><button id="mfClosePlans" class="btn" type="button">Close</button></div><div class="mf-billing-controls"><select id="mfRegion" aria-label="Region">${regionOptions}</select><select id="mfCurrency" aria-label="Currency"><option value="INR">INR — ₹</option><option value="USD">USD — $</option></select></div><div class="mf-plan-grid"><article class="mf-plan featured"><small>MONTHLY</small><strong id="mfMonthlyPrice">₹399</strong><span>per month</span><button class="btn primary" type="button" data-mf-pay="monthly">Pay with Razorpay</button></article><article class="mf-plan"><small>ANNUAL</small><strong id="mfAnnualPrice">₹3,990</strong><span>per year</span><button class="btn" type="button" data-mf-pay="annual">Pay with Razorpay</button></article></div><div id="mfBillingStatus" class="mf-paywall-note">Select a plan to open Razorpay secure checkout.</div></div></div>`);
      qs('#mfClosePlans').onclick=()=>qs('#mfPaywall').classList.add('hidden');
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
    if(footer&&!qs('#mfPlansButton')){const b=document.createElement('button');b.id='mfPlansButton';b.className='mf-settings-btn';b.textContent='Plans & pricing';b.onclick=openPlans;footer.appendChild(b);}
  }

  function renderPrices(){const c=qs('#mfCurrency')?.value||'INR';if(qs('#mfMonthlyPrice'))qs('#mfMonthlyPrice').textContent=prices[c].monthly;if(qs('#mfAnnualPrice'))qs('#mfAnnualPrice').textContent=prices[c].annual;}

  function openPlans(){ensureUI();const region=workspace?.business?.region||localRegion();const currency=workspace?.business?.currency||(region==='IN'?'INR':'USD');qs('#mfRegion').value=region;qs('#mfCurrency').value=currency;renderPrices();qs('#mfPaywall').classList.remove('hidden');document.body.classList.remove('mf-payment-required');}

  async function startPayment(interval,button){
    if(!workspace?.id) return toastMsg('Open your cloud workspace before starting payment.');
    const currency=qs('#mfCurrency')?.value||workspace?.business?.currency||'INR';
    const status=qs('#mfBillingStatus');
    const original=button.textContent;
    button.disabled=true;button.textContent='Starting…';
    if(status)status.textContent='Creating your secure Razorpay subscription…';
    try{
      await loadCheckout();
      const created=await api('/api/billing/create-subscription',{businessId:workspace.id,interval,currency});
      if(!created?.subscriptionId||!created?.keyId) throw new Error('Razorpay subscription could not be created.');
      const user=await cloud.auth.user().catch(()=>({data:null}));
      const email=user?.data?.user?.email||'';
      const options={
        key:created.keyId,
        subscription_id:created.subscriptionId,
        name:'ModeFlow',
        description:created.label||'ModeFlow Pro subscription',
        prefill:{email},
        theme:{},
        handler:async response=>{
          if(status)status.textContent='Payment received. Verifying securely…';
          try{
            await api('/api/billing/verify-payment',{businessId:workspace.id,...response});
            if(status)status.textContent='Payment verified. ModeFlow Pro is active.';
            toastMsg('Payment verified successfully');
          }catch(error){
            if(status)status.textContent=error.message||'Payment verification failed.';
            toastMsg(error.message||'Payment verification failed');
          }
        },
        modal:{ondismiss:()=>{if(status)status.textContent='Payment cancelled. No charge was completed.';}},
        notes:{business_id:workspace.id,plan_interval:interval,currency}
      };
      const rz=new window.Razorpay(options);
      rz.on('payment.failed',response=>{const message=response?.error?.description||'Payment failed. Please try again.';if(status)status.textContent=message;toastMsg(message);});
      rz.open();
    }catch(error){
      const message=error?.message||'Unable to start Razorpay checkout.';
      if(status)status.textContent=message;
      toastMsg(message);
    }finally{button.disabled=false;button.textContent=original;}
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
  function setWorkspace(detail){workspace=detail;const region=detail?.business?.region||localRegion();window.ModeFlowCurrency=detail?.business?.currency||(region==='IN'?'INR':'USD');ensureUI();if(typeof renderAll==='function')renderAll();}

  addEventListener('modeflow:workspace',e=>setWorkspace(e.detail));
  ensureUI();
  if(window.ModeFlowBusiness)setWorkspace(window.ModeFlowBusiness);
})();
