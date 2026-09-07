// ModeFlow Supabase cloud adapter.
(function () {
  const cfg = window.TK_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.publishableKey || cfg.url.includes('YOUR-PROJECT')) {
    window.tkCloud = { enabled: false, reason: 'Supabase is not configured yet.' };
    return;
  }
  if (!window.supabase?.createClient) {
    window.tkCloud = { enabled: false, reason: 'Supabase SDK not loaded.' };
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const one = async q => { const {data,error}=await q; if(error) throw error; return data; };

  window.tkCloud = {
    enabled: true,
    client,
    auth: {
      signUp: (email,password) => client.auth.signUp({email,password}),
      signIn: (email,password) => client.auth.signInWithPassword({email,password}),
      signOut: () => client.auth.signOut(),
      session: () => client.auth.getSession(),
      user: () => client.auth.getUser()
    },
    businesses: {
      list: () => one(client.from('business_members').select('role,businesses(id,name,slug,currency,phone,address)').order('created_at',{ascending:true})),
      create: async (name='ModeFlow Store') => {
        const {data,error}=await client.rpc('create_business_with_owner',{p_name:name,p_slug:null,p_phone:null,p_address:null});
        if(error) throw error; return data;
      }
    },
    products: {
      list: businessId => one(client.from('products').select('*').eq('business_id',businessId).eq('is_active',true).order('name')),
      create: (businessId,p) => one(client.from('products').insert({business_id:businessId,name:p.name,cost_price:p.cost,selling_price:p.price,stock:p.stock,reorder_level:p.reorder,unit:'pcs'}).select().single()),
      update: (id,p) => one(client.from('products').update({name:p.name,cost_price:p.cost,selling_price:p.price,stock:p.stock,reorder_level:p.reorder}).eq('id',id).select().single()),
      remove: id => one(client.from('products').update({is_active:false}).eq('id',id))
    },
    customers: { list: businessId => one(client.from('customers').select('*').eq('business_id',businessId).order('created_at',{ascending:false})) },
    invoices: {
      list: businessId => one(client.from('invoices').select('*,invoice_items(*)').eq('business_id',businessId).order('created_at',{ascending:false})),
      checkout: async payload => { const {data,error}=await client.rpc('complete_sale',payload); if(error) throw error; return data; },
      remove: async id => { const {error}=await client.rpc('delete_sale',{p_invoice_id:id}); if(error) throw error; }
    },
    expenses: {
      list: businessId => one(client.from('expenses').select('*').eq('business_id',businessId).order('expense_date',{ascending:false}).order('created_at',{ascending:false})),
      create: (businessId,userId,e) => one(client.from('expenses').insert({business_id:businessId,category:e.category,amount:e.amount,note:e.note,expense_date:new Date().toISOString().slice(0,10),created_by:userId}).select().single()),
      remove: id => one(client.from('expenses').delete().eq('id',id))
    },
    realtime: {
      subscribe: (businessId,onChange) => client.channel('modeflow-'+businessId)
        .on('postgres_changes',{event:'*',schema:'public',table:'products',filter:`business_id=eq.${businessId}`},onChange)
        .on('postgres_changes',{event:'*',schema:'public',table:'customers',filter:`business_id=eq.${businessId}`},onChange)
        .on('postgres_changes',{event:'*',schema:'public',table:'invoices',filter:`business_id=eq.${businessId}`},onChange)
        .on('postgres_changes',{event:'*',schema:'public',table:'expenses',filter:`business_id=eq.${businessId}`},onChange)
        .subscribe(),
      unsubscribe: channel => channel && client.removeChannel(channel)
    }
  };
})();
