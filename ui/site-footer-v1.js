// Velora footer system — public pages and every in-app view, without continuous DOM observers.
(function(){
  'use strict';
  if(window.VeloraFooters) return;

  const style=document.createElement('style');
  style.id='veloraSiteFooterStyles';
  style.textContent=`
    .velora-site-footer{margin-top:64px;background:#f1eadc;border-top:1px solid #ddd3c2;color:#182019;padding:42px clamp(20px,4vw,52px) 22px;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
    .velora-site-footer__grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(250px,1.35fr) repeat(2,minmax(150px,.7fr));gap:clamp(28px,5vw,68px);align-items:start}
    .velora-site-footer__brand{max-width:430px}.velora-site-footer__logo{display:flex;align-items:center;gap:11px;text-decoration:none;color:#172f27;width:max-content}.velora-site-footer__mark{width:36px;height:36px;border-radius:11px;background:#173f34;color:#fff;display:grid;place-items:center;font-family:'DM Serif Display','Playfair Display',Georgia,serif;font-size:23px;line-height:1}.velora-site-footer__word{font-family:'DM Serif Display','Playfair Display',Georgia,serif;font-size:29px;line-height:1;letter-spacing:-.02em}.velora-site-footer__tag{margin:15px 0 0;max-width:390px;color:#5f6962;font-size:13px;line-height:1.7}.velora-site-footer__eyebrow{display:block;margin-bottom:16px;color:#7b7c72;font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.velora-site-footer__links{display:grid;gap:11px}.velora-site-footer__links a{width:max-content;max-width:100%;color:#27352e;text-decoration:none;font-size:12px;line-height:1.45;transition:color .18s ease,transform .18s ease}.velora-site-footer__links a:hover{color:#1f5b49;transform:translateX(2px)}.velora-site-footer__email{font-weight:800;color:#1f5b49!important;word-break:break-word}.velora-site-footer__bottom{max-width:1180px;margin:34px auto 0;padding-top:18px;border-top:1px solid #ddd3c2;display:flex;justify-content:space-between;gap:20px;align-items:center;color:#8a897f;font-size:10px;line-height:1.5}.velora-site-footer__bottom b{font-weight:700;color:#687069}
    #veloraLanding>.velora-site-footer{margin-top:0;padding-top:52px}#login>.velora-site-footer{margin-top:0}.view>.velora-site-footer{margin-left:calc(clamp(24px,4vw,54px) * -1);margin-right:calc(clamp(24px,4vw,54px) * -1);margin-bottom:calc(clamp(24px,4vw,54px) * -1)}
    @media(max-width:820px){.velora-site-footer{padding:36px 22px 20px}.velora-site-footer__grid{grid-template-columns:1fr 1fr;gap:30px 24px}.velora-site-footer__brand{grid-column:1/-1}.velora-site-footer__bottom{margin-top:30px;align-items:flex-start;flex-direction:column}.view>.velora-site-footer{margin-left:-18px;margin-right:-18px;margin-bottom:-18px}}
    @media(max-width:520px){.velora-site-footer__grid{grid-template-columns:1fr}.velora-site-footer__brand{grid-column:auto}.velora-site-footer__word{font-size:26px}.velora-site-footer__tag{font-size:12px}.velora-site-footer__bottom{font-size:9px}.view>.velora-site-footer{margin-left:-14px;margin-right:-14px;margin-bottom:-14px}}
  `;
  document.head.appendChild(style);

  function markup(){return `<div class="velora-site-footer__grid"><div class="velora-site-footer__brand"><a class="velora-site-footer__logo" href="/" aria-label="Velora home"><span class="velora-site-footer__mark">V</span><span class="velora-site-footer__word">Velora</span></a><p class="velora-site-footer__tag">One calm workspace for sales, customers, products or services, expenses, inventory and business performance.</p></div><div><span class="velora-site-footer__eyebrow">Product</span><nav class="velora-site-footer__links"><a href="/#how">How it works</a><a href="/#features">Features</a><a href="/#pricing">Pricing</a><a href="/#login">Sign in</a></nav></div><div><span class="velora-site-footer__eyebrow">Company</span><nav class="velora-site-footer__links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refund-policy">Refund policy</a><a class="velora-site-footer__email" href="mailto:support@velora.app">support@velora.app</a></nav></div></div><div class="velora-site-footer__bottom"><span>© 2026 Velora. All rights reserved.</span><span><b>Business, made clear.</b> Built for everyday businesses.</span></div>`;}
  function makeFooter(kind){const f=document.createElement('footer');f.className='velora-site-footer';f.dataset.veloraFooter=kind;f.innerHTML=markup();return f;}
  function ensure(container,kind){if(!container)return;if(container.querySelector(`:scope > .velora-site-footer[data-velora-footer="${kind}"]`))return;container.appendChild(makeFooter(kind));}
  function refresh(){
    const landing=document.getElementById('veloraLanding');if(landing)ensure(landing,'landing');
    const login=document.getElementById('login');if(login)ensure(login,'login');
    document.querySelectorAll('#app .view').forEach((view,i)=>ensure(view,'view-'+(view.id||i)));
  }

  window.VeloraFooters={refresh};
  refresh();
  [150,500,1200,2500].forEach(ms=>setTimeout(refresh,ms));
  addEventListener('load',refresh,{once:true});
  addEventListener('modeflow:workspace',()=>setTimeout(refresh,50));
  document.addEventListener('click',e=>{if(e.target.closest?.('.nav,[data-view],[data-go],[data-ve-login]'))setTimeout(refresh,0);},true);
})();
