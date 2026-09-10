// Premium public-site footer for Velora.
(function(){
  'use strict';
  if(document.getElementById('veloraSiteFooter')) return;

  const style=document.createElement('style');
  style.id='veloraSiteFooterStyles';
  style.textContent=`
    .velora-site-footer{background:#f4efe4;border-top:1px solid #ddd3c2;color:#182019;padding:58px clamp(24px,6vw,88px) 26px;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
    .velora-site-footer__grid{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:minmax(280px,1.45fr) repeat(2,minmax(180px,.72fr));gap:clamp(34px,6vw,92px);align-items:start}
    .velora-site-footer__brand{max-width:460px}
    .velora-site-footer__logo{display:flex;align-items:center;gap:12px;text-decoration:none;color:#172f27;width:max-content}
    .velora-site-footer__mark{width:38px;height:38px;border-radius:11px;background:#173f34;color:#fff;display:grid;place-items:center;font-family:'DM Serif Display','Playfair Display',Georgia,serif;font-size:24px;line-height:1}
    .velora-site-footer__word{font-family:'DM Serif Display','Playfair Display',Georgia,serif;font-size:30px;line-height:1;letter-spacing:-.02em}
    .velora-site-footer__tag{margin:18px 0 0;max-width:390px;color:#5f6962;font-size:15px;line-height:1.75}
    .velora-site-footer__eyebrow{display:block;margin-bottom:19px;color:#7b7c72;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
    .velora-site-footer__links{display:grid;gap:14px}
    .velora-site-footer__links a{width:max-content;max-width:100%;color:#27352e;text-decoration:none;font-size:14px;line-height:1.45;transition:color .18s ease,transform .18s ease}
    .velora-site-footer__links a:hover{color:#1f5b49;transform:translateX(2px)}
    .velora-site-footer__email{font-weight:700;color:#1f5b49!important;word-break:break-word}
    .velora-site-footer__bottom{max-width:1280px;margin:46px auto 0;padding-top:22px;border-top:1px solid #ddd3c2;display:flex;justify-content:space-between;gap:20px;align-items:center;color:#8a897f;font-size:11px;line-height:1.5}
    .velora-site-footer__bottom b{font-weight:700;color:#687069}
    #app:not(.hidden)~.velora-site-footer{display:none}
    @media(max-width:820px){.velora-site-footer{padding:44px 22px 22px}.velora-site-footer__grid{grid-template-columns:1fr 1fr;gap:38px 28px}.velora-site-footer__brand{grid-column:1/-1}.velora-site-footer__bottom{margin-top:38px;align-items:flex-start;flex-direction:column}}
    @media(max-width:520px){.velora-site-footer__grid{grid-template-columns:1fr}.velora-site-footer__brand{grid-column:auto}.velora-site-footer__word{font-size:27px}.velora-site-footer__tag{font-size:14px}.velora-site-footer__bottom{font-size:10px}}
  `;
  document.head.appendChild(style);

  const footer=document.createElement('footer');
  footer.id='veloraSiteFooter';
  footer.className='velora-site-footer';
  footer.innerHTML=`
    <div class="velora-site-footer__grid">
      <div class="velora-site-footer__brand">
        <a class="velora-site-footer__logo" href="/" aria-label="Velora home">
          <span class="velora-site-footer__mark">V</span>
          <span class="velora-site-footer__word">Velora</span>
        </a>
        <p class="velora-site-footer__tag">One calm workspace for sales, customers, products or services, expenses, inventory and business performance.</p>
      </div>
      <div>
        <span class="velora-site-footer__eyebrow">Product</span>
        <nav class="velora-site-footer__links" aria-label="Product links">
          <a href="/#login">Business workspace</a>
          <a href="/#login">Sales & invoices</a>
          <a href="/#login">Inventory tracking</a>
          <a href="/#login">Business analytics</a>
        </nav>
      </div>
      <div>
        <span class="velora-site-footer__eyebrow">Company</span>
        <nav class="velora-site-footer__links" aria-label="Company links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund-policy">Refund policy</a>
          <a class="velora-site-footer__email" href="mailto:support@velora.app">support@velora.app</a>
        </nav>
      </div>
    </div>
    <div class="velora-site-footer__bottom">
      <span>© 2026 Velora. All rights reserved.</span>
      <span><b>Business, made clear.</b> Built for everyday businesses.</span>
    </div>`;
  document.body.appendChild(footer);
})();