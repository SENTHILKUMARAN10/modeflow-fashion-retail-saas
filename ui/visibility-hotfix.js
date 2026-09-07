// ModeFlow redesign visibility hotfix.
(function(){
  const style=document.createElement('style');
  style.id='modeflow-visibility-hotfix';
  style.textContent=`
    .login-screen.hidden,.app.hidden{display:none!important}
    body:not(.mf-authenticated) #app{display:none!important}
    body.mf-authenticated #login{display:none!important}
  `;
  document.head.appendChild(style);

  function setAuthUI(signedIn){
    document.body.classList.toggle('mf-authenticated',!!signedIn);
    const login=document.querySelector('#login');
    const app=document.querySelector('#app');
    if(signedIn){
      login?.classList.add('hidden');
      app?.classList.remove('hidden');
    }else{
      app?.classList.add('hidden');
      login?.classList.remove('hidden');
    }
  }

  if(window.tkCloud?.enabled){
    window.tkCloud.auth.session().then(({data})=>setAuthUI(!!data?.session)).catch(()=>setAuthUI(false));
    window.tkCloud.auth.onChange((event,session)=>{
      if(event==='SIGNED_OUT') setAuthUI(false);
      if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED') setAuthUI(!!session);
    });
  }else setAuthUI(false);
})();
