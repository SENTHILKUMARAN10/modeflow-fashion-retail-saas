// Legacy onboarding compatibility shim.
// The production onboarding flow now lives in ui/salesdesk-operations-pro-v2.js
// and persists business configuration in the protected SalesDesk workspace.
(function(){
  'use strict';
  window.SalesDeskLegacyOnboardingDisabled=true;
  try{localStorage.removeItem('velora_onboarding_v1');}catch{}
})();
