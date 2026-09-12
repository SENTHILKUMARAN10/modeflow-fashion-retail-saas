/* SalesDesk v2 cloud adapter. Clean Supabase wrapper — no legacy CSS injection,
   no controller scripts, no forbidden tokens. Exposes window.SDCloud. */
(function () {
  'use strict';
  const cfg = window.TK_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.publishableKey || cfg.url.includes('YOUR-PROJECT')) {
    window.SDCloud = { enabled: false, reason: 'Supabase is not configured yet.' };
    return;
  }
  if (!window.supabase?.createClient) {
    window.SDCloud = { enabled: false, reason: 'Supabase SDK not loaded.' };
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'salesdesk-v2-auth' }
  });
  const one = async q => { const { data, error } = await q; if (error) throw error; return data; };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  window.SDCloud = {
    enabled: true,
    client,
    auth: {
      signIn: (email, password) => client.auth.signInWithPassword({ email, password }),
      signInGoogle: redirectTo => client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }),
      signUp: (email, password, redirectTo) => client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }),
      signOut: () => client.auth.signOut(),
      session: () => client.auth.getSession(),
      user: () => client.auth.getUser(),
      resetPassword: (email, redirectTo) => client.auth.resetPasswordForEmail(email, { redirectTo }),
      updatePassword: password => client.auth.updateUser({ password }),
      onChange: cb => client.auth.onAuthStateChange(cb)
    },
    businesses: {
      list: () => one(client.from('business_members')
        .select('role,businesses(id,name,slug,currency,phone,address)')
        .order('created_at', { ascending: true }))
    },
    products: {
      list: businessId => one(client.from('products')
        .select('*').eq('business_id', businessId).eq('is_active', true).order('name')),
      create: (businessId, p) => one(client.from('products')
        .insert({ business_id: businessId, name: p.name, cost_price: p.cost, selling_price: p.price, stock: p.stock, reorder_level: p.reorder, unit: 'pcs' })
        .select().single()),
      update: (id, p) => one(client.from('products')
        .update({ name: p.name, cost_price: p.cost, selling_price: p.price, stock: p.stock, reorder_level: p.reorder })
        .eq('id', id).select().single()),
      remove: id => one(client.from('products').update({ is_active: false }).eq('id', id))
    },
    customers: {
      list: businessId => one(client.from('customers')
        .select('*').eq('business_id', businessId).order('created_at', { ascending: false }))
    },
    invoices: {
      list: businessId => one(client.from('invoices')
        .select('*,invoice_items(*)').eq('business_id', businessId).order('created_at', { ascending: false })),
      checkout: async payload => {
        const { data, error } = await client.rpc('complete_sale', payload);
        if (error) throw error;
        return data;
      },
      remove: async id => {
        const { error } = await client.rpc('delete_sale', { p_invoice_id: id });
        if (error) throw error;
      }
    },
    expenses: {
      list: businessId => one(client.from('expenses')
        .select('*').eq('business_id', businessId)
        .order('expense_date', { ascending: false }).order('created_at', { ascending: false })),
      create: (businessId, userId, e) => one(client.from('expenses')
        .insert({ business_id: businessId, category: e.category, amount: e.amount, note: e.note, expense_date: todayISO(), created_by: userId })
        .select().single()),
      remove: id => one(client.from('expenses').delete().eq('id', id))
    },
    realtime: {
      subscribe: (businessId, onChange, onStatus) =>
        client.channel('salesdesk-v2-' + businessId, { config: { broadcast: { self: false } } })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `business_id=eq.${businessId}` }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `business_id=eq.${businessId}` }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `business_id=eq.${businessId}` }, onChange)
          .subscribe(status => onStatus && onStatus(status)),
      unsubscribe: channel => channel && client.removeChannel(channel)
    }
  };
})();