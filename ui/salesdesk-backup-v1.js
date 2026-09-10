// SalesDesk self-service workspace backup export.
// This is a client-owned data export, not a replacement for infrastructure backups/PITR.
(function(){
  'use strict';
  if(window.SalesDeskWorkspaceBackup)return;window.SalesDeskWorkspaceBackup=true;
  const $=s=>document.querySelector(s);
  let workspace=null,busy=false;
  const notice=m=>typeof toast==='function'?toast(m):alert(m);
  const safeName=s=>String(s||'salesdesk-business').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'salesdesk-business';

  function mount(){
    const shell=$('#business-settings .sd-settings-shell');if(!shell||$('#sdBackupCard'))return;
    shell.insertAdjacentHTML('beforeend',`<article class="sd-settings-card" id="sdBackupCard"><p class="kicker">DATA & BACKUP</p><h3>Keep a copy of your business data.</h3><p>Download a portable JSON backup containing the records your current workspace can access. Use this for your own records or migration support.</p><div class="sd-security-list"><div class="sd-security-row"><span>Format</span><b>JSON</b></div><div class="sd-security-row"><span>Isolation</span><b class="sd-good">Current workspace only</b></div><div class="sd-security-row"><span>Secrets</span><b class="sd-good">Not included</b></div></div><div class="sd-settings-actions"><button class="btn secondary" id="sdDownloadBackup" type="button">Download workspace backup</button><span id="sdBackupStatus" class="sd-muted"></span></div><p class="sd-owner-note">This export does not replace SalesDesk infrastructure backups. Production database backup and restore procedures remain a separate operations control.</p></article>`);
    $('#sdDownloadBackup').onclick=downloadBackup;
  }

  async function query(table,select='*',extra=q=>q){
    const c=window.tkCloud?.client;if(!c||!workspace?.id)return[];
    let q=c.from(table).select(select);
    if(table==='purchase_items'){
      // Purchase items inherit tenant access through their parent purchase RLS.
      q=q.order('id',{ascending:true});
    }else if(table!=='business_subscriptions'){
      q=q.eq('business_id',workspace.id);
    }else q=q.eq('business_id',workspace.id);
    const {data,error}=await extra(q);
    if(error){if(error.code==='42P01'||/does not exist|schema cache/i.test(error.message||''))return[];throw error;}
    return data||[];
  }

  async function downloadBackup(){
    if(busy||!workspace?.id)return;busy=true;
    const btn=$('#sdDownloadBackup'),status=$('#sdBackupStatus');if(btn){btn.disabled=true;btn.textContent='Preparing backup…';}if(status)status.textContent='Reading protected workspace data…';
    try{
      const c=window.tkCloud.client;
      const {data:business,error:businessError}=await c.from('businesses').select('*').eq('id',workspace.id).single();if(businessError)throw businessError;
      const purchases=await query('purchases');
      let purchaseItems=[];
      if(purchases.length){
        const ids=purchases.map(x=>x.id);const {data,error}=await c.from('purchase_items').select('*').in('purchase_id',ids);if(!error)purchaseItems=data||[];else if(!(error.code==='42P01'||/does not exist|schema cache/i.test(error.message||'')))throw error;
      }
      const [products,customers,invoices,invoiceItems,expenses,stockMovements,suppliers,invoicePayments,subscriptions]=await Promise.all([
        query('products'),query('customers'),query('invoices'),
        (async()=>{const inv=await query('invoices','id');if(!inv.length)return[];const {data,error}=await c.from('invoice_items').select('*').in('invoice_id',inv.map(x=>x.id));if(error)throw error;return data||[];})(),
        query('expenses'),query('stock_movements'),query('suppliers'),query('invoice_payments'),query('business_subscriptions')
      ]);
      const backup={
        format:'salesdesk-workspace-backup',version:1,exportedAt:new Date().toISOString(),
        workspace:{id:workspace.id,role:workspace.role||null,business},
        data:{products,customers,invoices,invoice_items:invoiceItems,expenses,stock_movements:stockMovements,suppliers,purchases,purchase_items:purchaseItems,invoice_payments:invoicePayments,business_subscriptions:subscriptions}
      };
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      const date=new Date().toISOString().slice(0,10);a.href=url;a.download=`${safeName(business?.name)}-salesdesk-backup-${date}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      if(status)status.textContent='Backup downloaded successfully.';notice('Workspace backup downloaded');
    }catch(error){console.error(error);if(status)status.textContent='Backup failed.';notice(error.message||'Unable to create workspace backup');window.SalesDeskReportError?.(error.message,error.stack,'workspace-backup');}
    finally{busy=false;if(btn){btn.disabled=false;btn.textContent='Download workspace backup';}}
  }

  function activate(detail){workspace=detail||window.ModeFlowBusiness;mount();}
  addEventListener('modeflow:workspace',e=>activate(e.detail));document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="business-settings"]'))setTimeout(mount,0);},true);
  if(window.ModeFlowBusiness)setTimeout(()=>activate(window.ModeFlowBusiness),0);else setTimeout(mount,1500);
})();
