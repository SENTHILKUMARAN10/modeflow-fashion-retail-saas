// ModeFlow signed-in greeting fix.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud;
  const qs=s=>document.querySelector(s);
  let firstName='';

  function greeting(){
    const h=new Date().getHours();
    if(h<12) return 'Good morning';
    if(h<17) return 'Good afternoon';
    return 'Good evening';
  }

  function desiredTitle(){
    return firstName ? `${greeting()}, ${firstName}.` : '';
  }

  function render(){
    const title=qs('#title');
    if(!title || !firstName) return;
    const dashboard=qs('#dashboard');
    if(!dashboard?.classList.contains('active-view')) return;
    const next=desiredTitle();
    if(next && title.textContent!==next) title.textContent=next;
  }

  async function sync(){
    try{
      const {data}=await cloud.auth.user();
      const user=data?.user;
      if(!user) return;
      const meta=user.user_metadata||{};
      const raw=meta.full_name||meta.name||meta.display_name||user.email?.split('@')[0]||'User';
      firstName=String(raw).trim().split(/\s+/)[0]||'User';
      render();
    }catch(e){ console.warn('ModeFlow greeting sync failed',e); }
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-view="dashboard"]')) setTimeout(render,0);
  },true);

  cloud.auth.onChange((event)=>{
    if(event==='SIGNED_IN'||event==='USER_UPDATED'||event==='TOKEN_REFRESHED') setTimeout(sync,50);
    if(event==='SIGNED_OUT') firstName='';
  });
  cloud.auth.session().then(({data})=>{if(data?.session)setTimeout(sync,100);});
  setInterval(render,60000);
})();
