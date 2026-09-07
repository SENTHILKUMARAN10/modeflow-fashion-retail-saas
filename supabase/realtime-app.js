// Connect the existing ModeFlow UI to Supabase without changing the visual design.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud;
  let businessId=null, userId=null, channel=null, loading=false;

  const mapProduct=p=>({id:p.id,name:p.name,cost:Number(p.cost_price||0),price:Number(p.selling_price||0),stock:Number(p.stock||0),reorder:Number(p.reorder_level||0)});
  const mapInvoice=i=>{
    const item=(i.invoice_items||[])[0]||{};
    return {id:i.invoice_number,dbId:i.id,customer:i.customer_name,phone:i.customer_phone||'',product:item.product_name||'Item',productId:item.product_id,qty:Number(item.quantity||0),rate:Number(item.rate||0),cost:0,discount:Number(i.discount||0),subtotal:Number(i.subtotal||0),total:Number(i.total||0),paymentMethod:i.payment_method,paymentStatus:i.payment_status,date:new Date(i.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),ts:new Date(i.created_at).getTime()};
  };
  const mapExpense=e=>({id:e.id,category:e.category,amount:Number(e.amount||0),note:e.note||'',date:new Date(e.expense_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),ts:new Date(e.created_at||e.expense_date).getTime()});

  async function ensureWorkspace(){
    let memberships=await cloud.businesses.list();
    if(!memberships?.length){
      await cloud.businesses.create('ModeFlow Store');
      memberships=await cloud.businesses.list();
    }
    const first=memberships[0]?.businesses;
    if(!first) throw new Error('No ModeFlow business workspace found');
    businessId=first.id;
    const storeCard=document.querySelector('.store-card div');
    if(storeCard) storeCard.innerHTML=`<b>${esc(first.name||'ModeFlow Store')}</b><small>Realtime cloud workspace</small>`;
  }

  async function refreshCloud(){
    if(!businessId||loading) return;
    loading=true;
    try{
      const [products,invoices,expenses]=await Promise.all([
        cloud.products.list(businessId),cloud.invoices.list(businessId),cloud.expenses.list(businessId)
      ]);
      store.products=(products||[]).map(mapProduct);
      store.invoices=(invoices||[]).map(mapInvoice);
      store.expenses=(expenses||[]).map(mapExpense);
      renderAll();
    }finally{loading=false;}
  }

  async function enterCloud(){
    const {data}=await cloud.auth.user();
    userId=data?.user?.id;
    if(!userId) throw new Error('Please sign in again');
    await ensureWorkspace();
    await refreshCloud();
    if(channel) await cloud.realtime.unsubscribe(channel);
    channel=cloud.realtime.subscribe(businessId,()=>refreshCloud().catch(console.error));
    showApp('Realtime cloud');
    document.querySelector('#cloudStatus').textContent='Realtime cloud connected.';
  }

  const loginForm=document.querySelector('#cloudLogin');
  loginForm.onsubmit=async e=>{
    e.preventDefault();
    try{
      const {error}=await cloud.auth.signIn(document.querySelector('#loginEmail').value,document.querySelector('#loginPassword').value);
      if(error) throw error;
      await enterCloud();
      toast('ModeFlow realtime connected');
    }catch(err){toast(err.message||'Sign in failed');}
  };

  document.querySelector('#logout').onclick=async()=>{
    try{if(channel) await cloud.realtime.unsubscribe(channel); await cloud.auth.signOut();}catch{}
    businessId=null; userId=null; channel=null;
    document.querySelector('#app').classList.add('hidden');
    document.querySelector('#login').classList.remove('hidden');
  };

  document.querySelector('#invoiceForm').onsubmit=async e=>{
    e.preventDefault();
    if(!businessId) return toast('Sign in to the realtime workspace first');
    const p=selectedProduct(),qty=Number(document.querySelector('#qty').value);
    if(!p||qty<=0) return;
    if(qty>p.stock) return toast('Not enough stock for this sale');
    try{
      await cloud.invoices.checkout({
        p_business_id:businessId,
        p_product_id:p.id,
        p_customer_name:document.querySelector('#customerName').value.trim(),
        p_customer_phone:document.querySelector('#phone').value.trim(),
        p_quantity:qty,
        p_rate:Number(document.querySelector('#rate').value),
        p_discount:Number(document.querySelector('#discount').value)||0,
        p_payment_method:document.querySelector('#paymentMethod').value,
        p_payment_status:document.querySelector('#paymentStatus').value
      });
      e.target.reset(); document.querySelector('#qty').value=1; document.querySelector('#discount').value=0;
      await refreshCloud(); toast('Sale saved to cloud'); gotoView('history');
    }catch(err){toast(err.message||'Sale failed');}
  };

  document.querySelector('#productForm').onsubmit=async e=>{
    e.preventDefault();
    if(!businessId) return toast('Sign in to the realtime workspace first');
    const id=document.querySelector('#pId').value;
    const data={name:document.querySelector('#pName').value.trim(),cost:Number(document.querySelector('#pCost').value),price:Number(document.querySelector('#pPrice').value),stock:Number(document.querySelector('#pStock').value),reorder:Number(document.querySelector('#pReorder').value)};
    try{
      if(id) await cloud.products.update(id,data); else await cloud.products.create(businessId,data);
      document.querySelector('#productDialog').close(); await refreshCloud(); toast(id?'Product updated':'Product added');
    }catch(err){toast(err.message||'Product save failed');}
  };

  window.deleteProduct=async id=>{
    if(!businessId) return toast('Sign in to the realtime workspace first');
    if(!confirm('Archive this product?')) return;
    try{await cloud.products.remove(id); await refreshCloud(); toast('Product archived');}catch(err){toast(err.message||'Delete failed');}
  };

  document.querySelector('#expenseForm').onsubmit=async e=>{
    e.preventDefault();
    if(!businessId) return toast('Sign in to the realtime workspace first');
    try{
      await cloud.expenses.create(businessId,userId,{category:document.querySelector('#expenseCategory').value.trim(),amount:Number(document.querySelector('#expenseAmount').value),note:document.querySelector('#expenseNote').value.trim()});
      e.target.reset(); await refreshCloud(); toast('Expense saved to cloud');
    }catch(err){toast(err.message||'Expense save failed');}
  };

  window.deleteExpense=async id=>{
    if(!confirm('Delete this expense?')) return;
    try{await cloud.expenses.remove(id); await refreshCloud(); toast('Expense deleted');}catch(err){toast(err.message||'Delete failed');}
  };

  window.deleteInvoice=async invoiceNumber=>{
    const i=store.invoices.find(x=>x.id===invoiceNumber);
    if(!i?.dbId||!confirm('Delete order and restore stock?')) return;
    try{await cloud.invoices.remove(i.dbId); await refreshCloud(); toast('Order deleted and stock restored');}catch(err){toast(err.message||'Delete failed');}
  };

  cloud.auth.session().then(async({data})=>{
    if(data?.session){try{await enterCloud();}catch(err){console.warn(err);}}
  });
})();
