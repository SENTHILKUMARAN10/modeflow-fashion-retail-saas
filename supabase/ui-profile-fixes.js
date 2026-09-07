// ModeFlow UI polish + authenticated profile panel.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud;
  const qs=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const css=`
  html,body{max-width:100%;overflow-x:hidden}
  .login-screen,.app{width:100%;max-width:100vw}
  .login-art,.login-panel,main{min-width:0}
  .login-copy{max-width:min(560px,calc(100% - 92px))}
  .login-copy h1{font-size:clamp(38px,4.6vw,66px);max-width:11ch}
  .fashion-card{width:176px}
  .card-one{top:118px;right:6%}.card-two{top:270px;right:20%}.card-three{top:420px;right:5%}
  .oauth-google{display:flex!important;align-items:center;justify-content:center;gap:10px;background:#f2f2f2;color:#111;border:1px solid #e4e4e4;min-height:48px;white-space:nowrap}
  .oauth-google span{width:24px;height:24px;border-radius:50%;background:#fff;display:grid;place-items:center;font-weight:800;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .header-actions{flex-wrap:nowrap;min-width:max-content}
  .profile{cursor:pointer;user-select:none;border:0;box-shadow:0 0 0 0 rgba(0,0,0,0);transition:.18s ease}
  .profile:hover,.profile:focus{transform:translateY(-1px);box-shadow:0 0 0 3px rgba(31,30,26,.10);outline:none}
  .mf-profile-dialog{width:min(430px,calc(100vw - 28px));border:0;border-radius:22px;padding:0;overflow:hidden;background:#fff;color:#171713;box-shadow:0 30px 90px rgba(0,0,0,.25)}
  .mf-profile-dialog::backdrop{background:rgba(16,15,13,.55);backdrop-filter:blur(3px)}
  .mf-profile-card{padding:24px}.mf-profile-head{display:flex;align-items:center;gap:14px;margin-bottom:20px}.mf-profile-avatar{width:58px;height:58px;border-radius:18px;background:#1f1e1a;color:#fff;display:grid;place-items:center;font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:18px;overflow:hidden}.mf-profile-avatar img{width:100%;height:100%;object-fit:cover}.mf-profile-head h3{margin:0 0 4px;font-family:'Plus Jakarta Sans',sans-serif;font-size:22px}.mf-profile-head p{margin:0;color:#817a70;font-size:12px}.mf-profile-grid{display:grid;gap:10px}.mf-profile-row{padding:13px 14px;border:1px solid #ebe7df;border-radius:13px;background:#faf9f6}.mf-profile-row small{display:block;color:#8a8379;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}.mf-profile-row strong{font-size:13px;word-break:break-word}.mf-profile-actions{display:flex;gap:10px;margin-top:18px}.mf-profile-actions button{flex:1}.mf-profile-close{position:absolute;right:14px;top:14px;width:34px;height:34px;border:0;border-radius:10px;background:#f1efea;cursor:pointer;font-size:18px}
  @media(max-width:1280px){.fashion-card{display:none}.login-copy{max-width:min(620px,calc(100% - 70px))}.login-copy h1{max-width:12ch}.login-art{padding-left:36px;padding-right:36px}.login-copy{left:36px}}
  @media(max-width:900px){.login-screen{grid-template-columns:1fr}.login-art{display:none}.login-panel{min-height:100dvh;padding:28px 22px}.mobile-brand{display:flex!important}.login-box{width:min(520px,100%)}.login-box h2{font-size:clamp(30px,8vw,40px)}.app{grid-template-columns:74px minmax(0,1fr)}main{padding-left:18px;padding-right:18px}header{min-height:82px}.hero-grid,.two-col,.billing-grid,.expenses-grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.spotlight{min-height:230px}}
  @media(max-width:620px){main{padding:0 12px 28px}.app{grid-template-columns:64px minmax(0,1fr)}.sidebar{padding-left:7px;padding-right:7px}.header-actions{gap:7px}.header-actions .btn.primary{padding:11px 12px;font-size:11px}.icon-btn{width:39px;height:39px}.profile{width:39px;height:39px}header h2{font-size:22px}.metrics{grid-template-columns:1fr}.hero-card{min-height:220px;padding:22px}.hero-card h3{font-size:34px}.spotlight{padding:20px}.form-grid{grid-template-columns:1fr}.form-grid .span2{grid-column:auto}.section-intro.row,.panel-head{align-items:flex-start;flex-direction:column}.search-input{max-width:none}.oauth-google{font-size:14px}.login-panel{padding:24px 18px}.login-box h2{font-size:32px}}
  @media(max-width:420px){.header-actions .icon-btn{display:none}.header-actions .btn.primary{padding:10px 11px}.profile{width:36px;height:36px}.login-box h2{font-size:29px}}
  `;
  const style=document.createElement('style');style.id='modeflow-ui-profile-fixes';style.textContent=css;document.head.appendChild(style);

  const profile=qs('.profile');
  if(profile){profile.setAttribute('role','button');profile.setAttribute('tabindex','0');profile.setAttribute('aria-label','Open profile');profile.title='Profile';}
  const exportBtn=qs('#exportData');if(exportBtn){exportBtn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';exportBtn.setAttribute('aria-label','Export data');}

  const dialog=document.createElement('dialog');dialog.id='modeflowProfile';dialog.className='mf-profile-dialog';dialog.innerHTML='<button class="mf-profile-close" type="button" aria-label="Close profile">×</button><div class="mf-profile-card"><div class="mf-profile-head"><div class="mf-profile-avatar" id="mfProfileAvatar">MF</div><div><h3 id="mfProfileName">ModeFlow user</h3><p id="mfProfileProvider">Secure account</p></div></div><div class="mf-profile-grid"><div class="mf-profile-row"><small>Email</small><strong id="mfProfileEmail">—</strong></div><div class="mf-profile-row"><small>Workspace</small><strong id="mfProfileWorkspace">ModeFlow Store</strong></div><div class="mf-profile-row"><small>Access</small><strong id="mfProfileRole">Cloud member</strong></div></div><div class="mf-profile-actions"><button id="mfCloseProfile" type="button" class="btn ghost">Close</button><button id="mfProfileLogout" type="button" class="btn dark">Sign out</button></div></div>';
  document.body.appendChild(dialog);
  const close=()=>dialog.open&&dialog.close();qs('.mf-profile-close').onclick=close;qs('#mfCloseProfile').onclick=close;dialog.addEventListener('click',e=>{if(e.target===dialog)close();});

  function initials(name,email){const raw=(name||email?.split('@')[0]||'MF').trim();const parts=raw.split(/\s+/).filter(Boolean);return ((parts[0]?.[0]||'M')+(parts.length>1?(parts.at(-1)?.[0]||''):'')).toUpperCase();}
  async function syncProfile(){
    try{
      const {data}=await cloud.auth.user();const user=data?.user;if(!user)return;
      const meta=user.user_metadata||{};const name=meta.full_name||meta.name||meta.display_name||user.email?.split('@')[0]||'ModeFlow user';const email=user.email||'No email available';const provider=user.app_metadata?.provider||'email';const avatar=meta.avatar_url||meta.picture||'';const init=initials(name,email);
      const p=qs('.profile');if(p)p.textContent=init;
      const title=qs('#title');if(title&&/Good (morning|afternoon|evening)/i.test(title.textContent)){const hour=new Date().getHours(),g=hour<12?'morning':hour<17?'afternoon':'evening';title.textContent=`Good ${g}, ${name.split(/\s+/)[0]}.`;}
      qs('#mfProfileName').textContent=name;qs('#mfProfileEmail').textContent=email;qs('#mfProfileProvider').textContent=provider==='google'?'Signed in with Google':'Signed in with email';
      const av=qs('#mfProfileAvatar');av.innerHTML=avatar?`<img src="${esc(avatar)}" alt="">`:esc(init);
      const store=qs('.store-card b')?.textContent?.trim();if(store)qs('#mfProfileWorkspace').textContent=store;
      const badge=qs('#modeBadge')?.textContent||'';qs('#mfProfileRole').textContent=badge.replace(/^Cloud\s*·\s*/i,'')||'Cloud member';
    }catch(e){console.warn('ModeFlow profile sync failed',e);}
  }
  const open=async()=>{await syncProfile();dialog.showModal();};if(profile){profile.onclick=open;profile.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};}
  qs('#mfProfileLogout').onclick=async()=>{close();const logout=qs('#logout');if(logout)logout.click();else await cloud.auth.signOut();};
  cloud.auth.onChange((event)=>{if(event==='SIGNED_IN'||event==='USER_UPDATED')setTimeout(syncProfile,100);});
  cloud.auth.session().then(({data})=>{if(data?.session)setTimeout(syncProfile,250);});
})();
