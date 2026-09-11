-- Restrict internal tenant/security helper RPCs from anonymous callers.
-- These helpers are invoked by authenticated RLS policies and app flows only.

revoke execute on function public.has_business_role(uuid,text[]) from anon;
revoke execute on function public.is_business_member(uuid) from anon;
revoke execute on function public.has_active_subscription(uuid) from anon;
revoke execute on function public.salesdesk_has_branch_access(uuid,uuid) from anon;
revoke execute on function public.salesdesk_can(uuid,text) from anon;
revoke execute on function public.salesdesk_role_capabilities(uuid) from anon;

grant execute on function public.has_business_role(uuid,text[]) to authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_active_subscription(uuid) to authenticated;
grant execute on function public.salesdesk_has_branch_access(uuid,uuid) to authenticated;
grant execute on function public.salesdesk_can(uuid,text) to authenticated;
grant execute on function public.salesdesk_role_capabilities(uuid) to authenticated;
