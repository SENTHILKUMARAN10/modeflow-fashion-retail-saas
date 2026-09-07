// Production cloud controller for the existing ModeFlow UI.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud;
  let businessId=null, userId=null, role='staff', channel=null;
  let loading=false, refreshPending=false, refreshTimer=null, cloudMode=false;

  const qs=s=>document.querySelector(s);
  const setStatus=(text)=>{const el=qs('#cloudStatus'); if(el) el.textContent=text;};
  const friendlyError=err=>{
    const m=String(err?.message||err||'Something went wrong');
    if(/fetch|network|offline/i.test(m)) return 'Network unavailable. Check your connection and try again.';
    if(/Invalid login credentials/i.test(m)) return 'Email or password is incorrect.';
    if(/Email not confirmed/i.test(m)) return 'Please confirm your email before signing in.';
    if(/row-level security|permission denied|not authorized/i.test(m)) return 'Your account does not have permission for this action.';
    return m.length>140?'The operation could not be completed. Please try again.':m;
  };
  const uuid=()=>crypto?.randomUUID?.() || ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)}));

  const mapProduct=p=>({id:p.id,name:p.name,cost:Number(p.cost_price||0),price:Number(p.selling_price||0),stock:Number(p.stock||0),reorder:Number(p.reorder_level||0)});
  const mapInvoice=i=>{
    const item=(i.invoice_items||[])[0]||{};
    return {id:i.invoice_number,dbId:i.id,customer:i.customer_name,phone:i.customer_phone||'',product:item.product_name||'Item',productId:item.product_id,qty:Number(item.quantity||0),rate:Number(item.rate||0),cost:Number(item.cost_price||0),discount:Number(i.discount||0),subtotal:Number(i.subtotal||0),total:Number(i.total||0),paymentMethod:i.payment_method,paymentStatus:i.payment_status,date:new Date(i.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),ts:new Date(i.created_at).getTime()};
  };
  const mapExpense=e=>({id:e.id,category:e.category,amount:Number(e.amount||0),note:e.note||'',date:new Date(e.expense_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),ts:new Date(e.created_at||e.expense_date).getTime()});

  function applyRoleUI(){
    const canManageProducts=['owner','manager'].includes(role);
    const add=qs('#addProduct'); if(add){add.disabled=!canManageProducts; add.title=canManageProducts?'Add product':'Owner or manager access required';}
    const badge=qs('#modeBadge'); if(badge) badge.textContent=`Cloud · ${role}`;
  }

  async function ensureWorkspace(){
    let memberships=await cloud.businesses.list();
    if(!memberships?.length){
      await cloud.businesses.create('ModeFlow Store');
      memberships=await cloud.businesses.list();
    }
    const membership=memberships[0];
    const first=membership?.businesses;
    if(!first) throw new Error('No ModeFlow business workspace found');
    businessId=first.id; role=membership.role||'staff';
    const storeCard=qs('.store-card div');
    if(storeCard) storeCard.innerHTML=`<b>${esc(first.name||'ModeFlow Store')}</b><small>Secure realtime workspace</small>`;
    applyRoleUI();
  }

  async function refreshCloud(){
    if(!businessId) return;
    if(loading){refreshPending=true; return;}
    loading=true;
    try{
      const [products,invoices,expenses]=await Promise.all([
        cloud.products.list(businessId),cloud.invoices.list(businessId),cloud.expenses.list(businessId)
      ]);
      store.products=(products||[]).map(mapProduct);
      store.invoices=(invoices||[]).map(mapInvoice);
      store.expenses=(expenses||[]).map(mapExpense);
      renderAll();
      setStatus(navigator.onLine?'Realtime cloud connected.':'Offline — showing last loaded data.');
    }catch(err){
      console.error('ModeFlow refresh failed',err);
      setStatus(navigator.onLine?'Cloud sync error. Retrying…':'Offline — changes cannot be saved.');
      throw err;
    }finally{
      loading=false;
      if(refreshPending){refreshPending=false; scheduleRefresh(80);}
    }
  }

  function scheduleRefresh(delay=180){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>refreshCloud().catch(()=>{}),delay);
  }

  async function enterCloud(){
    const {data}=await cloud.auth.user();
    userId=data?.user?.id;
    if(!userId) throw new Error('Please sign in again');
    await ensureWorkspace();
    await refreshCloud();
    if(channel) await cloud.realtime.unsubscribe(channel);
    channel=cloud.realtime.subscribe(
      businessId,
      ()=>scheduleRefresh(),
      status=>{
        if(status==='SUBSCRIBED') setStatus('Realtime cloud connected.');
        else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT') setStatus('Realtime reconnecting…');
      }
    );
    cloudMode=true;
    showApp(`Cloud · ${role}`);
    applyRoleUI();
  }

  const loginForm=qs('#cloudLogin');
  loginForm.onsubmit=async e=>{
    e.preventDefault();
    const btn=loginForm.querySelector('button[type="submit"],button:not([type])');
    if(btn?.disabled) return;
    if(btn) btn.disabled=true;
    setStatus('Signing in…');
    try{
      const {error}=await cloud.auth.signIn(qs('#loginEmail').value.trim(),qs('#loginPassword').value);
      if(error) throw error;
      await enterCloud();
      toast('ModeFlow cloud connected');
    }catch(err){setStatus('Sign in failed.');toast(friendlyError(err));}
    finally{if(btn) btn.disabled=false;}
  };

  // Reuse the original demo button as production account creation.
  const createBtn=qs('#demoLogin');
  if(createBtn){
    createBtn.textContent='Create your ModeFlow account →';
    createBtn.onclick=async()=>{
      const email=prompt('Enter your business email address:'); if(!email) return;
      const password=prompt('Create a password (minimum 8 characters):'); if(!password) return;
      if(password.length<8) return toast('Password must be at least 8 characters');
      createBtn.disabled=true;
      try{
        const {data,error}=await cloud.auth.signUp(email.trim(),password);
        if(error) throw error;
        if(data?.session){await enterCloud();toast('Account created');}
        else toast('Account created. Check your email to confirm it, then sign in.');
      }catch(err){toast(friendlyError(err));}
      finally{createBtn.disabled=false;}
    };
  }

  // Add password-reset action without requiring a redesign.
  if(loginForm && !qs('#resetPassword')){
    const reset=document.createElement('button');
    reset.type='button'; reset.id='resetPassword'; reset.className='text-link'; reset.textContent='Forgot password?';
    reset.onclick=async()=>{
      const email=qs('#loginEmail').value.trim() || prompt('Enter your account email:');
      if(!email) return;
      try{const {error}=await cloud.auth.resetPassword(email); if(error) throw error; toast('Password reset email sent');}
      catch(err){toast(friendlyError(err));}
    };
    loginForm.appendChild(reset);
  }

  qs('#logout').onclick=async()=>{
    try{if(channel) await cloud.realtime.unsubscribe(channel); await cloud.auth.signOut();}catch{}
    businessId=null; userId=null; channel=null; cloudMode=false;
    qs('#app').classList.add('hidden'); qs('#login').classList.remove('hidden');
    setStatus('Signed out securely.');
  };

  qs('#invoiceForm').onsubmit=async e=>{
    e.preventDefault();
    if(!businessId||!cloudMode) return toast('Sign in to the cloud workspace first');
    if(!navigator.onLine) return toast('You are offline. Reconnect before completing the sale.');
    const form=e.currentTarget, btn=form.querySelector('button[type="submit"],button:not([type])');
    if(btn?.disabled) return;
    const p=selectedProduct(),qty=Number(qs('#qty').value),rate=Number(qs('#rate').value),discount=Number(qs('#discount').value)||0;
    if(!p||qty<=0) return toast('Enter a valid quantity');
    if(qty>p.stock) return toast('Not enough stock for this sale');
    if(rate<0||discount<0||discount>qty*rate) return toast('Check the price and discount');
    const idempotencyKey=uuid();
    if(btn){btn.disabled=true;btn.dataset.original=btn.textContent;btn.textContent='Saving sale…';}
    try{
      await cloud.invoices.checkout({
        p_business_id:businessId,p_product_id:p.id,p_customer_name:qs('#customerName').value.trim(),p_customer_phone:qs('#phone').value.trim(),
        p_quantity:qty,p_rate:rate,p_discount:discount,p_payment_method:qs('#paymentMethod').value,p_payment_status:qs('#paymentStatus').value,p_idempotency_key:idempotencyKey
      });
      form.reset(); qs('#qty').value=1; qs('#discount').value=0;
      await refreshCloud(); toast('Sale saved securely'); gotoView('history');
    }catch(err){toast(friendlyError(err));}
    finally{if(btn){btn.disabled=false;btn.textContent=btn.dataset.original||'Complete sale';}}
  };

  qs('#productForm').onsubmit=async e=>{
    e.preventDefault();
    if(!['owner','manager'].includes(role)) return toast('Owner or manager access required');
    if(!navigator.onLine) return toast('Reconnect before saving products.');
    const id=qs('#pId').value;
    const data={name:qs('#pName').value.trim(),cost:Number(qs('#pCost').value),price:Number(qs('#pPrice').value),stock:Number(qs('#pStock').value),reorder:Number(qs('#pReorder').value)};
    if(!data.name||[data.cost,data.price,data.stock,data.reorder].some(v=>!Number.isFinite(v)||v<0)) return toast('Check the product details');
    try{if(id) await cloud.products.update(id,data); else await cloud.products.create(businessId,data); qs('#productDialog').close(); await refreshCloud(); toast(id?'Product updated':'Product added');}
    catch(err){toast(friendlyError(err));}
  };

  window.deleteProduct=async id=>{
    if(!['owner','manager'].includes(role)) return toast('Owner or manager access required');
    if(!confirm('Archive this product? Existing invoice history will be kept.')) return;
    try{await cloud.products.remove(id);await refreshCloud();toast('Product archived');}catch(err){toast(friendlyError(err));}
  };

  qs('#expenseForm').onsubmit=async e=>{
    e.preventDefault();
    if(!businessId) return toast('Sign in to the cloud workspace first');
    if(!navigator.onLine) return toast('Reconnect before saving expenses.');
    const amount=Number(qs('#expenseAmount').value),category=qs('#expenseCategory').value.trim();
    if(!category||!Number.isFinite(amount)||amount<=0) return toast('Enter a valid expense');
    try{await cloud.expenses.create(businessId,userId,{category,amount,note:qs('#expenseNote').value.trim()});e.target.reset();await refreshCloud();toast('Expense saved');}
    catch(err){toast(friendlyError(err));}
  };

  window.deleteExpense=async id=>{
    if(role!=='owner') return toast('Only the owner can delete expenses');
    if(!confirm('Delete this expense? This action will be recorded in the audit log.')) return;
    try{await cloud.expenses.remove(id);await refreshCloud();toast('Expense deleted');}catch(err){toast(friendlyError(err));}
  };

  window.deleteInvoice=async invoiceNumber=>{
    if(role!=='owner') return toast('Only the owner can delete a sale');
    const i=store.invoices.find(x=>x.id===invoiceNumber);
    if(!i?.dbId||!confirm('Delete this sale and restore its stock? This action is audited.')) return;
    try{await cloud.invoices.remove(i.dbId);await refreshCloud();toast('Sale deleted and stock restored');}catch(err){toast(friendlyError(err));}
  };

  addEventListener('online',()=>{setStatus('Back online. Syncing…');scheduleRefresh(20);});
  addEventListener('offline',()=>setStatus('Offline — changes cannot be saved.'));

  cloud.auth.onChange(async(event)=>{
    if(event==='SIGNED_OUT'){cloudMode=false;return;}
    if(event==='PASSWORD_RECOVERY'){
      const password=prompt('Enter your new password (minimum 8 characters):');
      if(password?.length>=8){const {error}=await cloud.auth.updatePassword(password);toast(error?friendlyError(error):'Password updated');}
    }
  });

  cloud.auth.session().then(async({data})=>{
    if(data?.session){try{await enterCloud();}catch(err){console.warn(err);setStatus(friendlyError(err));}}
  });
})();
