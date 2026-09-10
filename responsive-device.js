(function(){
  function applyDeviceClass(){
    var sw=Math.min(window.screen && screen.width || 9999, window.screen && screen.height || 9999);
    var phone=sw<=600 || window.innerWidth<=767;
    document.documentElement.classList.toggle('device-phone',phone);
  }
  function loadPremiumLayer(){
    if(!document.querySelector('link[data-mf-premium]')){
      var fonts=document.createElement('link');
      fonts.rel='stylesheet';
      fonts.href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      fonts.setAttribute('data-mf-premium-fonts','1');
      document.head.appendChild(fonts);
      var css=document.createElement('link');
      css.rel='stylesheet';
      css.href='premium-v5.css?v=20260910-0955';
      css.setAttribute('data-mf-premium','1');
      document.head.appendChild(css);
    }
    if(!document.querySelector('script[data-mf-account-pages]')){
      var js=document.createElement('script');
      js.src='account-pages-v1.js?v=20260910-0955';
      js.defer=true;
      js.setAttribute('data-mf-account-pages','1');
      document.body.appendChild(js);
    }
  }
  applyDeviceClass();
  window.addEventListener('resize',applyDeviceClass,{passive:true});
  window.addEventListener('orientationchange',applyDeviceClass,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPremiumLayer,{once:true});else loadPremiumLayer();
})();
