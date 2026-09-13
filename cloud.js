/* Salesventory cloud adapter.
   Clean Supabase wrapper — no legacy CSS injection, no controller scripts,
   no forbidden tokens. Exposes window.SDCloud for app.js. */
(function () {
  'use strict';
  var cfg = window.TK_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.publishableKey || cfg.url.indexOf('YOUR-PROJECT') !== -1) {
    window.SDCloud = { enabled: false, reason: 'Supabase is not configured yet.' };
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    window.SDCloud = { enabled: false, reason: 'Supabase SDK not loaded.' };
    return;
  }

  var client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'salesventory-auth' }
  });

  var one = function (q) {
    return q.then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  };
  var todayISO = function () { return new Date().toISOString().slice(0, 10); };

  window.SDCloud = {
    enabled: true,
    client: client,
    auth: {
      signIn: function (email, password) { return client.auth.signInWithPassword({ email: email, password: password }); },
      signInGoogle: function (redirectTo) { return client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo } }); },
      signUp: function (email, password, redirectTo) { return client.auth.signUp({ email: email, password: password, options: { emailRedirectTo: redirectTo } }); },
      signOut: function () { return client.auth.signOut(); },
      session: function () { return client.auth.getSession(); },
      user: function () { return client.auth.getUser(); },
      resetPassword: function (email, redirectTo) { return client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo }); },
      updatePassword: function (password) { return client.auth.updateUser({ password: password }); },
      onChange: function (cb) { return client.auth.onAuthStateChange(cb); }
    },
    businesses: {
      list: function () {
        return one(client.from('business_members')
          .select('role,businesses(id,name,slug,currency,phone,address)')
          .order('created_at', { ascending: true }));
      },
      get: function (businessId) {
        return one(client.from('businesses').select('*').eq('id', businessId).maybeSingle());
      },
      update: function (businessId, patch) {
        return one(client.from('businesses').update(patch).eq('id', businessId).select().single());
      }
    },
    products: {
      list: function (businessId) {
        return one(client.from('products')
          .select('*').eq('business_id', businessId).eq('is_active', true).order('name'));
      },
      create: function (businessId, p) {
        var body = {
          business_id: businessId, name: p.name, cost_price: p.cost, selling_price: p.price,
          unit: p.unit || (p.service ? 'service' : 'pcs'),
          sku: p.sku || null, category: p.category || null, barcode: p.barcode || null,
          track_stock: !p.service
        };
        if (!p.service) { body.stock = p.stock; body.reorder_level = p.reorder; }
        return one(client.from('products').insert(body).select().single());
      },
      update: function (id, p) {
        var body = {
          name: p.name, cost_price: p.cost, selling_price: p.price,
          unit: p.unit || (p.service ? 'service' : 'pcs'),
          sku: p.sku || null, category: p.category || null, barcode: p.barcode || null,
          track_stock: !p.service
        };
        if (p.service) { body.stock = 999; body.reorder_level = 0; }
        else { body.stock = p.stock; body.reorder_level = p.reorder; }
        return one(client.from('products').update(body).eq('id', id).select().single());
      },
      remove: function (id) { return one(client.from('products').update({ is_active: false }).eq('id', id)); }
    },
    customers: {
      list: function (businessId) {
        return one(client.from('customers')
          .select('*').eq('business_id', businessId).order('created_at', { ascending: false }));
      },
      create: function (businessId, c) {
        return one(client.from('customers')
          .insert({
            business_id: businessId, name: c.name, phone: c.phone || null, email: c.email || null,
            company_name: c.company || null, address: c.address || null,
            tags: (c.tags || []).length ? c.tags : null, notes: c.notes || null,
            status: c.status || 'active'
          })
          .select().single());
      },
      update: function (id, c) {
        return one(client.from('customers')
          .update({
            name: c.name, phone: c.phone || null, email: c.email || null,
            company_name: c.company || null, address: c.address || null,
            tags: (c.tags || []).length ? c.tags : null, notes: c.notes || null,
            status: c.status || 'active'
          })
          .eq('id', id).select().single());
      },
      archive: function (id) {
        return one(client.from('customers').update({ status: 'inactive' }).eq('id', id).select().single());
      }
    },
    followups: {
      list: function (businessId) {
        return one(client.from('customer_followups')
          .select('*').eq('business_id', businessId).order('created_at', { ascending: false }));
      },
      create: function (businessId, userId, f) {
        return one(client.from('customer_followups')
          .insert({
            business_id: businessId, customer_id: f.customerId, title: f.title,
            note: f.note || null, due_at: f.dueAt || null, priority: f.priority || 'normal',
            status: 'open', created_by: userId, assigned_to: f.assignedTo || null
          })
          .select().single());
      },
      updateAssigned: function (id, userId) {
        return one(client.from('customer_followups').update({ assigned_to: userId || null }).eq('id', id).select().single());
      },
      complete: function (id, outcome) {
        return one(client.from('customer_followups')
          .update({ status: 'done', completed_at: new Date().toISOString(), outcome: outcome || null })
          .eq('id', id).eq('status', 'open'));
      },
      remove: function (id) { return one(client.from('customer_followups').delete().eq('id', id)); }
    },
    invoices: {
      list: function (businessId) {
        return one(client.from('invoices')
          .select('*,invoice_items(*),invoice_payments(*)').eq('business_id', businessId).order('created_at', { ascending: false }));
      },
      checkout: function (payload) {
        return client.rpc('complete_sale', payload).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      checkoutMulti: function (payload) {
        return client.rpc('complete_multi_item_sale', payload).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      updateStatus: function (id, status, method) {
        var body = { payment_status: status };
        if (method) body.payment_method = method;
        return one(client.from('invoices').update(body).eq('id', id).select().single());
      },
      updateMeta: function (id, meta) {
        var body = {};
        if (meta.dueDate !== undefined) body.due_date = meta.dueDate ? meta.dueDate.slice(0, 10) : null;
        if (meta.notes !== undefined) body.notes = meta.notes ? String(meta.notes) : null;
        return one(client.from('invoices').update(body).eq('id', id).select().single());
      },
      remove: function (id) {
        return client.rpc('delete_sale', { p_invoice_id: id }).then(function (r) { if (r.error) throw r.error; });
      }
    },
    salesDocs: {
      list: function (businessId) {
        return one(client.from('sales_documents')
          .select('*,sales_document_items(*)').eq('business_id', businessId).order('created_at', { ascending: false }));
      },
      create: function (businessId, type, d) {
        return client.rpc('create_sales_document', {
          p_business_id: businessId, p_document_type: type, p_customer_name: d.customerName,
          p_customer_phone: d.customerPhone || null, p_items: d.items, p_expiry_date: d.expiryDate || null,
          p_notes: d.notes || null
        }).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      convertToOrder: function (docId) {
        return client.rpc('convert_quote_to_order', { p_document_id: docId }).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      convertToInvoice: function (docId, method, status) {
        return client.rpc('convert_sales_document_to_invoice', {
          p_document_id: docId, p_payment_method: method || 'bank', p_payment_status: status || 'unpaid'
        }).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      setStatus: function (id, status) {
        return one(client.from('sales_documents').update({ status: status }).eq('id', id).select().single());
      }
    },
    returns: {
      list: function (businessId) {
        return one(client.from('sales_returns')
          .select('*,sales_return_items(*)').eq('business_id', businessId).order('created_at', { ascending: false }));
      },
      create: function (invoiceId, productId, qty, r) {
        return client.rpc('create_sales_return', {
          p_invoice_id: invoiceId, p_product_id: productId, p_quantity: qty,
          p_refund_method: r.method || 'credit', p_reason: r.reason || null, p_restock: r.restock !== false
        }).then(function (res) { if (res.error) throw res.error; return res.data; });
      }
    },
    expenses: {
      list: function (businessId) {
        return one(client.from('expenses')
          .select('*').eq('business_id', businessId)
          .order('expense_date', { ascending: false }).order('created_at', { ascending: false }));
      },
      create: function (businessId, userId, e) {
        return one(client.from('expenses')
          .insert({ business_id: businessId, category: e.category, amount: e.amount, note: e.note || '', expense_date: todayISO(), created_by: userId })
          .select().single());
      },
      remove: function (id) { return one(client.from('expenses').delete().eq('id', id)); }
    },
    branches: {
      list: function (businessId) {
        return one(client.from('branches').select('id,name,code,is_active')
          .eq('business_id', businessId).eq('is_active', true).order('name'));
      }
    },
    movements: {
      list: function (businessId, limit) {
        var q = client.from('stock_movements').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
        if (limit) q = q.limit(limit);
        return one(q);
      }
    },
    warehouses: {
      list: function (businessId) {
        return one(client.from('warehouses').select('id,name,code,is_default,is_active')
          .eq('business_id', businessId).eq('is_active', true).order('is_default', { ascending: false }).order('name'));
      },
      stock: function (businessId) {
        return client.rpc('salesdesk_warehouse_stock', { p_business_id: businessId }).then(function (r) { if (r.error) throw r.error; return r.data || []; });
      },
      transfers: function (businessId) {
        return one(client.from('inventory_transfers')
          .select('*,inventory_transfer_items(*)').eq('business_id', businessId).order('created_at', { ascending: false }));
      },
      transfer: function (businessId, fromId, toId, items, notes) {
        return client.rpc('transfer_inventory', {
          p_business_id: businessId, p_from_warehouse_id: fromId, p_to_warehouse_id: toId, p_items: items, p_notes: notes || null
        }).then(function (r) { if (r.error) throw r.error; return r.data; });
      }
    },
    suppliers: {
      list: function (businessId) {
        return one(client.from('suppliers')
          .select('*').eq('business_id', businessId).eq('is_active', true).order('name'));
      },
      create: function (businessId, userId, s) {
        return one(client.from('suppliers')
          .insert({
            business_id: businessId, name: s.name, phone: s.phone || null, email: s.email || null,
            tax_id: s.gst || null, address: s.address || null, contact_person: s.contact || null,
            payment_terms_days: Number(s.terms) || 0, notes: s.notes || null, created_by: userId
          })
          .select().single());
      },
      update: function (id, s) {
        return one(client.from('suppliers')
          .update({
            name: s.name, phone: s.phone || null, email: s.email || null, tax_id: s.gst || null,
            address: s.address || null, contact_person: s.contact || null,
            payment_terms_days: Number(s.terms) || 0, notes: s.notes || null
          })
          .eq('id', id).select().single());
      },
      remove: function (id) { return one(client.from('suppliers').update({ is_active: false }).eq('id', id)); }
    },
    purchases: {
      list: function (businessId) {
        return one(client.from('purchases')
          .select('*,purchase_items(*),purchase_payments(*),suppliers(name,phone)')
          .eq('business_id', businessId).order('created_at', { ascending: false }));
      },
      create: function (payload) {
        return client.rpc('create_purchase', payload).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      receive: function (id) {
        return client.rpc('receive_purchase', { p_purchase_id: id }).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      cancel: function (id) {
        return one(client.from('purchases').update({ status: 'cancelled' }).eq('id', id));
      }
    },
    purchasePayments: {
      create: function (purchaseId, amount, method, reference) {
        return client.rpc('record_purchase_payment', { p_purchase_id: purchaseId, p_amount: amount, p_payment_method: method || 'bank', p_reference: reference || null })
          .then(function (r) { if (r.error) throw r.error; return r.data; });
      }
    },
    invoicePayments: {
      create: function (businessId, invoiceId, amount, method, reference, userId) {
        return one(client.from('invoice_payments')
          .insert({
            business_id: businessId, invoice_id: invoiceId, amount: amount,
            payment_method: method || 'cash', reference: reference || null, created_by: userId
          })
          .select().single());
      }
    },
    auditLogs: {
      list: function (businessId, limit) {
        return one(client.from('audit_logs')
          .select('id,actor_user_id,action,entity_type,entity_id,created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(limit || 60));
      }
    },
    realtime: {
      subscribe: function (businessId, onChange, onStatus) {
        return client.channel('salesventory-' + businessId, { config: { broadcast: { self: false } } })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: 'business_id=eq.' + businessId }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: 'business_id=eq.' + businessId }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: 'business_id=eq.' + businessId }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: 'business_id=eq.' + businessId }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers', filter: 'business_id=eq.' + businessId }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: 'business_id=eq.' + businessId }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_payments', filter: 'business_id=eq.' + businessId }, onChange)
          .subscribe(function (status) { if (onStatus) onStatus(status); });
      },
      unsubscribe: function (channel) { if (channel) client.removeChannel(channel); }
    }
  };
})();