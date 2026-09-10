// SalesDesk direct UPI QR payment flow.
(function(){
  if(!window.tkCloud?.enabled)return;
  const cloud=window.tkCloud,qs=s=>document.querySelector(s);
  const amounts={monthly:399,annual:3990};
  let workspace=null;
  const notify=m=>typeof toast==='function'?toast(m):alert(m);

  async function authToken(){
    const {data,error}=await cloud.auth.session();
    if(error)throw error;
    const token=data?.session?.access_token;
    if(!token)throw new Error('Please sign in before choosing a paid plan.');
    return token;
  }
  async function api(path,body){
    const token=await authToken();
    const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data?.error||`Payment request failed (${r.status})`);
    return data;
  }
  async function upiConfig(){
    const r=await fetch('/api/upi-config',{cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data?.error||'UPI payment is not configured yet');
    return data;
  }

  function ensureDialog(){
    if(qs('#mfUpiDialog'))return;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="mfUpiDialog" class="mf-settings-dialog mf-upi-dialog"><div class="mf-settings-inner"><div class="mf-upi-head"><div><small>SECURE UPI PAYMENT</small><h3 id="mfUpiTitle">Pay SalesDesk</h3></div><button class="btn" id="mfUpiClose" type="button">Close</button></div><div class="mf-qr-wrap"><img id="mfUpiQr" alt="UPI payment QR code" width="260" height="260"><div class="mf-upi-amount" id="mfUpiAmount"></div><div class="mf-upi-id" id="mfUpiId"></div></div><a class="btn primary mf-upi-open" id="mfUpiOpen" href="#">Open UPI app</a><p class="mf-paywall-note">After payment, enter the UPI transaction/reference number below for verification.</p><label class="mf-upi-label">UPI transaction/reference number<input id="mfUpiUtr" inputmode="numeric" autocomplete="off" placeholder="Example: 415812345678"></label><button class="btn primary" id="mfUpiSubmit" type="button">I have paid</button><div id="mfUpiStatus" class="mf-paywall-note"></div></div></dialog>`);
    qs('#mfUpiClose').onclick=()=>qs('#mfUpiDialog').close();
    qs('#mfUpiSubmit').onclick=submitPayment;
  }

  async function openQr(interval='monthly',currency='INR',button){
    ensureDialog();
    if(!workspace?.id)throw new Error('Open your cloud workspace before starting payment.');
    if(currency!=='INR')throw new Error('UPI QR payment is currently available only for INR.');
    const original=button?.textContent;
    if(button){button.disabled=true;button.textContent='Preparing QR…';}
    try{
      const config=await upiConfig(),amount=amounts[interval]||amounts.monthly;
      const params=new URLSearchParams({pa:config.upiId,pn:config.payeeName,am:String(amount),cu:'INR',tn:`SalesDesk ${interval} plan`});
      const upiUri=`upi://pay?${params.toString()}`;
      const d=qs('#mfUpiDialog');d.dataset.interval=interval;d.dataset.amount=String(amount);
      qs('#mfUpiTitle').textContent=`${interval==='annual'?'Annual':'Monthly'} SalesDesk plan`;
      qs('#mfUpiAmount').textContent=`₹${amount.toLocaleString('en-IN')}`;
      qs('#mfUpiId').textContent=config.upiId;
      qs('#mfUpiQr').src=`https://quickchart.io/qr?size=260&margin=2&text=${encodeURIComponent(upiUri)}`;
      qs('#mfUpiOpen').href=upiUri;qs('#mfUpiUtr').value='';qs('#mfUpiStatus').textContent='';
      d.showModal();
    }finally{if(button){button.disabled=false;button.textContent=original;}}
  }

  async function submitPayment(){
    const d=qs('#mfUpiDialog'),utr=qs('#mfUpiUtr').value.trim(),status=qs('#mfUpiStatus'),b=qs('#mfUpiSubmit');
    if(!utr)return status.textContent='Enter the UPI transaction/reference number.';
    b.disabled=true;b.textContent='Submitting…';status.textContent='Submitting payment for verification…';
    try{
      await api('/api/manual-payment',{businessId:workspace.id,interval:d.dataset.interval,currency:'INR',amount:Number(d.dataset.amount||0),utr});
      status.textContent='Payment submitted. Status: pending verification.';notify('Payment submitted for verification');
    }catch(e){status.textContent=e.message||'Could not submit payment.';notify(status.textContent);}
    finally{b.disabled=false;b.textContent='I have paid';}
  }

  async function ensureAdminButton(){
    const footer=qs('.side-footer');if(!footer||qs('#mfAdminPaymentsButton'))return;
    try{
      const token=await authToken();const r=await fetch('/api/admin-payments',{headers:{authorization:`Bearer ${token}`}});if(!r.ok)return;
      const b=document.createElement('button');b.id='mfAdminPaymentsButton';b.className='nav mf-admin-nav';b.type='button';b.innerHTML='<i>10</i><span>Admin payments</span>';b.onclick=()=>location.href='/admin-payments';
      const logout=qs('#logout');footer.insertBefore(b,logout||null);
    }catch{}
  }

  window.ModeFlowPayments={openQr:async(interval,currency,button)=>{try{return await openQr(interval,currency,button);}catch(e){notify(e.message||'Unable to prepare payment.');throw e;}}};
  function setWorkspace(detail){workspace=detail;ensureDialog();ensureAdminButton();}
  addEventListener('modeflow:workspace',e=>setWorkspace(e.detail));
  ensureDialog();ensureAdminButton();if(window.ModeFlowBusiness)setWorkspace(window.ModeFlowBusiness);
})();