// Optional cloud bootstrap. The current demo app continues to work without this file being configured.
// Requires @supabase/supabase-js loaded in the page and window.TK_SUPABASE_CONFIG set.
(function () {
  const cfg = window.TK_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.publishableKey || cfg.url.includes('YOUR-PROJECT')) {
    window.tkCloud = { enabled: false, reason: 'Supabase is not configured yet.' };
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    window.tkCloud = { enabled: false, reason: 'Supabase SDK not loaded.' };
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  window.tkCloud = {
    enabled: true,
    client,
    auth: {
      signUp: (email, password) => client.auth.signUp({ email, password }),
      signIn: (email, password) => client.auth.signInWithPassword({ email, password }),
      signOut: () => client.auth.signOut(),
      session: () => client.auth.getSession()
    },
    businesses: {
      list: async () => {
        const { data, error } = await client
          .from('business_members')
          .select('role,businesses(id,name,slug,currency,phone,address)');
        if (error) throw error;
        return data;
      }
    },
    products: {
      list: async businessId => {
        const { data, error } = await client.from('products').select('*').eq('business_id', businessId).eq('is_active', true).order('name');
        if (error) throw error;
        return data;
      }
    },
    customers: {
      list: async businessId => {
        const { data, error } = await client.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      }
    },
    invoices: {
      list: async businessId => {
        const { data, error } = await client.from('invoices').select('*,invoice_items(*)').eq('business_id', businessId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      }
    },
    expenses: {
      list: async businessId => {
        const { data, error } = await client.from('expenses').select('*').eq('business_id', businessId).order('expense_date', { ascending: false });
        if (error) throw error;
        return data;
      }
    }
  };
})();
