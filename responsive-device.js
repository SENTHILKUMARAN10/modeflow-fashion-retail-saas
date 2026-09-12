(function(){
  'use strict';
  // Salesventory responsive detector only. Visual/UI modules are loaded explicitly
  // by index.html so no legacy stylesheet or script can overwrite the current design.
  function applyDeviceClass(){
    var sw=Math.min(window.screen&&screen.width||9999,window.screen&&screen.height||9999);
    var phone=sw<=600||window.innerWidth<=767;
    document.documentElement.classList.toggle('device-phone',phone);
  }
  applyDeviceClass();
  window.addEventListener('resize',applyDeviceClass,{passive:true});
  window.addEventListener('orientationchange',applyDeviceClass,{passive:true});
})();
