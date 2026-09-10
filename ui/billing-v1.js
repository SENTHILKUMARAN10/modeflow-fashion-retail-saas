// SalesDesk production billing: automated Razorpay subscription checkout first,
// with the existing manual UPI QR flow kept only as a controlled fallback.
(function(){
  'use strict';
  if(!window.tkCloud?.enabled)return;
  const cloud=window.tkCloud,qs=s=>document.querySelector(s);
  const amounts={monthly:399,annual:3990};
  let workspace=null,razorpayPromise=null;
  const notify=m=>typeof toast==='function'?toast(m):alert(m);

  async function authToken(){
    const {data,error}=await cloud.auth.session();
    if(error)throw error;
    const token=data?.session?.access_token;
    if(!token)throw new Error('Please sign in before managing a paid plan.');
    return token;
  }
  async function post(path,body){
    const token=await authToken();
    const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(data?.error||`Payment request failed (${r.status})`);e.status=r.status;throw e;}
    return data;
  }
  async function billingStatus(){
    if(!workspace?.id)return null;
    const token=await authToken();
    const r=await fetch(`/api/billing/status?businessId=${encodeURIComponent(workspace.id)}`,{headers:{authorization:`Bearer ${token}`},cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data?.error||'Unable to load billing status');
    return data;
  }
  function loadRazorpay(){
    if(window.Razorpay)return Promise.resolve(window.Razorpay);
    if(razorpayPromise)return razorpayPromise;
    razorpayPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.async=true;s.onload=()=>window.Razorpay?resolve(window.Razorpay):reject(new Error('Razorpay Checkout did not load'));s.onerror=()=>reject(new Error('Unable to load secure payment checkout'));document.head.appendChild(s);
    });
    return razorpayPromise;
  }

  async function openAutomated(interval='monthly',currency='INR',button){
    if(!workspace?.id)throw new Error('Open your cloud workspace before starting payment.');
    const original=button?.textContent;
    if(button){button.disabled=true;button.textContent='Opening secure checkout…';}
    try{
      const created=await post('/api/billing/create-subscription',{businessId:workspace.id,interval,currency});
      const Razorpay=await loadRazorpay();
      const {data:userData}=await cloud.auth.user();const user=userData?.user;
      return await new Promise((resolve,reject)=>{
        let settled=false;
        const options={
          key:created.keyId,
          subscription_id:created.subscriptionId,
          name:'SalesDesk',
          description:created.label||`${interval} subscription`,
          prefill:{
            name:user?.user_metadata?.full_name||user?.user_metadata?.name||'',
            email:user?.email||'',
            contact:workspace?.business?.phone||''
          },
          notes:{business_id:workspace.id,plan_interval:interval,currency},
          theme:{color:'#173f34'},
          handler:async response=>{
            try{
              const verified=await post('/api/billing/verify-payment',{businessId:workspace.id,...response});
              settled=true;notify('Payment verified. SalesDesk Pro is active.');
              window.dispatchEvent(new CustomEvent('salesdesk:billing-updated',{detail:verified}));
              resolve(verified);
            }catch(error){settled=true;notify(error.message||'Payment verification failed');reject(error);}
          },
          modal:{ondismiss:()=>{if(!settled)resolve({cancelled:true});}}
        };
        const checkout=new Razorpay(options);
        checkout.on('payment.failed',response=>{
          const message=response?.error?.description||'Payment failed. No subscription access was activated.';
          notify(message);
        });
        checkout.open();
      });
    }catch(error){
      // During migration, retain the existing UPI path only when automated billing
      // has not yet been configured in Vercel/Razorpay.
      if(currency==='INR'&&(error.status===503||/not configured|configuration/i.test(error.message||''))){
        notify('Automated checkout is being configured. Opening the verified UPI fallback.');
        return openManualQr(interval,currency,button);
      }
      throw error;
    }finally{if(button){button.disabled=false;button.textContent=original;}}
  }

  async function upiConfig(){
    const r=await fetch('/api/upi-config',{cache:'no-store'});const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data?.error||'UPI payment is not configured yet');return data;
  }
  function ensureDialog(){
    if(qs('#mfUpiDialog'))return;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="mfUpiDialog" class="mf-settings-dialog mf-upi-dialog"><div class="mf-settings-inner"><div class="mf-upi-head"><div><small>MANUAL UPI FALLBACK</small><h3 id="mfUpiTitle">Pay SalesDesk</h3></div><button class="btn" id="mfUpiClose" type="button">Close</button></div><div class="mf-qr-wrap"><img id="mfUpiQr" alt="UPI payment QR code" width="260" height="260"><div class="mf-upi-amount" id="mfUpiAmount"></div><div class="mf-upi-id" id="mfUpiId"></div></div><a class="btn primary mf-upi-open" id="mfUpiOpen" href="#">Open UPI app</a><p class="mf-paywall-note">If automated checkout is unavailable, pay this exact amount and submit the bank/UPI reference. Access activates only after verification.</p><label class="mf-upi-label">UPI transaction/reference number<input id="mfUpiUtr" inputmode="numeric" autocomplete="off" placeholder="Example: 415812345678"></label><button class="btn primary" id="mfUpiSubmit" type="button">Submit payment for verification</button><div id="mfUpiStatus" class="mf-paywall-note"></div></div></dialog>`);
    qs('#mfUpiClose').onclick=()=>qs('#mfUpiDialog').close();qs('#mfUpiSubmit').onclick=submitManualPayment;
  }
  async function openManualQr(interval='monthly',currency='INR'){
    ensureDialog();if(!workspace?.id)throw new Error('Open your cloud workspace before starting payment.');if(currency!=='INR')throw new Error('Manual UPI fallback is available only for INR.');
    const config=await upiConfig(),amount=amounts[interval]||amounts.monthly;
    const params=new URLSearchParams({pa:config.upiId,pn:config.payeeName,am:String(amount),cu:'INR',tn:`SalesDesk ${interval} plan`});const upiUri=`upi://pay?${params.toString()}`;
    const d=qs('#mfUpiDialog');d.dataset.interval=interval;d.dataset.amount=String(amount);qs('#mfUpiTitle').textContent=`${interval==='annual'?'Annual':'Monthly'} SalesDesk plan`;qs('#mfUpiAmount').textContent=`₹${amount.toLocaleString('en-IN')}`;qs('#mfUpiId').textContent=config.upiId;qs('#mfUpiQr').src=`https://quickchart.io/qr?size=260&margin=2&text=${encodeURIComponent(upiUri)}`;qs('#mfUpiOpen').href=upiUri;qs('#mfUpiUtr').value='';qs('#mfUpiStatus').textContent='';d.showModal();
  }
  async function submitManualPayment(){
    const d=qs('#mfUpiDialog'),utr=qs('#mfUpiUtr').value.trim(),status=qs('#mfUpiStatus'),b=qs('#mfUpiSubmit');if(!utr)return status.textContent='Enter the UPI transaction/reference number.';
    b.disabled=true;b.textContent='Submitting…';status.textContent='Submitting payment for verification…';
    try{await post('/api/manual-payment',{businessId:workspace.id,interval:d.dataset.interval,currency:'INR',amount:Number(d.dataset.amount||0),utr});status.textContent='Payment submitted. Access remains locked until verification.';notify('Payment submitted for verification');window.dispatchEvent(new CustomEvent('salesdesk:billing-updated'));}catch(e){status.textContent=e.message||'Could not submit payment.';notify(status.textContent);}finally{b.disabled=false;b.textContent='Submit payment for verification';}
  }

  async function ensureAdminButton(){
    const footer=qs('.side-footer');if(!footer||qs('#mfAdminPaymentsButton'))return;
    try{const token=await authToken();const r=await fetch('/api/admin-payments',{headers:{authorization:`Bearer ${token}`}});if(!r.ok)return;const b=document.createElement('button');b.id='mfAdminPaymentsButton';b.className='nav mf-admin-nav';b.type='button';b.innerHTML='<i>14</i><span>Admin payments</span>';b.onclick=()=>location.href='/admin-payments';const logout=qs('#logout');footer.insertBefore(b,logout||null);}catch{}
  }

  const api={openQr:async(interval,currency,button)=>{try{return await openAutomated(interval,currency,button);}catch(e){notify(e.message||'Unable to prepare payment.');throw e;}},openCheckout:openAutomated,openManualQr,billingStatus};
  window.ModeFlowPayments=api;window.SalesDeskPayments=api;
  function setWorkspace(detail){workspace=detail;ensureDialog();ensureAdminButton();}
  addEventListener('modeflow:workspace',e=>setWorkspace(e.detail));ensureDialog();ensureAdminButton();if(window.ModeFlowBusiness)setWorkspace(window.ModeFlowBusiness);
})();