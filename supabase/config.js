// Public browser configuration for Velora Business SaaS.
// Supabase publishable keys are intended for client-side use. Security is enforced with RLS policies.
window.TK_SUPABASE_CONFIG = {
  url: 'https://vjvswrossfoubgnwjigi.supabase.co',
  publishableKey: 'sb_publishable_j1GtTOvLo_lfs-20g2KN4Q_BQcT7bMD'
};

// Load the latest Velora visual system after legacy styles so every page uses one typography/color language.
(()=>{
  if(!document.querySelector('link[data-velora-system="v2"]')){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='velora-system-v2.css?v=2';
    css.dataset.veloraSystem='v2';
    document.head.appendChild(css);
  }
  if(!document.querySelector('script[data-velora-onboarding="v1"]')){
    const script=document.createElement('script');
    script.src='onboarding.js?v=1';
    script.defer=true;
    script.dataset.veloraOnboarding='v1';
    document.head.appendChild(script);
  }
})();
