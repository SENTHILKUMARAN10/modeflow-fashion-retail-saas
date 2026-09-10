// SalesDesk catalogue enhancement. Activates only when scale migration columns exist.
(function(){
  'use strict';
  if(window.SalesDeskCatalogV1)return;window.SalesDeskCatalogV1=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let workspace=null,available=false,catalogMap=new Map(),patched=false;
  const notice=m=>typeof toast==='function'?toast(m):alert(m);
  function extras(){return{item_type:$('#sdItemType')?.value||'product',category:$('#sdCategory')?.value.trim()||null,sku:$('#sdSku')?.value.trim()||null,unit:$('#sdUnit')?.value.trim()||'pcs',track_stock:$('#sdTrackStock')?.checked!==false};}
  function applyStockMode(){const service=$('#sdItemType')?.value==='service',track=$('#sdTrackStock');if(service&&track){track.checked=false;}const disabled=track&&!track.checked;['#pStock','#pReorder'].forEach(s=>{const el=$(s);if(el){el.disabled=!!disabled;if(disabled)el.value='0';}});}
  function mountFields(){
    const form=$('#productForm');if(!form||$('#sdItemType'))return;
    const name=$('#pName')?.closest('label');if(!name)return;
    name.insertAdjacentHTML('afterend',`<div class="dialog-grid sd-catalog-fields"><label>Type<select id="sdItemType"><option value="product">Product</option><option value="service">Service</option></select></label><label>Category<input id="sdCategory" maxlength="80" placeholder="e.g. Electronics / Consulting"></label><label>SKU<input id="sdSku" maxlength="80" placeholder="Optional unique SKU"></label><label>Unit<input id="sdUnit" maxlength="30" value="pcs" placeholder="pcs / kg / hour"></label></div><label class="sd-track-stock"><input id="sdTrackStock" type="checkbox" checked> Track inventory quantity and reorder level</label>`);
    const style=document.createElement('style');style.textContent='.sd-catalog-fields{margin-top:12px}.sd-catalog-fields select{width:100%;margin-top:6px;min-height:44px;border:1px solid #ddd3c2;border-radius:10px;background:#fffdf8;padding:9px 10px;font:500 11px Plus Jakarta Sans,sans-serif}.sd-track-stock{display:flex!important;align-items:center;gap:9px;margin-top:12px;font-size:10px!important;font-weight:700!important}.sd-track-stock input{width:16px!important;height:16px!important;min-height:0!important;margin:0!important}';document.head.appendChild(style);
    $('#sdItemType').onchange=applyStockMode;$('#sdTrackStock').onchange=applyStockMode;
  }
  async function refreshMap(){if(!workspace?.id||!available)return;const {data,error}=await window.tkCloud.client.from('products').select('id,item_type,category,sku,unit,track_stock').eq('business_id',workspace.id).eq('is_active',true);if(!error){catalogMap=new Map((data||[]).map(x=>[String(x.id),x]));decorateInventory();}}
  function decorateInventory(){
    const rows=$$('#inventoryRows tr');const products=(()=>{try{return typeof store!=='undefined'?store.products||[]:[];}catch{return[];}})();rows.forEach((tr,i)=>{const p=products[i],info=p?catalogMap.get(String(p.id)):null,name=tr.querySelector('td:first-child b');if(!name||!info)return;let sub=tr.querySelector('.sd-catalog-meta');if(!sub){sub=document.createElement('div');sub.className='sd-catalog-meta muted';sub.style.cssText='font-size:9px;margin-top:4px';name.parentElement.appendChild(sub);}sub.textContent=[info.item_type==='service'?'Service':'Product',info.category,info.sku?`SKU ${info.sku}`:null,info.unit].filter(Boolean).join(' · ');});
  }
  function patchCloud(){
    if(patched||!available||!window.tkCloud?.products)return;patched=true;const c=window.tkCloud.client,p=window.tkCloud.products,oldList=p.list;
    p.list=async businessId=>{const rows=await oldList(businessId);return (rows||[]).map(x=>x.track_stock===false?{...x,stock:999999,reorder_level:0}:x);};
    p.create=(businessId,data)=>{const x=extras(),stock=x.track_stock?Number(data.stock||0):0,reorder=x.track_stock?Number(data.reorder||0):0;return c.from('products').insert({business_id:businessId,name:data.name,cost_price:data.cost,selling_price:data.price,stock,reorder_level:reorder,unit:x.unit,item_type:x.item_type,category:x.category,sku:x.sku,track_stock:x.track_stock}).select().single().then(({data,error})=>{if(error)throw error;setTimeout(refreshMap,80);return data;});};
    p.update=(id,data)=>{const x=extras(),stock=x.track_stock?Number(data.stock||0):0,reorder=x.track_stock?Number(data.reorder||0):0;return c.from('products').update({name:data.name,cost_price:data.cost,selling_price:data.price,stock,reorder_level:reorder,unit:x.unit,item_type:x.item_type,category:x.category,sku:x.sku,track_stock:x.track_stock}).eq('id',id).select().single().then(({data,error})=>{if(error)throw error;setTimeout(refreshMap,80);return data;});};
  }
  function patchEditor(){
    const old=window.editProduct;if(typeof old!=='function'||old.__salesdeskCatalog)return;
    const wrapped=async id=>{old(id);if(!available)return;const {data,error}=await window.tkCloud.client.from('products').select('item_type,category,sku,unit,track_stock').eq('id',id).single();if(error)return;mountFields();$('#sdItemType').value=data.item_type||'product';$('#sdCategory').value=data.category||'';$('#sdSku').value=data.sku||'';$('#sdUnit').value=data.unit||'pcs';$('#sdTrackStock').checked=data.track_stock!==false;applyStockMode();};wrapped.__salesdeskCatalog=true;window.editProduct=wrapped;
  }
  function patchAdd(){const add=$('#addProduct');if(!add||add.dataset.sdCatalog)return;add.dataset.sdCatalog='1';add.addEventListener('click',()=>setTimeout(()=>{if(!available)return;mountFields();$('#sdItemType').value='product';$('#sdCategory').value='';$('#sdSku').value='';$('#sdUnit').value='pcs';$('#sdTrackStock').checked=true;applyStockMode();},0));}
  function wrapRender(){try{if(typeof window.renderInventory==='function'&&!window.renderInventory.__sdCatalog){const old=window.renderInventory;const w=function(){const out=old.apply(this,arguments);queueMicrotask(decorateInventory);return out;};w.__sdCatalog=true;window.renderInventory=w;}}catch{}}
  async function activate(detail){workspace=detail||window.ModeFlowBusiness;if(!workspace?.id)return;const {error}=await window.tkCloud.client.from('products').select('id,item_type,category,sku,unit,track_stock').eq('business_id',workspace.id).limit(1);available=!error;if(!available)return;mountFields();patchCloud();patchEditor();patchAdd();wrapRender();refreshMap();}
  addEventListener('modeflow:workspace',e=>activate(e.detail));if(window.ModeFlowBusiness)setTimeout(()=>activate(window.ModeFlowBusiness),0);
})();