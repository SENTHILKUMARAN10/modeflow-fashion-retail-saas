// ModeFlow UI Redesign v2 interactions.
(function(){
  'use strict';
  if(document.querySelector('link[data-modeflow-redesign]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='ui/redesign-v2.css?v=2';
  link.dataset.modeflowRedesign='v2';
  document.head.appendChild(link);

  const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
  document.documentElement.classList.add('mf-redesign-v2');

  function iconMap(){
    const icons={dashboard:'⌂',billing:'＋',inventory:'▦',customers:'◉',expenses:'₹',history:'≡',reports:'⌁'};
    qsa('.nav[data-view]').forEach(btn=>{const i=btn.querySelector('i');if(i)i.textContent=icons[btn.dataset.view]||'•';});
  }
  iconMap();

  function labelNav(){
    qsa('.nav[data-view]').forEach(btn=>{
      btn.setAttribute('aria-label',btn.querySelector('span')?.textContent?.trim()||btn.dataset.view||'Navigation');
      btn.title=btn.getAttribute('aria-label');
    });
  }
  labelNav();

  function addRipple(e){
    const btn=e.currentTarget;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const rect=btn.getBoundingClientRect(),r=document.createElement('span');
    const size=Math.max(rect.width,rect.height)*1.15;
    Object.assign(r.style,{position:'absolute',width:size+'px',height:size+'px',left:(e.clientX-rect.left-size/2)+'px',top:(e.clientY-rect.top-size/2)+'px',borderRadius:'50%',background:'rgba(255,255,255,.25)',pointerEvents:'none',transform:'scale(0)',opacity:'1',transition:'transform .45s ease,opacity .45s ease'});
    const pos=getComputedStyle(btn).position;if(pos==='static')btn.style.position='relative';btn.style.overflow='hidden';btn.appendChild(r);
    requestAnimationFrame(()=>{r.style.transform='scale(1)';r.style.opacity='0';});setTimeout(()=>r.remove(),500);
  }
  qsa('.btn.primary,.btn.dark').forEach(b=>b.addEventListener('pointerdown',addRipple));

  function enhanceCards(){
    qsa('.panel,.metrics article,.hero-card,.spotlight,.receipt-wrap').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        if(innerWidth<900||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`translateY(-4px) perspective(900px) rotateX(${(-y*1.5).toFixed(2)}deg) rotateY(${(x*1.5).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave',()=>card.style.transform='');
    });
  }
  enhanceCards();

  // Keep horizontal tables usable without pushing the whole page wider.
  qsa('.table-wrap').forEach(w=>{w.setAttribute('tabindex','0');w.setAttribute('aria-label','Scrollable data table');});

  // Mobile: active nav automatically remains visible in the bottom bar.
  document.addEventListener('click',e=>{
    const nav=e.target.closest?.('.nav[data-view]');
    if(nav&&innerWidth<=720)setTimeout(()=>nav.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}),20);
  },true);

  // Smooth entry for content refreshed by realtime without observing text mutations.
  let lastView='';
  const refreshActive=()=>{
    const active=qs('.view.active-view');if(!active)return;
    if(active.id!==lastView){lastView=active.id;active.style.animation='none';void active.offsetWidth;active.style.animation='mfFadeUp .32s ease both';}
  };
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-view],[data-go],.goto-billing'))setTimeout(refreshActive,0)},true);

  // Better mobile viewport when the keyboard opens.
  if(window.visualViewport){
    visualViewport.addEventListener('resize',()=>document.documentElement.style.setProperty('--mf-vh',visualViewport.height+'px'),{passive:true});
  }
})();
