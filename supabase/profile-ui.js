// Signed-in user profile UI for ModeFlow.
(function(){
  const qs=s=>document.querySelector(s);
  const cloud=window.tkCloud;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const initials=name=>{const parts=String(name||'ModeFlow User').trim().split(/\s+/).filter(Boolean);return ((parts[0]?.[0]||'M')+(parts[1]?.[0]||'')).toUpperCase();};

  function ensureDialog(){
    let dialog=qs('#profileDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='profileDialog';
    dialog.innerHTML='<div class="profile-card"><div id="profileContent"></div><div class="profile-actions"><button type="button" class="btn ghost profile-close">Close</button><button type="button" class="btn primary" id="profileSignOut">Sign out</button></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('.profile-close').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    dialog.querySelector('#profileSignOut').onclick=()=>qs('#logout')?.click();
    return dialog;
  }

  async function getUser(){
    if(!cloud?.auth?.user)return null;
    try{const {data}=await cloud.auth.user();return data?.user||null;}catch{return null;}
  }

  async function syncProfile(){
    const user=await getUser();
    const chip=qs('header .profile');
    if(!chip)return;
    if(!user){chip.textContent='MF';chip.title='Profile';return;}
    const meta=user.user_metadata||{};
    const name=meta.full_name||meta.name||user.email?.split('@')[0]||'ModeFlow User';
    chip.textContent=initials(name);
    chip.title=`Profile · ${user.email||name}`;
    chip.setAttribute('role','button');chip.setAttribute('tabindex','0');chip.setAttribute('aria-label','Open profile');
    const title=qs('#title');if(title)title.textContent=`Good ${new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, ${name.split(/\s+/)[0]}.`;
  }

  async function openProfile(){
    const dialog=ensureDialog();
    const content=dialog.querySelector('#profileContent');
    const user=await getUser();
    if(!user){content.innerHTML='<p class="muted">You are not currently signed in to the cloud workspace.</p>';dialog.querySelector('#profileSignOut').style.display='none';dialog.showModal();return;}
    dialog.querySelector('#profileSignOut').style.display='';
    const meta=user.user_metadata||{};
    const name=meta.full_name||meta.name||user.email?.split('@')[0]||'ModeFlow User';
    const avatar=meta.avatar_url||meta.picture||'';
    const provider=user.app_metadata?.provider||'email';
    const avatarHtml=avatar?`<img src="${esc(avatar)}" alt="${esc(name)}">`:esc(initials(name));
    content.innerHTML=`<div class="profile-top"><div class="profile-avatar-large">${avatarHtml}</div><div><h3>${esc(name)}</h3><p>ModeFlow account</p></div></div><div class="profile-info"><div class="profile-row"><span>Email</span><b>${esc(user.email||'Not available')}</b></div><div class="profile-row"><span>Signed in with</span><b>${esc(provider==='google'?'Google':provider.charAt(0).toUpperCase()+provider.slice(1))}</b></div><div class="profile-row"><span>Account status</span><b>${user.email_confirmed_at?'Verified':'Verification pending'}</b></div></div>`;
    dialog.showModal();
  }

  function bind(){
    const chip=qs('header .profile');if(!chip)return;
    chip.addEventListener('click',openProfile);
    chip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProfile();}});
    syncProfile();
    cloud?.auth?.onChange?.(()=>setTimeout(syncProfile,50));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
