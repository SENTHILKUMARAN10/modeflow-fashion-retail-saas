-- Salesventory production brand rename.
-- Apply only after the Salesventory application release containing the RPC compatibility bridge is live.

alter function public.has_salesdesk_access(uuid)
  rename to has_salesventory_access;

alter function public.update_salesdesk_business_profile(uuid, text, text, text, text, text, text, boolean)
  rename to update_salesventory_business_profile;

comment on function public.has_salesventory_access(uuid)
  is 'Returns whether the current authenticated member has active Salesventory workspace access.';

comment on function public.update_salesventory_business_profile(uuid, text, text, text, text, text, text, boolean)
  is 'Owner-only Salesventory business onboarding and profile update RPC.';
