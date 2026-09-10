// Legacy compatibility loader. The old v16 renderer is intentionally disabled.
(function(){
  'use strict';
  if(!document.querySelector('link[data-velora-final18]')){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='ui/velora-final-v18.css?v=20260910-1245';
    css.setAttribute('data-velora-final18','1');
    document.head.appendChild(css);
  }
  if(!document.querySelector('script[data-velora-final18],script[src*="ui/velora-final-v18.js"]')){
    const script=document.createElement('script');
    script.src='ui/velora-final-v18.js?v=20260910-1245';
    script.async=false;
    script.setAttribute('data-velora-final18','1');
    document.body.appendChild(script);
  }
})();
