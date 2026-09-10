// Velora public landing page + minimal authentication experience.
(function(){
  'use strict';
  if(document.getElementById('veloraPublicExperienceStyles')) return;

  const style=document.createElement('style');
  style.id='veloraPublicExperienceStyles';
  style.textContent=`
    :root{--vl-ink:#17251f;--vl-green:#173f34;--vl-green2:#1f5b49;--vl-green3:#2f765f;--vl-beige:#f4efe4;--vl-paper:#fffaf0;--vl-line:#ded4c3;--vl-muted:#687169}
    html{scroll-behavior:smooth}
    body.velora-landing-active #login{display:none!important}
    body.velora-landing-active #app{display:none!important}
    body.velora-login-active #veloraLanding{display:none!important}
    #veloraLanding{background:var(--vl-beige);color:var(--vl-ink);font-family:'Plus Jakarta Sans',system-ui,sans-serif;min-height:100vh}
    .vl-wrap{width:min(1180px,calc(100% - 44px));margin:auto}
    .vl-nav{position:sticky;top:0;z-index:50;background:rgba(244,239,228,.94);backdrop-filter:blur(18px);border-bottom:1px solid rgba(222,212,195,.9)}
    .vl-navin{height:76px;display:flex;align-items:center;justify-content:space-between;gap:24px}
    .vl-logo{display:flex;align-items:center;gap:11px;color:var(--vl-ink);text-decoration:none}
    .vl-logo-mark{width:38px;height:38px;border-radius:12px;background:var(--vl-green);color:#fff;display:grid;place-items:center;font:400 24px/1 'DM Serif Display','Playfair Display',Georgia,serif}
    .vl-logo-word{font:400 30px/1 'DM Serif Display','Playfair Display',Georgia,serif;letter-spacing:-.025em}
    .vl-navlinks{display:flex;align-items:center;gap:27px}.vl-navlinks a{color:#4e5a53;text-decoration:none;font-size:13px;font-weight:600}.vl-navlinks a:hover{color:var(--vl-green2)}
    .vl-actions{display:flex;gap:10px;align-items:center}.vl-btn{appearance:none;border:1px solid var(--vl-line);border-radius:13px;padding:12px 18px;font:700 13px 'Plus Jakarta Sans',sans-serif;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;transition:.2s ease;background:transparent;color:var(--vl-ink)}.vl-btn:hover{transform:translateY(-1px)}.vl-btn.primary{background:var(--vl-green);border-color:var(--vl-green);color:#fff;box-shadow:0 10px 30px rgba(23,63,52,.16)}
    .vl-hero{padding:92px 0 72px;overflow:hidden}.vl-hero-grid{display:grid;grid-template-columns:minmax(0,1.04fr) minmax(420px,.96fr);gap:64px;align-items:center}.vl-eyebrow{font-size:10px;letter-spacing:.18em;font-weight:800;color:var(--vl-green2);text-transform:uppercase}.vl-hero h1{margin:16px 0 22px;max-width:760px;font:400 clamp(50px,6.5vw,82px)/.95 'DM Serif Display','Playfair Display',Georgia,serif;letter-spacing:-.045em}.vl-hero h1 em{color:var(--vl-green2);font-weight:400}.vl-hero-lede{max-width:650px;color:#566159;font-size:17px;line-height:1.75;margin:0}.vl-hero-buttons{display:flex;gap:12px;margin-top:30px;flex-wrap:wrap}.vl-proof{display:flex;gap:26px;flex-wrap:wrap;margin-top:34px;color:#6c756e;font-size:11px;font-weight:700}.vl-proof span:before{content:'✓';color:var(--vl-green2);margin-right:7px}
    .vl-product-card{position:relative;background:var(--vl-paper);border:1px solid var(--vl-line);border-radius:30px;padding:22px;box-shadow:0 34px 90px rgba(32,55,45,.13)}.vl-product-top{background:linear-gradient(145deg,#153a30,#1f5b49 64%,#347e66);border-radius:21px;color:white;padding:28px}.vl-product-top small{font-size:9px;letter-spacing:.16em;font-weight:800;color:#d5e5dd}.vl-product-top h3{font:400 32px/1.04 'DM Serif Display',serif;margin:9px 0 18px}.vl-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.vl-metric{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:13px;padding:12px}.vl-metric span{display:block;font-size:8px;letter-spacing:.1em;color:#d8e5df}.vl-metric strong{display:block;margin-top:5px;font-size:17px}.vl-card-body{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.vl-mini{background:#f6efe3;border:1px solid #e7ddcc;border-radius:16px;padding:16px}.vl-mini small{font-size:8px;letter-spacing:.12em;color:#7d8178}.vl-mini strong{display:block;margin-top:8px;font:400 21px 'DM Serif Display',serif}.vl-mini p{margin:5px 0 0;color:#737b74;font-size:10px;line-height:1.45}
    .vl-section{padding:84px 0;border-top:1px solid var(--vl-line)}.vl-section-head{max-width:760px;margin-bottom:40px}.vl-section-head h2{margin:12px 0 12px;font:400 clamp(38px,5vw,58px)/1 'DM Serif Display',serif;letter-spacing:-.035em}.vl-section-head p{margin:0;color:#626c65;line-height:1.75;font-size:15px}.vl-how{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.vl-step{background:var(--vl-paper);border:1px solid var(--vl-line);border-radius:20px;padding:22px}.vl-step-num{width:34px;height:34px;border-radius:11px;background:#e7eee9;color:var(--vl-green2);display:grid;place-items:center;font-size:11px;font-weight:800}.vl-step h3{margin:20px 0 8px;font:400 22px 'DM Serif Display',serif}.vl-step p{margin:0;color:#69736c;font-size:12px;line-height:1.65}
    .vl-benefits{display:grid;grid-template-columns:1.05fr .95fr;gap:16px}.vl-benefit-large{background:var(--vl-green);color:#fff;border-radius:28px;padding:34px}.vl-benefit-large h3{font:400 39px/1 'DM Serif Display',serif;margin:10px 0 16px}.vl-benefit-large p{color:#d7e3dd;line-height:1.75;margin:0}.vl-benefit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.vl-benefit{background:var(--vl-paper);border:1px solid var(--vl-line);border-radius:20px;padding:21px}.vl-benefit b{display:block;font:400 21px 'DM Serif Display',serif;margin-bottom:8px}.vl-benefit span{color:#6c756f;font-size:12px;line-height:1.6}
    .vl-usecases{display:flex;gap:10px;flex-wrap:wrap}.vl-usecases span{padding:11px 14px;border-radius:999px;background:#ebe3d5;border:1px solid #ded2bf;color:#435047;font-size:12px;font-weight:700}
    .vl-pricing{display:grid;grid-template-columns:.8fr 1.2fr;gap:34px;align-items:stretch}.vl-price-intro{padding:14px 4px}.vl-price-intro h2{font:400 50px/1 'DM Serif Display',serif;margin:10px 0 16px}.vl-price-card{background:linear-gradient(145deg,#153a30,#1f5b49 62%,#2f765f);border-radius:30px;padding:34px;color:#fff;box-shadow:0 28px 70px rgba(23,63,52,.18)}.vl-price-card .vl-eyebrow{color:#cfe0d8}.vl-plan-toggle{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:22px}.vl-plan{border:1px solid rgba(255,255,255,.17);background:rgba(255,255,255,.08);border-radius:18px;padding:18px}.vl-plan.featured{background:#f2e7d4;color:var(--vl-ink);border-color:#f2e7d4}.vl-plan span{font-size:10px;letter-spacing:.12em;font-weight:800}.vl-plan strong{display:block;margin-top:10px;font:400 35px/1 'DM Serif Display',serif}.vl-plan small{display:block;margin-top:7px;opacity:.72}.vl-plan-list{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin:27px 0 0;padding:0;list-style:none}.vl-plan-list li{font-size:12px;color:#d9e6df}.vl-plan-list li:before{content:'✓';margin-right:8px}.vl-price-cta{margin-top:26px;width:100%;background:#f2e7d4!important;color:var(--vl-green)!important;border-color:#f2e7d4!important}
    .vl-cta{padding:85px 0}.vl-cta-box{background:var(--vl-paper);border:1px solid var(--vl-line);border-radius:30px;padding:54px;text-align:center}.vl-cta-box h2{margin:10px auto 15px;max-width:760px;font:400 clamp(38px,5vw,58px)/1 'DM Serif Display',serif}.vl-cta-box p{max-width:650px;margin:0 auto 25px;color:#68726b;line-height:1.7}
    /* Minimal login inspired by the user's reference */
    body.velora-login-active{background:var(--vl-beige)}
    body.velora-login-active #login.login-screen{display:block!important;min-height:100vh;background:var(--vl-beige)!important;color:var(--vl-ink)!important;padding:0!important}
    body.velora-login-active .login-brandbar{height:74px;max-width:920px;margin:0 auto;padding:0 20px!important;background:transparent!important;border-bottom:1px solid var(--vl-line);display:flex!important;align-items:center;justify-content:space-between}
    body.velora-login-active .login-brand{color:var(--vl-ink)!important;text-decoration:none;gap:9px}body.velora-login-active .login-brand .brand-mark{background:var(--vl-green)!important;color:#fff!important;border-radius:10px!important;width:32px!important;height:32px!important;display:grid!important;place-items:center!important}body.velora-login-active .login-brand strong{font:400 25px/1 'DM Serif Display',serif!important}
    body.velora-login-active .brand-note{font-size:9px!important;letter-spacing:.15em!important;color:#7b8077!important}
    body.velora-login-active .login-stage{display:block!important;min-height:calc(100vh - 74px);padding:68px 20px 72px!important;background:transparent!important}
    body.velora-login-active .login-story{display:none!important}
    body.velora-login-active .login-panel{width:min(100%,440px)!important;margin:0 auto!important;padding:0!important;background:transparent!important;display:block!important}
    body.velora-login-active .login-box{width:100%!important;max-width:none!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;border-radius:0!important;color:var(--vl-ink)!important}
    body.velora-login-active .login-box>.kicker{display:none!important}
    body.velora-login-active .login-box h2{font:400 42px/1.02 'DM Serif Display',serif!important;letter-spacing:-.03em!important;margin:0 0 10px!important;color:var(--vl-ink)!important}
    body.velora-login-active .login-box .subtext{color:#626c65!important;font-size:13px!important;line-height:1.65!important;margin:0 0 28px!important}
    body.velora-login-active .oauth-google{height:52px!important;border:1px solid #d9cfbd!important;border-radius:12px!important;background:var(--vl-paper)!important;color:#253229!important;font-weight:700!important;box-shadow:none!important;margin-bottom:18px!important}
    body.velora-login-active .oauth-google span{font-weight:800;margin-right:8px;color:#4285f4}
    body.velora-login-active .divider{margin:2px 0 18px!important;color:#99988e!important;font-size:9px!important;letter-spacing:.16em!important}
    body.velora-login-active #cloudLogin{gap:14px!important}
    body.velora-login-active #cloudLogin label{font-size:11px!important;font-weight:700!important;color:#424d46!important}
    body.velora-login-active #cloudLogin input{height:52px!important;margin-top:7px!important;border:1px solid #d9cfbd!important;border-radius:11px!important;background:var(--vl-paper)!important;color:var(--vl-ink)!important;padding:0 14px!important;font:500 14px 'Plus Jakarta Sans',sans-serif!important;box-shadow:none!important}
    body.velora-login-active #cloudLogin>.btn.primary{height:52px!important;border-radius:11px!important;background:#17251f!important;border-color:#17251f!important;color:#fff!important;font-weight:800!important;margin-top:3px!important}
    body.velora-login-active #resetPassword,body.velora-login-active #resendVerification{background:none!important;border:0!important;padding:3px 0!important;font-size:10px!important;color:#657169!important;text-align:left!important;width:max-content!important;box-shadow:none!important}
    body.velora-login-active #demoLogin{display:block!important;background:none!important;border:0!important;box-shadow:none!important;color:#526159!important;padding:8px 0!important;margin:15px auto 0!important;width:auto!important;height:auto!important;font-size:11px!important;font-weight:700!important}
    body.velora-login-active #cloudStatus{margin-top:18px!important;text-align:center!important;color:#7b817b!important;font-size:10px!important}
    body.velora-login-active .login-foot{margin-top:12px!important;text-align:center!important;color:#9a998f!important;font-size:9px!important;letter-spacing:.07em!important}
    @media(max-width:900px){.vl-navlinks{display:none}.vl-hero{padding-top:66px}.vl-hero-grid,.vl-benefits,.vl-pricing{grid-template-columns:1fr}.vl-product-card{max-width:650px}.vl-how{grid-template-columns:1fr 1fr}.vl-price-card{max-width:720px}}
    @media(max-width:560px){.vl-wrap{width:min(100% - 28px,1180px)}.vl-navin{height:66px}.vl-actions .vl-btn:first-child{display:none}.vl-btn{padding:11px 14px}.vl-hero{padding:55px 0 52px}.vl-hero-grid{gap:38px}.vl-hero h1{font-size:49px}.vl-hero-lede{font-size:15px}.vl-product-card{padding:12px;border-radius:23px}.vl-product-top{padding:22px;border-radius:17px}.vl-product-top h3{font-size:28px}.vl-metrics{grid-template-columns:1fr}.vl-card-body,.vl-how,.vl-benefit-grid,.vl-plan-toggle,.vl-plan-list{grid-template-columns:1fr}.vl-section{padding:62px 0}.vl-cta{padding:62px 0}.vl-cta-box{padding:34px 20px}.vl-price-card{padding:25px 20px}.vl-nav .vl-logo-word{font-size:26px}body.velora-login-active .login-stage{padding-top:48px!important}body.velora-login-active .login-box h2{font-size:36px!important}}
  `;
  document.head.appendChild(style);

  const landing=document.createElement('section');
  landing.id='veloraLanding';
  landing.innerHTML=`
    <nav class="vl-nav"><div class="vl-wrap vl-navin">
      <a class="vl-logo" href="#"><span class="vl-logo-mark">V</span><span class="vl-logo-word">Velora</span></a>
      <div class="vl-navlinks"><a href="#how">How it works</a><a href="#benefits">Benefits</a><a href="#features">Features</a><a href="#pricing">Pricing</a></div>
      <div class="vl-actions"><button class="vl-btn" data-vl-login>Sign in</button><button class="vl-btn primary" data-vl-login>Get started</button></div>
    </div></nav>
    <header class="vl-hero"><div class="vl-wrap vl-hero-grid">
      <div><div class="vl-eyebrow">ONE WORKSPACE · EVERY BUSINESS</div><h1>Know your business.<br><em>Grow with clarity.</em></h1><p class="vl-hero-lede">Velora brings sales, customers, products or services, inventory, expenses and performance into one calm cloud workspace — so you spend less time chasing numbers and more time growing the business.</p><div class="vl-hero-buttons"><button class="vl-btn primary" data-vl-login>Start with Velora</button><a class="vl-btn" href="#how">See how it works</a></div><div class="vl-proof"><span>Products or services</span><span>Cloud workspace</span><span>Mobile & desktop</span></div></div>
      <div class="vl-product-card"><div class="vl-product-top"><small>BUSINESS OVERVIEW</small><h3>Everything important, without the noise.</h3><div class="vl-metrics"><div class="vl-metric"><span>NET SALES</span><strong>₹86,420</strong></div><div class="vl-metric"><span>TRANSACTIONS</span><strong>128</strong></div><div class="vl-metric"><span>STOCK ALERTS</span><strong>4</strong></div></div></div><div class="vl-card-body"><div class="vl-mini"><small>BUSINESS HEALTH</small><strong>Stay ahead.</strong><p>See sales, expenses and stock signals before they become problems.</p></div><div class="vl-mini"><small>CUSTOMERS</small><strong>Know who returns.</strong><p>Keep customer activity and purchase history connected to every sale.</p></div></div></div>
    </div></header>
    <section class="vl-section" id="how"><div class="vl-wrap"><div class="vl-section-head"><div class="vl-eyebrow">HOW VELORA WORKS</div><h2>From daily activity to business clarity.</h2><p>Velora is designed for real everyday operations. Record what happens once, then let the workspace connect the rest.</p></div><div class="vl-how">
      <article class="vl-step"><span class="vl-step-num">01</span><h3>Create your workspace</h3><p>Set up the business, region and currency and keep your records separated inside a secure workspace.</p></article>
      <article class="vl-step"><span class="vl-step-num">02</span><h3>Add what you sell</h3><p>Add products or services, prices, stock levels and reorder points depending on how your business works.</p></article>
      <article class="vl-step"><span class="vl-step-num">03</span><h3>Record daily business</h3><p>Create sales, invoices, customer records and expenses from the same place instead of disconnected notebooks and sheets.</p></article>
      <article class="vl-step"><span class="vl-step-num">04</span><h3>Understand performance</h3><p>Use dashboards and analytics to see revenue, profit visibility, customer activity and inventory health.</p></article>
    </div></div></section>
    <section class="vl-section" id="benefits"><div class="vl-wrap"><div class="vl-benefits"><article class="vl-benefit-large"><div class="vl-eyebrow" style="color:#cfe0d8">BUILT FOR BUSINESS OWNERS</div><h3>Stop running your business from scattered places.</h3><p>A sale should not live in one app, stock in another spreadsheet, expenses in a notebook and customers only in WhatsApp. Velora connects the daily picture so the owner can make faster, more informed decisions.</p></article><div class="vl-benefit-grid"><article class="vl-benefit"><b>Track money</b><span>See sales, discounts, payment methods, expenses and profitability signals.</span></article><article class="vl-benefit"><b>Track stock</b><span>Know what is available, what is low and when something needs attention.</span></article><article class="vl-benefit"><b>Track customers</b><span>Keep customer details, transactions and lifetime activity connected.</span></article><article class="vl-benefit"><b>Track growth</b><span>Use analytics instead of guessing which products, services and periods perform best.</span></article></div></div></div></section>
    <section class="vl-section" id="features"><div class="vl-wrap"><div class="vl-section-head"><div class="vl-eyebrow">WHAT YOU CAN MANAGE</div><h2>One system for the everyday business.</h2><p>Use the tools your business needs and ignore the ones it does not. Velora can support product-based and service-based businesses.</p></div><div class="vl-usecases"><span>Sales & POS</span><span>Invoices & receipts</span><span>Products & services</span><span>Inventory</span><span>Stock alerts</span><span>Customers</span><span>Expenses</span><span>Transactions</span><span>Profit visibility</span><span>Analytics</span><span>WhatsApp invoice sharing</span><span>Cloud workspaces</span></div><div style="margin-top:35px;color:#66716a;font-size:13px;line-height:1.8;max-width:900px">Suitable for retail shops, supermarkets, electronics stores, bakeries, salons, repair and service centres, wholesalers, distributors, agencies, freelancers, consultancies, cafés, stationery stores, hardware stores and many other small and medium businesses that need a clearer way to track operations.</div></div></section>
    <section class="vl-section" id="pricing"><div class="vl-wrap vl-pricing"><div class="vl-price-intro"><div class="vl-eyebrow">VELORA PRO</div><h2>Simple pricing for everyday business.</h2><p class="vl-hero-lede">Choose monthly flexibility or save with annual billing. The same Velora workspace, with your core business tools together.</p></div><article class="vl-price-card"><div class="vl-eyebrow">CHOOSE YOUR PLAN</div><div class="vl-plan-toggle"><div class="vl-plan"><span>MONTHLY</span><strong>₹399</strong><small>per month · $4.99 international</small></div><div class="vl-plan featured"><span>ANNUAL · BEST VALUE</span><strong>₹3,990</strong><small>per year · $49.99 international</small></div></div><ul class="vl-plan-list"><li>Sales and billing</li><li>Products or services</li><li>Inventory and stock alerts</li><li>Customer records</li><li>Expenses and transactions</li><li>Business analytics</li><li>Cloud workspace</li><li>Responsive access</li></ul><button class="vl-btn vl-price-cta" data-vl-login>Continue to Velora</button></article></div></section>
    <section class="vl-cta"><div class="vl-wrap"><div class="vl-cta-box"><div class="vl-eyebrow">BUSINESS, MADE CLEAR.</div><h2>Your numbers should help you decide what to do next.</h2><p>Bring the moving parts of your business into one workspace and make daily tracking feel simpler.</p><button class="vl-btn primary" data-vl-login>Sign in or create account</button></div></div></section>`;

  const login=document.getElementById('login');
  if(login) document.body.insertBefore(landing,login); else document.body.prepend(landing);

  function normalizeLogin(){
    const box=document.querySelector('#login .login-box');
    const form=document.getElementById('cloudLogin');
    if(!box||!form)return;
    const h2=box.querySelector('h2'); if(h2)h2.innerHTML='Welcome back to <em style="font-weight:400;color:#1f5b49">Velora.</em>';
    const sub=box.querySelector('.subtext'); if(sub)sub.textContent='Sign in to continue to your business workspace.';
    const google=document.getElementById('googleLogin');
    const divider=box.querySelector('.divider');
    if(google&&divider&&google.nextElementSibling!==divider) divider.before(google);
    if(divider){const sp=divider.querySelector('span');if(sp)sp.textContent='OR WITH EMAIL';}
    const create=document.getElementById('demoLogin');
    if(create){create.textContent='New here? Create an account →';if(create.previousElementSibling!==form)form.after(create);}
    const foot=box.querySelector('.login-foot');if(foot)foot.textContent='Secure cloud workspace · No installation required';
  }

  function showLogin(){
    document.body.classList.remove('velora-landing-active');
    document.body.classList.add('velora-login-active');
    if(login){login.classList.remove('hidden');login.scrollIntoView({block:'start'});}
    history.replaceState(null,'',location.pathname+'#login');
    normalizeLogin();
    window.VeloraFooters?.refresh?.();
  }
  function showLanding(){
    document.body.classList.add('velora-landing-active');
    document.body.classList.remove('velora-login-active');
    window.scrollTo({top:0,behavior:'instant'});
    window.VeloraFooters?.refresh?.();
  }

  document.addEventListener('click',e=>{if(e.target.closest('[data-vl-login]'))showLogin();});

  const authCallback=/access_token|refresh_token|error_description|type=recovery/i.test(location.hash+location.search);
  let hasStoredSession=false;try{hasStoredSession=!!localStorage.getItem('modeflow-auth-v1');}catch{}
  if(location.hash==='#login'||authCallback||hasStoredSession) showLogin(); else showLanding();

  normalizeLogin();
  const loginObserver=new MutationObserver(normalizeLogin);if(login)loginObserver.observe(login,{childList:true,subtree:true});
  [250,700,1400,2600].forEach(ms=>setTimeout(normalizeLogin,ms));

  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>{
    if(!app.classList.contains('hidden')){
      document.body.classList.remove('velora-landing-active','velora-login-active');
      landing.style.display='none';
    }else if(!document.body.classList.contains('velora-landing-active')) landing.style.display='';
    window.VeloraFooters?.refresh?.();
  }).observe(app,{attributes:true,attributeFilter:['class']});

  window.VeloraPublic={showLanding,showLogin};
  window.VeloraFooters?.refresh?.();
})();
