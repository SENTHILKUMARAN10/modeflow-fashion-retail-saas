// ModeFlow Clean UI v3 bootstrap — intentionally lightweight.
(function(){
  'use strict';
  if(!document.querySelector('link[data-modeflow-clean-v3]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='ui/clean-v3.css?v=3';
    link.dataset.modeflowCleanV3='true';
    document.head.appendChild(link);
  }
  document.documentElement.classList.add('mf-clean-v3');
  const icons={dashboard:'⌂',billing:'＋',inventory:'▦',customers:'◎',expenses:'₹',history:'≡',reports:'⌁'};
  document.querySelectorAll('.nav[data-view]').forEach(btn=>{
    const label=btn.querySelector('span')?.textContent?.trim()||btn.dataset.view||'Navigation';
    btn.setAttribute('aria-label',label);btn.title=label;
    const i=btn.querySelector('i');if(i)i.textContent=icons[btn.dataset.view]||'•';
  });
  document.querySelectorAll('.table-wrap').forEach(el=>{el.tabIndex=0;el.setAttribute('aria-label','Scrollable data table');});
})();
