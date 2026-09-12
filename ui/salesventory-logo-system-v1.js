// Salesventory logo placement system — finite-pass version for stable rendering.
(function(){
  'use strict';
  if(window.SalesventoryLogoSystem)return;

  const FULL='/assets/salesventory-full-logo.webp';

  function ensureStyles(){
    if(document.getElementById('salesventoryLogoSystemStyles'))return;
    const s=document.createElement('style');
    s.id='salesventoryLogoSystemStyles';
    s.textContent=`
      .sv-full-lockup{display:inline-flex!important;align-items:center!important;text-decoration:none!important;background:transparent!important;border:0!important;box-shadow:none!important;overflow:visible!important}
      .sv-full-lockup>img{display:block!important;width:100%!important;height:auto!important;object-fit:contain!important;object-position:left center!important;background:transparent!important;mix-blend-mode:multiply!important}
      #veloraLanding .ve-logo.sv-full-lockup{width:230px!important;max-width:34vw!important;height:58px!important}
      #veloraLanding .ve-logo.sv-full-lockup>img{max-height:58px!important}
      body.ve-login #login .login-brand.sv-full-lockup{width:245px!important;max-width:58vw!important;height:58px!important}
      body.ve-login #login .login-brand.sv-full-lockup>img{max-height:58px!important}
      .velora-site-footer__logo.sv-full-lockup{width:min(285px,100%)!important;height:auto!important}
      .top .brand.sv-full-lockup{width:min(280px,78vw)!important;height:auto!important}
      #login>.velora-site-footer,body.ve-login #login .velora-site-footer{display:none!important}
      @media(max-width:700px){
        #veloraLanding .ve-logo.sv-full-lockup{width:190px!important;max-width:55vw!important;height:52px!important}
        body.ve-login #login .login-brand.sv-full-lockup{width:205px!important;max-width:66vw!important;height:52px!important}
        .velora-site-footer__logo.sv-full-lockup{width:245px!important;max-width:100%!important}
      }
      @media(max-width:430px){
        #veloraLanding .ve-logo.sv-full-lockup{width:168px!important;max-width:57vw!important}
        body.ve-login #login .login-brand.sv-full-lockup{width:185px!important;max-width:70vw!important}
      }
    `;
    document.head.appendChild(s);
  }

  function setFullLogo(el,label='Salesventory home'){
    if(!el)return;
    const current=el.querySelector(':scope > img[data-salesventory-full-logo]');
    if(current&&current.getAttribute('src')===FULL)return;
    el.classList.add('sv-full-lockup');
    el.setAttribute('aria-label',label);
    el.innerHTML='';
    const img=document.createElement('img');
    img.src=FULL;
    img.alt='Salesventory — Inventory today. A bigger tomorrow.';
    img.dataset.salesventoryFullLogo='1';
    el.appendChild(img);
  }

  function removeLoginFooter(){
    const login=document.getElementById('login');
    if(login)login.querySelectorAll('.velora-site-footer').forEach(f=>f.remove());
  }

  function apply(){
    ensureStyles();
    setFullLogo(document.querySelector('#veloraLanding .ve-logo'));
    setFullLogo(document.querySelector('#login .login-brand'),'Salesventory');
    document.querySelectorAll('.velora-site-footer__logo').forEach(el=>setFullLogo(el,'Salesventory home'));
    document.querySelectorAll('.top .brand').forEach(el=>setFullLogo(el,'Salesventory home'));
    removeLoginFooter();
  }

  function boot(){
    apply();
    [120,350,800,1600,3000].forEach(ms=>setTimeout(apply,ms));
    addEventListener('load',apply,{once:true});
    addEventListener('modeflow:workspace',()=>setTimeout(apply,20));
    document.addEventListener('click',e=>{if(e.target.closest?.('.nav,[data-view],[data-go],[data-ve-login]'))setTimeout(apply,30)},true);
  }

  window.SalesventoryLogoSystem={apply,removeLoginFooter,fullLogo:FULL};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();