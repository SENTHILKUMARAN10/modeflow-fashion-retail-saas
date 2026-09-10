(function(){
  const qs=s=>document.querySelector(s);
  const body=document.body;
  const app=qs('#app');
  const sidebar=qs('.sidebar');
  const topbar=qs('.topbar');
  if(!app||!sidebar||!topbar)return;

  let toggle=qs('.mf-drawer-toggle');
  if(!toggle){
    toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='mf-drawer-toggle';
    toggle.setAttribute('aria-label','Open navigation menu');
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='☰';
    topbar.insertBefore(toggle,topbar.firstChild);
  }

  let close=qs('.mf-drawer-close');
  if(!close){
    close=document.createElement('button');
    close.type='button';
    close.className='mf-drawer-close';
    close.setAttribute('aria-label','Close navigation menu');
    close.innerHTML='×';
    sidebar.appendChild(close);
  }

  let backdrop=qs('.mf-drawer-backdrop');
  if(!backdrop){
    backdrop=document.createElement('div');
    backdrop.className='mf-drawer-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    app.appendChild(backdrop);
  }

  function open(){
    if(innerWidth>720)return;
    body.classList.add('mf-drawer-open');
    toggle.setAttribute('aria-expanded','true');
  }
  function closeDrawer(){
    body.classList.remove('mf-drawer-open');
    toggle.setAttribute('aria-expanded','false');
  }

  toggle.addEventListener('click',()=>body.classList.contains('mf-drawer-open')?closeDrawer():open());
  close.addEventListener('click',closeDrawer);
  backdrop.addEventListener('click',closeDrawer);
  sidebar.addEventListener('click',e=>{if(e.target.closest('.nav[data-view]'))setTimeout(closeDrawer,0);});
  addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
  addEventListener('resize',()=>{if(innerWidth>720)closeDrawer();},{passive:true});
})();
