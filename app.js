/* Salesventory v3 — workspace controller for Supabase-cloud businesses.
   One controller, per-section pages, one clear flow. Real records only. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var cloud = window.SDCloud && window.SDCloud.enabled ? window.SDCloud : null;

  /* ============ date helpers ============ */
  var fmtDay = function (ts) { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };

  var state = {
    mode: 'cloud',
    demo: false,
    role: 'owner',
    businessId: null,
    businessName: 'Salesventory Workspace',
    currency: 'INR',
    user: null,
    channel: null,
    products: [],
    invoices: [],
    expenses: [],
    customers: [],
    suppliers: [],
    purchases: [],
    billing: null
  };

  /* ============ helpers ============ */
  var symbol = function () { return ({ INR: '₹', USD: '$', GBP: '£', AED: 'د.إ', SGD: 'S$' })[state.currency] || '₹'; };
  var money = function (n) {
    var v = Number(n || 0);
    var frac = (Math.abs(v) % 1) ? 2 : 0;
    return symbol() + v.toLocaleString('en-IN', { maximumFractionDigits: frac });
  };
  var esc = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var greeting = function () { var h = new Date().getHours(); return h >= 5 && h < 12 ? 'Good morning' : (h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'); };
  var greetingText = function () { return greeting() + '.'; };
  var initials = function (name) { return String(name || '?').split(/\s+/).map(function (x) { return x.charAt(0); }).slice(0, 2).join('').toUpperCase() || 'SV'; };
  var isService = function (p) { return Number(p.stock) >= 900; };
  var isSameDay = function (ts) { var d = new Date(ts); var n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); };
  var isSameMonth = function (ts) { var d = new Date(ts); var n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); };
  var moneySigned = function (n) { return Number(n) < 0 ? '−' + money(Math.abs(Number(n))) : money(n); };

  /* ============ dashboard range window ============ */
  var dayStart = function (ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d; };
  var dayEnd = function (ts) { var d = new Date(ts); d.setHours(23, 59, 59, 999); return d; };
  var inWin = function (ts, w) { return !!(ts && w && ts >= w.from && ts <= w.to); };
  function dashWindow() {
    var sel = $('#dashRange');
    var v = sel ? sel.value : '7d';
    var now = new Date();
    var f = $('#dashFrom'), t = $('#dashTo');
    var from, to;
    if (v === 'today') { from = dayStart(now).getTime(); to = now.getTime(); }
    else if (v === 'yesterday') { var y = new Date(now); y.setDate(y.getDate() - 1); from = dayStart(y).getTime(); to = dayStart(now).getTime() - 1; }
    else if (v === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); to = now.getTime(); }
    else if (v === 'lastmonth') { from = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(); to = dayEnd(new Date(now.getFullYear(), now.getMonth(), 0)).getTime(); }
    else if (v === 'year') { from = new Date(now.getFullYear(), 0, 1).getTime(); to = now.getTime(); }
    else if (v === 'custom') {
      from = f && f.value ? dayStart(new Date(f.value)).getTime() : new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      to = t && t.value ? dayEnd(new Date(t.value)).getTime() : now.getTime();
      if (from > to) { var tmp = from; from = to; to = tmp; }
    }
    else { from = now.getTime() - Number(v || 7) * 864e5; to = now.getTime(); }
    return { from: from, to: to, key: v, label: sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : v) : v };
  }

  /* ============ role capabilities ============ */
  var capabilities = function (role) {
    if (role === 'owner') return { manageProducts: true, managePurchases: true, finance: true, deleteSales: true, deleteExpenses: true, manageCustomers: true };
    if (role === 'manager') return { manageProducts: true, managePurchases: true, finance: false, deleteSales: false, deleteExpenses: false, manageCustomers: true };
    if (role === 'admin' || role === 'accountant') return { manageProducts: false, managePurchases: false, finance: true, deleteSales: false, deleteExpenses: false, manageCustomers: false };
    return { manageProducts: false, deleteSales: false, deleteExpenses: false, managePurchases: false, finance: false, manageCustomers: false };
  };
  var caps = function () { return capabilities(state.role); };

  /* ============ toast + confirm ============ */
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function confirmDialog(title, message) {
    var dlg = $('#confirmDialog');
    return new Promise(function (resolve) {
      var ok = $('#confirmOk'), cancel = $('#confirmCancel');
      $('#confirmTitle').textContent = title || 'Are you sure?';
      $('#confirmMessage').textContent = message || '';
      function cleanup() {
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        dlg.removeEventListener('cancel', onEsc);
      }
      function settle(val) { cleanup(); dlg.close(); resolve(val); }
      function onOk() { settle(true); }
      function onCancel() { settle(false); }
      function onEsc(e) { e.preventDefault(); settle(false); }
      ok.addEventListener('click', onOk);
      cancel.addEventListener('click', onCancel);
      dlg.addEventListener('cancel', onEsc);
      dlg.showModal();
    });
  }

  /* ============ routing ============ */
  var titles = {
    dashboard: ['BUSINESS OVERVIEW', null],
    billing: ['SALES', 'Create a new sale'],
    inventory: ['CATALOGUE', 'Products & inventory'],
    customers: ['CUSTOMERS', 'Customer relationships'],
    suppliers: ['SUPPLIERS', 'Supplier relationships'],
    purchases: ['PURCHASES', 'Purchase bills & payables'],
    expenses: ['OPERATIONS', 'Business expenses'],
    history: ['TRANSACTIONS', 'Sales history'],
    reports: ['BUSINESS INTELLIGENCE', 'Performance analytics'],
    plans: ['PLANS & BILLING', 'Manage your subscription'],
    settings: ['WORKSPACE SETTINGS', 'Tune your business profile.']
  };
  var PAGE_FILES = {
    dashboard: 'dashboard.html', billing: 'sales.html', inventory: 'products.html',
    customers: 'customers.html', suppliers: 'suppliers.html', purchases: 'purchases.html',
    expenses: 'expenses.html', history: 'history.html', reports: 'reports.html',
    plans: 'plans.html', settings: 'settings.html', login: 'index.html'
  };
  var SECTION_PAGE = {
    dashboard: 'dashboard.html', billing: 'sales.html', inventory: 'products.html',
    customers: 'customers.html', suppliers: 'suppliers.html', purchases: 'purchases.html',
    expenses: 'expenses.html', history: 'history.html', reports: 'reports.html', plans: 'plans.html',
    settings: 'settings.html'
  };
  function currentPage() {
    return (document.body && document.body.dataset && document.body.dataset.page) || 'login';
  }
  function gotoView(id) {
    var here = currentPage();
    if (here !== 'login' && SECTION_PAGE[id] && here !== id) {
      location.href = SECTION_PAGE[id];
      return;
    }
    $$('.view').forEach(function (v) { v.classList.toggle('active-view', v.id === id); });
    $$('.nav[data-view]').forEach(function (n) {
      var on = n.dataset.view === id;
      n.classList.toggle('active', on);
      if (on) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
    var t = titles[id];
    if (t) {
      if ($('#eyebrow')) $('#eyebrow').textContent = t[0];
      var el = $('#title');
      if (el) {
        if (t[1] === null) { if (!/^Good (morning|afternoon|evening)/i.test(el.textContent)) el.textContent = greetingText(); }
        else el.textContent = t[1];
      }
    }
    if (id === 'plans') renderPlans();
    if (innerWidth < 900) scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showApp() {
    var login = $('#login'); if (login) login.classList.add('hidden');
    var app = $('#app'); if (app) app.classList.remove('hidden');
    var mb = $('#modeBadge'); if (mb) mb.textContent = 'Cloud workspace';
    var bn = $('#businessName'); if (bn) bn.textContent = state.businessName;
    var sn = $('#storeName'); if (sn) sn.textContent = state.businessName;
    var meta = $('#storeMeta'); if (meta) meta.textContent = 'Business · cloud · ' + (state.currency || 'INR');
    var roleEl = $('#roleBadge'); if (roleEl) { roleEl.textContent = state.role; roleEl.hidden = false; }
    var initialsText = initials(state.businessName);
    var sa = $('#storeAvatar'); if (sa) sa.textContent = initialsText;
    var pb = $('#profileBadge'); if (pb) pb.textContent = initialsText;
    renderAll();
    gotoView(currentPage());
  }
  function showLogin() {
    var app = $('#app'); if (app) app.classList.add('hidden');
    var login = $('#login');
    if (login) login.classList.remove('hidden');
    else if (currentPage() !== 'login') location.replace('index.html');
  }

  /* ============ cloud data mapping ============ */
  function productFromCloud(r) {
    return {
      id: r.id, name: r.name,
      cost: Number(r.cost_price || 0), price: Number(r.selling_price || 0),
      stock: Number(r.track_stock === false ? 999 : (r.stock || 0)),
      reorder: Number(r.reorder_level || 0),
      category: r.category || '', sku: r.sku || '', barcode: r.barcode || '',
      unit: r.unit || (r.track_stock === false ? 'service' : 'pcs'),
      cloud: true, service: r.track_stock === false
    };
  }
  function invoiceFromCloud(r) {
    var it = (r.invoice_items || [])[0] || {};
    var paid = (r.invoice_payments || []).reduce(function (a, p) { return a + Number(p.amount || 0); }, 0);
    var total = Number(r.total || 0);
    return {
      id: r.invoice_number || 'INV-' + String(r.id).slice(0, 8),
      cloudId: r.id,
      customer: r.customer_name, phone: r.customer_phone || '',
      product: it.product_name || 'Item', productId: it.product_id,
      qty: Number(it.quantity || 1), rate: Number(it.rate || 0), cost: Number(it.cost_price || 0),
      discount: Number(r.discount || 0), subtotal: Number(r.subtotal || 0),
      total: total, paid: paid, balance: Math.max(0, total - paid),
      paymentMethod: r.payment_method || 'upi', paymentStatus: r.payment_status || 'paid',
      dueDate: r.due_date || null,
      date: fmtDay(new Date(r.created_at)), ts: new Date(r.created_at).getTime(),
      items: (r.invoice_items || []).map(function (x) {
        return { productId: x.product_id, name: x.product_name || 'Item', qty: Number(x.quantity || 0), rate: Number(x.rate || 0), cost: Number(x.cost_price || 0), lineTotal: Number(x.line_total || (x.quantity * x.rate) || 0) };
      }),
      receipts: (r.invoice_payments || []).map(function (p) {
        return { id: p.id, amount: Number(p.amount || 0), method: p.payment_method || 'cash', ref: p.reference || '', at: p.created_at || p.paid_at || r.created_at };
      })
    };
  }
  function expenseFromCloud(r) {
    return {
      id: r.id, category: r.category, amount: Number(r.amount || 0), note: r.note || '',
      date: fmtDay(new Date(r.expense_date || r.created_at)), ts: new Date(r.expense_date || r.created_at).getTime(),
      cloud: true
    };
  }

  /* ============ cloud workspace loading ============ */
  var cloudWorkspaceLoading = false;
  async function loadCloudWorkspace() {
    if (cloudWorkspaceLoading) return;
    cloudWorkspaceLoading = true;
    try {
      return await loadCloudWorkspaceInner();
    } finally {
      cloudWorkspaceLoading = false;
    }
  }
  async function loadCloudWorkspaceInner() {
    var sessionRes = await cloud.auth.session();
    if (!sessionRes || !sessionRes.data || !sessionRes.data.session) return;
    if (currentPage() === 'login') { location.href = 'dashboard.html'; return; }
    var userRes = await cloud.auth.user();
    state.user = userRes && userRes.data ? userRes.data.user : null;
    var members = [];
    try { members = await cloud.businesses.list(); } catch (e) { toast('Could not load workspaces'); return; }
    var owned = members.filter(function (m) { return m && m.businesses; }).map(function (m) {
      return { id: m.businesses.id, name: m.businesses.name, role: m.role, currency: m.businesses.currency, slug: m.businesses.slug };
    });
    if (!owned.length) {
      try {
        await cloud.client.rpc('create_business_with_owner', { p_name: 'My Salesventory Workspace', p_slug: null, p_phone: null, p_address: null });
        members = await cloud.businesses.list();
        owned = members.filter(function (m) { return m && m.businesses; }).map(function (m) {
          return { id: m.businesses.id, name: m.businesses.name, role: m.role, currency: m.businesses.currency };
        });
      } catch (e) { toast('Could not create a workspace'); return; }
    }
    var saved = localStorage.getItem('salesventory-v3-business');
    var pick = owned.filter(function (b) { return String(b.id) === saved; })[0] || owned[0];
    await activateBusiness(pick.id, pick.name, pick.currency, pick.role);
  }
  async function activateBusiness(id, name, currency, role) {
    localStorage.setItem('salesventory-v3-business', id);
    state.mode = 'cloud'; state.demo = false;
    state.businessId = id; state.businessName = name || 'Salesventory Workspace';
    state.currency = currency || 'INR'; state.role = role || 'owner';
    if (state.channel) { cloud.realtime.unsubscribe(state.channel); state.channel = null; }
    await refreshCloudData();
    cloud.businesses.get(id).then(function (biz) {
      if (biz) {
        state.businessProfile = biz; state.businessName = biz.name || state.businessName;
        if (biz.currency) state.currency = biz.currency;
        var bn = $('#businessName'); if (bn) bn.textContent = state.businessName;
        var sn = $('#storeName'); if (sn) sn.textContent = state.businessName;
        var meta = $('#storeMeta'); if (meta) meta.textContent = 'Business · cloud · ' + state.currency;
        var initialsText = initials(state.businessName);
        var sa = $('#storeAvatar'); if (sa) sa.textContent = initialsText;
        var pb = $('#profileBadge'); if (pb) pb.textContent = initialsText;
        renderSettings();
      }
    }).catch(function () { });
    state.channel = cloud.realtime.subscribe(id, function () { clearTimeout(state._rt); state._rt = setTimeout(refreshCloudData, 300); });
    toast('Workspace loaded');
    showApp();
  }
  async function refreshCloudData() {
    if (!state.businessId || !cloud) return;
    var statusEl = $('#cloudStatus');
    if (statusEl) statusEl.textContent = 'Syncing cloud data…';
    try {
      var results = await Promise.all([
        cloud.products.list(state.businessId).catch(function () { return []; }),
        cloud.invoices.list(state.businessId).catch(function () { return []; }),
        cloud.expenses.list(state.businessId).catch(function () { return []; }),
        cloud.suppliers.list(state.businessId).catch(function () { return []; }),
        cloud.purchases.list(state.businessId).catch(function () { return []; }),
        cloud.customers.list(state.businessId).catch(function () { return []; })
      ]);
      state.products = results[0].map(productFromCloud);
      state.invoices = results[1].map(invoiceFromCloud);
      state.expenses = results[2].map(expenseFromCloud);
      state.suppliers = results[3].map(supplierFromCloud);
      state.purchases = results[4].map(purchaseFromCloud);
      state.customers = results[5].map(customerFromCloud);
      var el = $('#cloudStatus');
      var appEl = $('#app');
      if (el && appEl && !appEl.classList.contains('hidden')) el.textContent = '';
      renderAll();
    } catch (e) {
      var err = $('#cloudStatus');
      if (err) err.textContent = 'Cloud sync failed. Refresh to retry.';
    }
  }

  function customerFromCloud(r) {
    return {
      id: r.id, cloud: true, name: r.name, phone: r.phone || '',
      email: r.email || '', company: r.company_name || '', address: r.address || '',
      tags: r.tags || [], notes: r.notes || '', status: r.status || 'active'
    };
  }
  function supplierFromCloud(r) {
    return {
      id: r.id, cloud: true, name: r.name, phone: r.phone || '', email: r.email || '',
      gst: r.tax_id || '', address: r.address || '', contact: r.contact_person || '',
      terms: Number(r.payment_terms_days || 0), notes: r.notes || ''
    };
  }
  function purchaseFromCloud(r) {
    var payments = (r.purchase_payments || []).map(function (p) {
      return { id: p.id, amount: Number(p.amount || 0), method: p.payment_method, ref: p.reference || '', at: p.paid_at };
    });
    var paid = payments.reduce(function (a, p) { return a + p.amount; }, 0);
    return {
      id: r.id, cloud: true, number: r.purchase_number,
      supplierId: r.supplier_id,
      supplier: (r.suppliers && r.suppliers.name) || 'Unknown supplier',
      status: r.status, paymentStatus: r.payment_status,
      subtotal: Number(r.subtotal || 0), total: Number(r.total || 0),
      paid: paid, balance: Number(r.total || 0) - paid,
      date: r.purchase_date, dueDate: r.due_date, ts: new Date(r.created_at).getTime(),
      notes: r.notes || '',
      items: (r.purchase_items || []).map(function (it) {
        return { id: it.id, productId: it.product_id, name: it.product_name, qty: Number(it.quantity), cost: Number(it.cost_price), lineTotal: Number(it.line_total) };
      }),
      payments: payments
    };
  }

  /* ============ auth ============ */
  function initAuth() {
    if (!cloud) {
      var s = $('#cloudStatus');
      if (s) s.textContent = (window.SDCloud && window.SDCloud.reason) || 'Cloud login is not configured.';
      if (currentPage() !== 'login') location.replace('index.html');
      return;
    }
    cloud.auth.onChange(function (event) {
      if (event === 'SIGNED_OUT') {
        cloudWorkspaceLoading = false;
        if (state.channel) { cloud.realtime.unsubscribe(state.channel); state.channel = null; }
        showLogin();
      } else if (event === 'SIGNED_IN') {
        loadCloudWorkspace();
      }
    });
    cloud.auth.session().then(function (res) {
      if (res && res.data && res.data.session) loadCloudWorkspace();
      else {
        if (currentPage() !== 'login') location.replace('index.html');
        else {
          var el = $('#cloudStatus');
          if (el) el.textContent = 'Secure cloud workspace ready.';
        }
      }
    });
  }
  function bindAuth() {
    var cloudAuthPending = false;
    var isSignUp = false;
    var logout = $('#logout');
    if (logout) logout.addEventListener('click', async function () {
      if (state.channel) { cloud.realtime.unsubscribe(state.channel); state.channel = null; }
      if (cloud) { try { await cloud.auth.signOut(); } catch (e) {} }
      location.href = 'index.html';
    });
    var cloudLogin = $('#cloudLogin');
    if (cloudLogin) cloudLogin.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!cloud) { toast('Cloud connection is unavailable'); return; }
      if (cloudAuthPending) return;
      var email = $('#loginEmail').value.trim();
      var password = $('#loginPassword').value;
      if (!email || !password) { toast('Enter your email and password'); return; }
      if (isSignUp) {
        if (password.length < 8) { toast('Password must be at least 8 characters'); return; }
        cloudAuthPending = true;
        try {
          var res = await cloud.auth.signUp(email, password, location.origin + '/' + 'dashboard.html');
          if (res.error) throw res.error;
          if (res.data && res.data.session) location.href = 'dashboard.html';
          else {
            toast('Account created. Check your email to verify it, then sign in.');
            isSignUp = false;
            var h = $('#loginHeading');
            if (h) h.textContent = 'Continue your workspace.';
            var s = cloudLogin.querySelector('button[type=submit]');
            if (s) s.textContent = 'Sign in to workspace';
            var l = $('#signUpToggle');
            if (l) l.textContent = 'New here? Create an account';
          }
        } catch (err) { toast(friendly(err)); }
        finally { cloudAuthPending = false; }
        return;
      }
      cloudAuthPending = true;
      try {
        var res2 = await cloud.auth.signIn(email, password);
        if (res2.error) throw res2.error;
        location.href = 'dashboard.html';
      } catch (err) { toast(friendly(err)); }
      finally { cloudAuthPending = false; }
    });
    var google = $('#googleLogin');
    if (google) google.addEventListener('click', function () {
      if (!cloud) { toast('Cloud connection is unavailable'); return; }
      cloud.auth.signInGoogle(location.origin + '/' + 'dashboard.html');
    });
    var signUpLink = $('#signUpToggle');
    if (signUpLink) signUpLink.addEventListener('click', function (e) {
      e.preventDefault();
      isSignUp = !isSignUp;
      var h = $('#loginHeading');
      if (h) h.textContent = isSignUp ? 'Create your workspace.' : 'Continue your workspace.';
      var submitBtn = cloudLogin ? cloudLogin.querySelector('button[type=submit]') : null;
      if (submitBtn) submitBtn.textContent = isSignUp ? 'Create account' : 'Sign in to workspace';
      signUpLink.textContent = isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account';
    });
  }
  function friendly(err) {
    var m = String((err && err.message) || err || '');
    if (/invalid login credentials/i.test(m)) return 'Email or password is incorrect.';
    if (/network|failed to fetch|load failed/i.test(m)) return 'Network unavailable. Check your connection and try again.';
    if (m.length > 90) return 'The operation could not be completed. Please try again.';
    return m;
  }

  /* ============ barcode scan ============ */
  var scanBuf = '', scanLast = 0, scanReady = false;
  function setupScan() {
    if (scanReady) return;
    scanReady = true;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (scanBuf && (Date.now() - scanLast) < 200) {
          var code = scanBuf; scanBuf = '';
          handleScan(code);
        } else scanBuf = '';
        return;
      }
      if (e.key && e.key.length === 1) {
        var now = Date.now();
        scanBuf = (now - scanLast < 200) && scanBuf ? scanBuf + e.key : e.key;
        scanLast = now;
        if (scanBuf.length > 48) scanBuf = '';
      } else if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
        scanBuf = '';
      }
    });
  }
  function handleScan(code) {
    code = String(code).trim();
    if (!code) return;
    var p = state.products.find(function (x) { return (x.barcode && String(x.barcode) === code) || (x.sku && String(x.sku) === code); });
    var page = currentPage();
    if (page === 'billing') {
      if (!p) { toast('Barcode “' + code + '” not found'); return; }
      var itemSelect = $('#itemSelect');
      if (itemSelect) { itemSelect.value = p.id; syncRate(); }
      saleLines.push({ productId: p.id, name: p.name, qty: 1, rate: Number(p.price || 0) });
      renderSaleItems();
      toast('Scanned: ' + p.name);
      return;
    }
    if (page === 'inventory') {
      var search = $('#productSearch');
      if (search) { search.value = code; renderInventory(); }
      toast(p ? 'Scanned: ' + p.name : 'Barcode “' + code + '” not found');
      return;
    }
    if (p) toast('Scanned: ' + p.name + ' · ' + p.sku || '');
    else toast('Barcode “' + code + '” not in your catalogue');
  }

  /* ============ sale form ============ */
  var saleLines = [];
  function productOptions() {
    var s = $('#itemSelect'); if (!s) return;
    var current = s.value;
    s.innerHTML = state.products.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + ' · ' + money(p.price) + '</option>';
    }).join('');
    if (current && state.products.some(function (p) { return String(p.id) === current; })) s.value = current;
    syncRate();
  }
  function selectedProduct() { var s = $('#itemSelect'); if (!s) return null; return state.products.find(function (p) { return String(p.id) === String(s.value); }) || state.products[0]; }
  function syncRate() { var p = selectedProduct(); if (p && $('#itemRate')) $('#itemRate').value = p.price; }
  function saleTotals() {
    var discount = Math.max(0, Number($('#discount') ? $('#discount').value : 0) || 0);
    var subtotal = saleLines.reduce(function (a, l) { return a + l.qty * l.rate; }, 0);
    var d = Math.min(discount, subtotal);
    return { subtotal: subtotal, discount: d, total: Math.max(0, subtotal - d) };
  }
  function renderSaleItems() {
    var box = $('#saleItems'); if (!box) return;
    var count = $('#lineCount'); if (count) count.textContent = saleLines.length;
    box.innerHTML = saleLines.length
      ? saleLines.map(function (l, idx) {
          return '<div class="sale-item"><div><b>' + esc(l.name) + '</b><small>' + l.qty + ' × ' + money(l.rate) + '</small></div>' +
            '<div class="sale-item-side"><b>' + money(l.qty * l.rate) + '</b>' +
            '<button type="button" class="action-btn danger" data-remove="' + idx + '" aria-label="Remove ' + esc(l.name) + '">×</button></div></div>';
        }).join('')
      : '<p class="muted" style="padding:6px 2px">No items yet. Pick a product and press “Add item”.</p>';
    updatePreview();
  }
  function addSaleItem() {
    var p = selectedProduct();
    if (!p) { toast('Add a product or service first'); return; }
    var qty = Number($('#itemQty').value);
    if (!(qty > 0)) { toast('Enter a valid quantity'); return; }
    var rate = Number($('#itemRate').value);
    if (!(rate >= 0)) { toast('Enter a valid selling price'); return; }
    if (!isService(p) && qty > p.stock) { toast('Not enough stock for ' + p.name); return; }
    saleLines.push({ productId: p.id, name: p.name, qty: qty, rate: rate });
    $('#itemQty').value = 1;
    syncRate();
    renderSaleItems();
  }
  function updatePreview() {
    if (!$('#preview') || !$('#previewTotal')) return;
    var t = saleTotals();
    $('#previewTotal').textContent = money(t.total);
    var tred = Number($('#tendered') && $('#tendered').value) || 0;
    var changeEl = $('#changeDue');
    if (changeEl) {
      var diff = tred - t.total;
      changeEl.textContent = diff >= 0 ? 'Change ' + money(diff) : 'Shortfall ' + money(Math.abs(diff));
      changeEl.style.color = diff >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    var name = $('#customerName').value.trim();
    var linesHtml = saleLines.map(function (l) {
      return '<div class="line-item"><span>' + esc(l.name) + ' × ' + l.qty + '</span><b>' + money(l.qty * l.rate) + '</b></div>';
    }).join('') || '<div class="line-item"><span>No items yet</span><b>—</b></div>';
    $('#preview').innerHTML =
      '<div class="bill-head"><div><b>' + esc(state.businessName) + '</b><div class="muted">Business workspace</div></div>' +
      '<div class="text-right"><b>RECEIPT</b><div class="muted">Powered by Salesventory</div></div></div>' +
      '<p><b>Customer</b><br>' + esc(name || 'Walk-in customer') + '</p>' +
      '<p class="muted">' + esc($('#phone').value.trim() || 'No mobile number') + '</p>' +
      linesHtml +
      '<div class="line-item"><span>Discount</span><span>− ' + money(t.discount) + '</span></div>' +
      '<div class="line-item"><span>Payment</span><span>' + esc(($('#paymentMethod').value || 'upi').toUpperCase()) + ' · ' + esc($('#paymentStatus').value || 'paid') + '</span></div>' +
      '<div class="bill-total"><span>Total</span><span>' + money(t.total) + '</span></div>' +
      '<p class="muted" style="font-size:11px;padding-bottom:20px">Thank you for your business.</p>';
  }
  function bindSale() {
    var q = function (s) { return $(s); };
    if (q('#itemSelect')) q('#itemSelect').addEventListener('change', syncRate);
    if (q('#addItemBtn')) q('#addItemBtn').addEventListener('click', addSaleItem);
    $('#saleItems').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove]');
      if (!btn) return;
      saleLines.splice(Number(btn.dataset.remove), 1);
      renderSaleItems();
    });
    ['#discount', '#customerName', '#phone', '#paymentMethod', '#paymentStatus', '#tendered'].forEach(function (id) {
      var el = q(id); if (el) el.addEventListener('input', updatePreview);
    });
    var hBtn = q('#holdSale');
    if (hBtn) hBtn.addEventListener('click', function () {
      if (!saleLines.length) { toast('Nothing to hold — add items first'); return; }
      saveHeldSale();
      saleLines = [];
      q('#invoiceForm').reset();
      q('#itemQty').value = 1;
      q('#discount').value = 0;
      q('#tendered').value = '';
      renderSaleItems(); updatePreview(); renderHeldMenu();
      toast('Sale held — resume it any time');
    });
    var rBtn = q('#resumeSale');
    if (rBtn) rBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var m = q('#heldMenu'); if (m) m.hidden = !m.hidden;
    });
    var hm = q('#heldMenu');
    if (hm) hm.addEventListener('click', function (e) {
      var pick = e.target.closest('[data-held]');
      if (pick) { resumeHeldSale(Number(pick.dataset.held)); return; }
      var x = e.target.closest('[data-heldx]');
      if (x) {
        var carts = heldSales(); carts.splice(Number(x.dataset.heldx), 1);
        localStorage.setItem('sv-held-sales', JSON.stringify(carts));
        renderHeldMenu();
      }
    });
    document.addEventListener('click', function (e) {
      var m = q('#heldMenu');
      if (m && !m.hidden && e.target.closest && !e.target.closest('.quick-create')) m.hidden = true;
    });
    renderHeldMenu();
    $('#invoiceForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!saleLines.length) { toast('Add at least one item to this sale'); return; }
      var t = saleTotals();
      var discount = Math.max(0, Number($('#discount').value) || 0);
      if (discount > t.subtotal) { toast('Discount cannot exceed the subtotal'); return; }
      if (!cloud) { toast('Cloud checkout is not available'); return; }
      var items = saleLines.map(function (l) { return { product_id: l.productId, quantity: l.qty, rate: l.rate }; });
      var done = function () {
        e.target.reset();
        saleLines = [];
        $('#itemQty').value = 1;
        $('#discount').value = 0;
        var tred = $('#tendered'); if (tred) tred.value = '';
        productOptions(); renderAll();
        toast('Sale completed successfully');
        gotoView('history');
      };
      var submit = $('#invoiceForm').querySelector('button[type=submit]');
      if (submit) submit.disabled = true;
      try {
        await cloud.invoices.checkoutMulti({
          p_business_id: state.businessId,
          p_customer_name: $('#customerName').value.trim() || 'Walk-in customer',
          p_customer_phone: $('#phone').value.trim(),
          p_items: items,
          p_discount: discount,
          p_payment_method: $('#paymentMethod').value,
          p_payment_status: $('#paymentStatus').value,
          p_branch_id: null,
          p_idempotency_key: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : null
        });
        await refreshCloudData();
        done();
      } catch (err) { toast(friendly(err)); }
      finally { if (submit) submit.disabled = false; }
    });
  }

  /* ============ POS held sales + change calc ============ */
  function heldSales() {
    try { return JSON.parse(localStorage.getItem('sv-held-sales')) || []; } catch (e) { return []; }
  }
  function saveHeldSale() {
    var cart = {
      ts: Date.now(), customer: $('#customerName').value.trim() || 'Walk-in customer',
      count: saleLines.length, total: saleTotals().total,
      lines: saleLines.slice(), discount: $('#discount').value, phone: $('#phone').value,
      method: $('#paymentMethod').value, status: $('#paymentStatus').value
    };
    var carts = heldSales();
    carts.unshift(cart);
    localStorage.setItem('sv-held-sales', JSON.stringify(carts.slice(0, 5)));
  }
  function renderHeldMenu() {
    var menu = $('#heldMenu'), cnt = $('#heldCount');
    var carts = heldSales();
    if (cnt) cnt.textContent = carts.length ? '· ' + carts.length : '';
    if (!menu) return;
    menu.innerHTML = carts.length
      ? carts.map(function (c, idx) {
          return '<div class="held-item"><button type="button" class="held-pick" data-held="' + idx + '"><b>' + esc(c.customer) + '</b><small>' + c.count + ' item(s) · ' + money(c.total) + ' · ' + new Date(c.ts).toLocaleString() + '</small></button><button type="button" class="held-x" data-heldx="' + idx + '" aria-label="Discard held sale">×</button></div>';
        }).join('')
      : '<div class="gs-empty">No held sales.</div>';
  }
  function resumeHeldSale(idx) {
    var carts = heldSales();
    var c = carts[idx]; if (!c) return;
    saleLines = c.lines || [];
    $('#customerName').value = c.customer || '';
    $('#phone').value = c.phone || '';
    $('#discount').value = c.discount || 0;
    $('#paymentMethod').value = c.method || 'upi';
    $('#paymentStatus').value = c.status || 'paid';
    carts.splice(idx, 1);
    localStorage.setItem('sv-held-sales', JSON.stringify(carts));
    renderSaleItems(); updatePreview(); renderHeldMenu();
    toast('Held sale resumed');
  }

  /* ============ inventory ============ */
  var stockFilter = 'all';
  function renderInventory() {
    var rows = $('#inventoryRows'); if (!rows) return;
    var q = ($('#productSearch').value || '').toLowerCase();
    var list = state.products
      .filter(function (p) { return (p.name + ' ' + (p.category || '') + ' ' + (p.sku || '') + ' ' + (p.barcode || '')).toLowerCase().indexOf(q) !== -1; })
      .filter(function (p) {
        return stockFilter === 'low' ? (!isService(p) && p.stock <= p.reorder) : stockFilter === 'in' ? (isService(p) || p.stock > p.reorder) : true;
      });
    var canManage = caps().manageProducts;
    rows.innerHTML = list.map(function (p) {
      var actions = canManage
        ? '<button class="action-btn" data-act="edit-product" data-id="' + p.id + '">Edit</button>' +
          '<button class="action-btn danger" data-act="delete-product" data-id="' + p.id + '">Delete</button>'
        : '<span class="muted" style="font-size:12px">Read-only</span>';
      var low = !isService(p) && p.stock <= p.reorder;
      var meta = (p.sku ? 'SKU ' + esc(p.sku) : 'SKU SV-' + String(p.id).padStart(4, '0')) + (p.barcode ? ' · ' + esc(p.barcode) : '');
      return '<tr data-row-id="p-' + p.id + '">' +
        '<td data-label="Product"><div><b>' + esc(p.name) + '</b><div class="muted sku-tag">' + meta + '</div></div></td>' +
        '<td data-label="Category">' + (p.category ? '<span class="filter-chip static">' + esc(p.category) + '</span>' : '—') + '</td>' +
        '<td data-label="Cost">' + money(p.cost || 0) + '</td>' +
        '<td data-label="Selling"><b>' + money(p.price) + '</b></td>' +
        '<td data-label="Stock">' + (isService(p) ? 'Service' : p.stock + ' ' + esc(p.unit || 'units')) + '</td>' +
        '<td data-label="Reorder">' + (isService(p) ? '—' : p.reorder + ' ' + esc(p.unit || 'units')) + '</td>' +
        '<td data-label="Status"><span class="status' + (low ? ' low' : '') + '">' + (isService(p) ? 'Active' : (low ? 'Low stock' : 'In stock')) + '</span></td>' +
        '<td data-label="Actions">' + actions + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="8" class="empty-cell">No matching products.</td></tr>';
    var addBtn = $('#addProduct');
    if (addBtn) addBtn.hidden = !canManage;
    var impBtn = $('#importCsvBtn');
    if (impBtn) impBtn.hidden = !canManage;
  }
  function openProductDialog(id) {
    if (!id) {
      $('#productForm').reset();
      $('#pId').value = '';
      $('#pStock').value = 1; $('#pReorder').value = 5; $('#pUnit').value = 'pcs';
      $('#pStock').disabled = false; $('#pReorder').disabled = false;
      $('#pService').checked = false;
      $('#productDialogTitle').textContent = 'Add product';
    } else {
      var p = state.products.find(function (x) { return String(x.id) === String(id); });
      if (!p) return;
      $('#productDialogTitle').textContent = 'Edit product';
      $('#pId').value = p.id;
      $('#pName').value = p.name;
      $('#pCategory').value = p.category || '';
      $('#pSku').value = p.sku || '';
      $('#pBarcode').value = p.barcode || '';
      $('#pUnit').value = p.unit && p.unit !== 'service' ? p.unit : 'pcs';
      $('#pCost').value = p.cost || 0;
      $('#pPrice').value = p.price;
      $('#pService').checked = isService(p);
      $('#pStock').value = isService(p) ? 0 : Number(p.stock);
      $('#pReorder').value = isService(p) ? 0 : Number(p.reorder);
      $('#pStock').disabled = isService(p);
      $('#pReorder').disabled = isService(p);
    }
    $('#productDialog').showModal();
  }
  $('#pService') && $('#pService').addEventListener('change', function () {
    var svc = $('#pService').checked;
    $('#pStock').disabled = svc; $('#pReorder').disabled = svc;
    if (svc) { $('#pStock').value = 0; $('#pReorder').value = 0; }
    else { $('#pStock').value = 1; $('#pReorder').value = 5; }
  });
  function bindInventory() {
    bindCsvImport('product');
    var reorder = $('#reorderListBtn');
    if (reorder) reorder.addEventListener('click', printRestockList);
    var catalogue = $('#catalogueShareBtn');
    if (catalogue) catalogue.addEventListener('click', shareCatalogue);
    if ($('#productSearch')) $('#productSearch').addEventListener('input', renderInventory);
    $$('.filter-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        stockFilter = c.dataset.filter || 'all';
        $$('.filter-chip').forEach(function (x) { var on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
        renderInventory();
      });
    });
    if ($('#addProduct')) $('#addProduct').addEventListener('click', function () { openProductDialog(null); });
    $('#cancelProduct').addEventListener('click', function () { $('#productDialog').close(); });
    $('#productForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var id = $('#pId').value;
      var svc = $('#pService').checked;
      var data = {
        name: $('#pName').value.trim(),
        category: $('#pCategory').value.trim(),
        sku: $('#pSku').value.trim(),
        barcode: $('#pBarcode').value.trim(),
        unit: $('#pUnit').value.trim() || 'pcs',
        cost: Number($('#pCost').value),
        price: Number($('#pPrice').value),
        stock: svc ? 999 : Number($('#pStock').value),
        reorder: svc ? 0 : Number($('#pReorder').value),
        service: svc
      };
      if (!data.name) { toast('Enter a product or service name'); return; }
      if (data.price < 0 || data.cost < 0) { toast('Enter valid price values'); return; }
      try {
        if (id) await cloud.products.update(id, data);
        else await cloud.products.create(state.businessId, data);
        $('#productDialog').close();
        await refreshCloudData();
        toast(id ? 'Product updated' : 'Product added');
      } catch (err) { toast(friendly(err)); }
    });
    $('#inventoryRows').addEventListener('click', onInventoryAction);
  }
  async function onInventoryAction(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var id = btn.dataset.id;
    if (btn.dataset.act === 'edit-product') { openProductDialog(id); return; }
    if (btn.dataset.act === 'delete-product') {
      if (state.products.length === 1) { toast('Keep at least one product'); return; }
      var p = state.products.find(function (x) { return String(x.id) === String(id); });
      var ok = await confirmDialog('Delete product?', p ? '“' + p.name + '” and its stock history will be removed.' : 'Delete this product?');
      if (!ok) return;
      try { await cloud.products.remove(id); await refreshCloudData(); toast('Product deleted'); }
      catch (err) { toast(friendly(err)); }
    }
  }

  /* ============ customers ============ */
  function customerKey(c) { return (c.phone || c.name || '').toLowerCase(); }
  function customers() {
    var stats = {};
    state.invoices.forEach(function (i) {
      var key = customerKey(i);
      if (!stats[key]) stats[key] = { name: i.customer, phone: i.phone, orders: 0, total: 0, last: i.date, ts: i.ts || 0, outstanding: 0, open: 0 };
      stats[key].orders++;
      stats[key].total += i.total;
      var bal = Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0);
      if (bal > 0) { stats[key].open++; stats[key].outstanding += bal; }
      if ((i.ts || 0) >= stats[key].ts) { stats[key].last = i.date; stats[key].ts = i.ts || 0; }
    });
    var map = {};
    state.customers.forEach(function (c) {
      var key = customerKey(c);
      var s = stats[key] || {};
      map[key] = Object.assign({}, c, {
        name: c.name || s.name || 'Unknown', phone: c.phone || s.phone || '',
        email: c.email || '', company: c.company || '', address: c.address || '',
        tags: c.tags || [], notes: c.notes || '', status: c.status || 'active',
        orders: s.orders || 0, total: s.total || 0, last: s.last || null, outstanding: s.outstanding || 0, open: s.open || 0
      });
    });
    Object.keys(stats).forEach(function (key) {
      if (map[key]) return;
      map[key] = { name: stats[key].name, phone: stats[key].phone || '', orders: stats[key].orders, total: stats[key].total, last: stats[key].last, outstanding: stats[key].outstanding, open: stats[key].open, id: null, status: 'active', email: '', company: '', address: '', tags: [], notes: [] };
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return (b.total || 0) - (a.total || 0); });
  }
  var selectedCustomerKey = null;
  var customerDraftId = null;
  var customerTagFilter = 'all';
  function rawCustomerByKey(key) {
    return state.customers.find(function (c) { return customerKey(c) === key; }) || null;
  }
  function openCustomerDialog(key) {
    if (!state.businessId) { toast('Open your cloud workspace first'); return; }
    if (!caps().manageCustomers) { toast('Only the owner or a manager can manage customers'); return; }
    var c = key ? rawCustomerByKey(key) : null;
    customerDraftId = c ? c.id : null;
    if ($('#customerDialogTitle')) $('#customerDialogTitle').textContent = customerDraftId ? 'Edit customer' : 'New customer';
    $('#custName').value = c ? c.name : '';
    $('#custPhone').value = c ? (c.phone || '') : '';
    $('#custEmail').value = c ? (c.email || '') : '';
    $('#custCompany').value = c ? (c.company || '') : '';
    $('#custAddress').value = c ? (c.address || '') : '';
    $('#custTags').value = c ? (c.tags || []).join(', ') : '';
    $('#custNotes').value = c ? (c.notes || '') : '';
    $('#customerDialog').showModal();
    setTimeout(function () { $('#custName').focus(); }, 30);
  }
  async function archiveCustomer(key) {
    if (!caps().manageCustomers) { toast('Only the owner or a manager can manage customers'); return; }
    var c = rawCustomerByKey(key);
    if (!c) { toast('This customer has no saved record to archive'); return; }
    var ok = await confirmDialog('Archive customer?', c.name + ' stays in history but is hidden from the active list. This can be re-enabled later.');
    if (!ok) return;
    try { await cloud.customers.archive(c.id); await refreshCloudData(); toast('Customer archived'); }
    catch (err) { toast(friendly(err)); }
  }
  function renderCustomers() {
    var rows = $('#customerRows'); if (!rows) return;
    var hasProfile = $('#customerProfile');
    if (hasProfile && selectedCustomerKey) { hasProfile.hidden = false; renderCustomerProfile(); }
    else if (hasProfile) hasProfile.hidden = true;
    var q = ($('#customerSearch').value || '').toLowerCase();
    var list = customers().filter(function (c) { return (c.name + ' ' + (c.phone || '') + ' ' + (c.company || '') + ' ' + (c.tags || []).join(' ')).toLowerCase().indexOf(q) !== -1; });
    if (customerTagFilter !== 'all') {
      list = list.filter(function (c) {
        return customerTagFilter === 'active' ? c.status !== 'inactive' :
          customerTagFilter === 'archived' ? c.status === 'inactive' : (c.tags || []).indexOf(customerTagFilter) !== -1;
      });
    }
    var chips = $('#custTagChips');
    if (chips) {
      var tagCount = {};
      customers().forEach(function (c) { (c.tags || []).forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; }); });
      var tagKeys = Object.keys(tagCount).sort().slice(0, 12);
      var segs = [
        { key: 'all', label: 'All', n: customers().length },
        { key: 'active', label: 'Active', n: customers().filter(function (c) { return c.status !== 'inactive'; }).length },
        { key: 'archived', label: 'Archived', n: customers().filter(function (c) { return c.status === 'inactive'; }).length }
      ];
      chips.innerHTML = segs.map(function (s) {
        return '<button class="filter-chip' + (customerTagFilter === s.key ? ' active' : '') + '" data-custtag="' + s.key + '" type="button">' + s.label + ' · ' + s.n + '</button>';
      }).join('') + tagKeys.filter(function (t) { return t; }).map(function (t) {
        return '<button class="filter-chip' + (customerTagFilter === t ? ' active' : '') + '" data-custtag="' + esc(t) + '" type="button"><span>' + esc(t) + ' · ' + tagCount[t] + '</span></button>';
      }).join('');
    }
    var canManage = caps().manageCustomers;
    var cImp = $('#importCsvBtn');
    if (cImp) cImp.hidden = !canManage;
    rows.innerHTML = list.map(function (c) {
      var key = customerKey(c);
      var actions = '<button class="action-btn" data-cust="' + esc(key) + '" type="button">Statement</button>';
      if (canManage) {
        actions += '<button class="action-btn" data-act="edit-customer" data-key="' + esc(key) + '" type="button">Edit</button>';
        if (c.status !== 'inactive') actions += '<button class="action-btn danger" data-act="archive-customer" data-key="' + esc(key) + '" type="button">Archive</button>';
      }
      var phone = String(c.phone || '').replace(/\D/g, '');
      if (phone) actions += '<a class="action-btn" href="https://wa.me/91' + phone + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(c.name) + '">WhatsApp</a>';
      return '<tr data-cust="' + esc(key) + '" class="cust-row">' +
        '<td data-label="Customer"><div class="cell-person"><span class="store-avatar">' + esc(initials(c.name)) + '</span><b>' + esc(c.name) + '</b>' +
        (c.company ? '<small>' + esc(c.company) + '</small>' : '') +
        (c.status === 'inactive' ? ' <span class="status low">archived</span>' : '') +
        '</div></td>' +
        '<td data-label="Phone">' + esc(c.phone || '—') + '</td>' +
        '<td data-label="Transactions">' + c.orders + '</td>' +
        '<td data-label="Lifetime value"><b>' + money(c.total) + '</b></td>' +
        '<td data-label="Last purchase">' + esc(c.last || '—') + '</td>' +
        '<td data-label="Outstanding"><b>' + (c.open ? money(c.outstanding) : '—') + '</b></td>' +
        '<td data-label="Actions">' + actions + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="7" class="empty-cell">No matching customers. Add one or record a sale.</td></tr>';
  }
  function customerMatches(c, key) { return customerKey(c) === key; }
  function customerStatements() {
    return state.invoices
      .filter(function (i) { return customerMatches(i, selectedCustomerKey); })
      .slice()
      .sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  }
  function statementRange() {
    var from = $('#stmtFrom'), to = $('#stmtTo');
    var lo = from && from.value ? dayStart(new Date(from.value)).getTime() : 0;
    var hi = to && to.value ? dayEnd(new Date(to.value)).getTime() : Number.MAX_SAFE_INTEGER;
    return { lo: lo, hi: hi };
  }
  function renderCustomerProfile() {
    var list = customers();
    var c = list.filter(function (x) { return customerKey(x) === selectedCustomerKey; })[0];
    if (!c) { closeCustomerProfile(); return; }
    if ($('#cpAvatar')) $('#cpAvatar').textContent = initials(c.name);
    if ($('#cpName')) $('#cpName').textContent = c.name;
    if ($('#cpPhone')) {
      var bits = [];
      if (c.phone) bits.push('Phone · ' + c.phone);
      if (c.email) bits.push(c.email);
      if (c.company) bits.push(c.company);
      $('#cpPhone').textContent = bits.join('  ·  ') || 'No contact details on record';
    }
    var phone = String(c.phone || '').replace(/\D/g, '');
    var wa = $('#cpWhatsApp');
    if (wa) { if (phone) { wa.href = 'https://wa.me/91' + phone; wa.hidden = false; } else { wa.hidden = true; } }
    if ($('#cpOrders')) $('#cpOrders').textContent = c.orders;
    if ($('#cpLifetime')) $('#cpLifetime').textContent = money(c.total);
    if ($('#cpOutstanding')) $('#cpOutstanding').textContent = money(c.outstanding);
    if ($('#cpLast')) $('#cpLast').textContent = c.last || '—';
    var invs = customerStatements();
    var range = statementRange();
    var win = invs.filter(function (i) { return (i.ts || 0) >= range.lo && (i.ts || 0) <= range.hi; });
    var table = $('#statementTable');
    if (table) {
      table.innerHTML = win.length
        ? win.map(function (i) {
            var bal = Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0);
            return '<tr>' +
              '<td data-label="Date">' + esc(i.date) + '</td>' +
              '<td data-label="Invoice"><span class="sku-tag">' + esc(i.id || i.number || '') + '</span></td>' +
              '<td data-label="Item">' + esc(i.product || '—') + '</td>' +
              '<td data-label="Total">' + money(i.total) + '</td>' +
              '<td data-label="Paid">' + money(i.paid || 0) + '</td>' +
              '<td data-label="Balance">' + (bal > 0 ? '<b>' + money(bal) + '</b>' : '—') + '</td>' +
              '<td data-label="Status"><span class="status' + (i.paymentStatus === 'paid' ? '' : i.paymentStatus === 'partial' ? ' warn' : ' low') + '">' + esc(i.paymentStatus || 'paid') + '</span></td>' +
              '</tr>';
          }).join('')
        : '<tr><td colspan="7" class="empty-cell">No invoices in this period.</td></tr>';
    }
    var closing = win.reduce(function (a, i) { return a + (Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0)); }, 0);
    if ($('#stmtClosing')) $('#stmtClosing').textContent = 'Closing: ' + money(closing);
    if ($('#customerProfile')) $('#customerProfile').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function openCustomerProfile(key) {
    selectedCustomerKey = key;
    var box = $('#customerProfile');
    if (box) box.hidden = false;
    renderCustomerProfile();
  }
  function closeCustomerProfile() {
    selectedCustomerKey = null;
    var box = $('#customerProfile');
    if (box) box.hidden = true;
    var rows = $('#customerRows');
    if (rows) rows.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function statementText() {
    var list = customers();
    var c = list.filter(function (x) { return customerKey(x) === selectedCustomerKey; })[0];
    if (!c) return '';
    var range = statementRange();
    var win = customerStatements().filter(function (i) { return (i.ts || 0) >= range.lo && (i.ts || 0) <= range.hi; });
    var closing = win.reduce(function (a, i) { return a + (Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0)); }, 0);
    var lines = [];
    lines.push('Salesventory — Customer statement');
    lines.push(c.name + (c.phone ? ' · ' + c.phone : ''));
    lines.push('Created ' + fmtDay(Date.now()));
    lines.push('');
    lines.push('Date'.padEnd(12) + 'Invoice'.padEnd(14) + 'Total'.padEnd(12) + 'Paid'.padEnd(10) + 'Balance');
    win.forEach(function (i) {
      var bal = Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0);
      lines.push((i.date || '').padEnd(12) + (i.id || '').slice(0, 13).padEnd(14) + money(i.total).padEnd(12) + money(i.paid || 0).padEnd(10) + money(bal));
    });
    lines.push('');
    lines.push('Closing balance: ' + money(closing));
    return lines.join('\n');
  }
  function copyStatement() {
    var txt = statementText();
    if (!txt) { toast('Nothing to copy'); return; }
    function done() { toast('Statement copied'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    } else { fallbackCopy(txt, done); }
  }
  function fallbackCopy(txt, done) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Copy not supported'); }
    document.body.removeChild(ta);
  }
  function downloadStatementCSV() {
    var list = customers();
    var c = list.filter(function (x) { return customerKey(x) === selectedCustomerKey; })[0];
    if (!c) return;
    var range = statementRange();
    var win = customerStatements().filter(function (i) { return (i.ts || 0) >= range.lo && (i.ts || 0) <= range.hi; });
    var rows = [['Date', 'Invoice', 'Item', 'Total', 'Paid', 'Balance', 'Status']];
    win.forEach(function (i) {
      var bal = Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0);
      rows.push([i.date || '', i.id || '', i.product || '', i.total, i.paid || 0, bal, i.paymentStatus || '']);
    });
    var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'customer-statement-' + (c.name || 'customer').replace(/\s+/g, '-').toLowerCase() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    toast('Statement exported as CSV');
  }
  function printStatement() {
    var list = customers();
    var c = list.filter(function (x) { return customerKey(x) === selectedCustomerKey; })[0];
    if (!c) { toast('Nothing to print'); return; }
    var range = statementRange();
    var win = customerStatements().filter(function (i) { return (i.ts || 0) >= range.lo && (i.ts || 0) <= range.hi; });
    var closing = win.reduce(function (a, i) { return a + (Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0)); }, 0);
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Customer statement — ' + esc(c.name) + '</title>' +
      '<style>body{font:13px/1.6 system-ui,sans-serif;color:#0F172A;margin:36px}h1{font-size:20px;margin:0 0 2px}p{color:#46566D;margin:2px 0}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #E4EAF2}th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#46566D}.sum{margin-top:16px;font-weight:700}</style></head><body>' +
      '<h1>Salesventory — Customer statement</h1>' +
      '<p><b>' + esc(c.name) + '</b></p>' +
      '<p>' + (c.phone ? esc(c.phone) : 'No phone on record') + '</p>' +
      '<p>Prepared ' + fmtDay(Date.now()) + '</p>' +
      '<table><thead><tr><th>Date</th><th>Invoice</th><th>Item</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>' +
      (win.map(function (i) {
        var bal = Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0);
        return '<tr><td>' + esc(i.date) + '</td><td>' + esc(i.id || '') + '</td><td>' + esc(i.product || '') + '</td><td>' + money(i.total) + '</td><td>' + money(i.paid || 0) + '</td><td>' + (bal > 0 ? money(bal) : '—') + '</td><td>' + esc(i.paymentStatus || '') + '</td></tr>';
      }).join('') || '<tr><td colspan="7">No invoices in this period.</td></tr>') +
      '</tbody></table>' +
      '<p class="sum">Closing balance: ' + money(closing) + '</p>' +
      '</body></html>';
    var pw = window.open('', '_blank', 'width=760,height=900');
    if (pw) { pw.document.write(html); pw.document.close(); pw.focus(); setTimeout(function () { pw.print(); }, 350); }
    else toast('Allow pop-ups to print');
  }
  function bindCustomers() {
    bindCsvImport('customer');
    var tagChips = $('#custTagChips');
    if (tagChips) tagChips.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-custtag]');
      if (!chip) return;
      customerTagFilter = chip.dataset.custtag;
      selectedCustomerKey = null;
      renderCustomers();
    });
    var search = $('#customerSearch');
    if (search) search.addEventListener('input', function () { selectedCustomerKey = null; renderCustomers(); });
    var rows = $('#customerRows');
    if (rows) rows.addEventListener('click', function (e) {
      var actBtn = e.target.closest('[data-act="edit-customer"], [data-act="archive-customer"]');
      if (actBtn) {
        e.preventDefault();
        if (actBtn.dataset.act === 'edit-customer') { openCustomerDialog(actBtn.dataset.key); return; }
        archiveCustomer(actBtn.dataset.key);
        return;
      }
      var btn = e.target.closest('[data-cust]');
      if (!btn) return;
      if (e.target.closest('a')) return;
      e.preventDefault();
      openCustomerProfile(btn.dataset.cust);
    });
    var nb = $('#newCustomerBtn');
    if (nb) nb.addEventListener('click', function () { openCustomerDialog(null); });
    var cd = $('#customerDialog');
    if (cd) {
      $('#customerCancel').addEventListener('click', function () { cd.close(); });
      $('#customerForm').addEventListener('submit', async function (ev) {
        ev.preventDefault();
        if (!state.businessId) { toast('Open your cloud workspace first'); return; }
        var name = $('#custName').value.trim();
        if (!name) { toast('Customer name is required'); return; }
        var data = {
          name: name, phone: $('#custPhone').value.trim() || null,
          email: $('#custEmail').value.trim() || null, company: $('#custCompany').value.trim() || null,
          address: $('#custAddress').value.trim() || null,
          tags: $('#custTags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
          notes: $('#custNotes').value.trim() || null
        };
        try {
          if (customerDraftId) await cloud.customers.update(customerDraftId, data);
          else await cloud.customers.create(state.businessId, data);
          customerDraftId = null;
          await refreshCloudData();
          cd.close();
          toast('Customer saved');
        } catch (err) { toast(friendly(err)); }
      });
    }
    var pf = $('#customerProfile');
    if (pf) {
      var byId = function (id) { return $(id); };
      var close = byId('#cpClose');
      if (close) close.addEventListener('click', closeCustomerProfile);
      var copy = byId('#cpCopy');
      if (copy) copy.addEventListener('click', copyStatement);
      var csv = byId('#cpCsv');
      if (csv) csv.addEventListener('click', downloadStatementCSV);
      var pr = byId('#cpPrint');
      if (pr) pr.addEventListener('click', printStatement);
      var stmt = byId('#cpShareStmt');
      if (stmt) stmt.addEventListener('click', function () { shareStatement(rawCustomerByKey(selectedCustomerKey)); });
      ['#stmtFrom', '#stmtTo'].forEach(function (sel) {
        var el = $(sel);
        if (el) el.addEventListener('change', renderCustomerProfile);
      });
    }
  }

  /* ============ expenses ============ */
  var expenseFilter = 'all';
  function renderExpenses() {
    var list = $('#expenseList'); if (!list) return;
    var byCat = {};
    var total = 0;
    state.expenses.forEach(function (x) {
      total += x.amount;
      var k = x.category || 'Miscellaneous';
      if (!byCat[k]) byCat[k] = 0;
      byCat[k] += x.amount;
    });
    var keys = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    var chips = $('#expenseCats');
    if (chips) {
      if (!keys.length) {
        chips.innerHTML = '<span class="empty">No expenses yet — categories appear here.</span>';
      } else {
        chips.innerHTML = '<button class="filter-chip' + (expenseFilter === 'all' ? ' active' : '') + '" data-cat="all" type="button">All · ' + money(total) +
          '</button>' + keys.map(function (k) {
            return '<button class="filter-chip' + (expenseFilter === k ? ' active' : '') + '" data-cat="' + esc(k) + '" type="button"><span>' + esc(k) + ' · ' + money(byCat[k]) + '</span></button>';
          }).join('');
      }
    }
    var shown = expenseFilter === 'all' ? state.expenses : state.expenses.filter(function (x) { return (x.category || 'Miscellaneous') === expenseFilter; });
    var shownTotal = shown.reduce(function (a, b) { return a + b.amount; }, 0);
    if ($('#expenseTotal')) $('#expenseTotal').textContent = money(shownTotal);
    var canDelete = caps().deleteExpenses;
    list.innerHTML = shown.map(function (x) {
      var del = canDelete ? '<button class="action-btn danger" data-act="delete-expense" data-id="' + x.id + '" aria-label="Delete expense">×</button>' : '';
      return '<div class="expense-item"><div><b>' + esc(x.category) + '</b><small>' + esc(x.note || x.date) + '</small></div>' +
        '<div><b>' + money(x.amount) + '</b> ' + del + '</div></div>';
    }).join('') || '<p class="muted" style="padding:16px 4px">No expenses in this category.</p>';
  }
  function bindExpenses() {
    $('#expenseForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = {
        category: $('#expenseCategory').value.trim(),
        amount: Number($('#expenseAmount').value),
        note: $('#expenseNote').value.trim()
      };
      if (!data.category || !(data.amount > 0)) { toast('Enter a category and amount'); return; }
      try {
        await cloud.expenses.create(state.businessId, state.user ? state.user.id : null, data);
        await refreshCloudData(); e.target.reset(); toast('Expense added');
      } catch (err) { toast(friendly(err)); }
    });
    $('#expenseList').addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-act="delete-expense"]');
      if (!btn) return;
      var ok = await confirmDialog('Delete expense?', 'This expense record will be removed. This cannot be undone.');
      if (!ok) return;
      var id = btn.dataset.id;
      try { await cloud.expenses.remove(id); await refreshCloudData(); toast('Expense deleted'); }
      catch (err) { toast(friendly(err)); }
    });
    var chips = $('#expenseCats');
    if (chips) chips.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-cat]');
      if (!chip) return;
      expenseFilter = chip.dataset.cat;
      renderExpenses();
    });
  }

  /* ============ suppliers ============ */
  function supplierOutstanding(s) {
    return state.purchases
      .filter(function (p) { return String(p.supplierId) === String(s.id) && p.status !== 'cancelled'; })
      .reduce(function (a, p) { return a + Math.max(p.balance || 0, 0); }, 0);
  }
  function supplierPurchaseCount(s) {
    return state.purchases.filter(function (p) { return String(p.supplierId) === String(s.id); }).length;
  }
  function renderSuppliers() {
    var rows = $('#supplierRows'); if (!rows) return;
    var q = ($('#supplierSearch').value || '').toLowerCase();
    var canManage = caps().managePurchases;
    var sImp = $('#importCsvBtn');
    if (sImp) sImp.hidden = !canManage;
    rows.innerHTML = state.suppliers.filter(function (s) {
      return (s.name + ' ' + (s.phone || '') + ' ' + (s.gst || '')).toLowerCase().indexOf(q) !== -1;
    }).map(function (s) {
      var bal = supplierOutstanding(s);
      var actions = '<button class="action-btn" data-act="statement-supplier" data-id="' + esc(s.id) + '">Statement</button>';
      if (canManage) actions += '<button class="action-btn" data-act="edit-supplier" data-id="' + esc(s.id) + '">Edit</button><button class="action-btn danger" data-act="delete-supplier" data-id="' + esc(s.id) + '">Delete</button>';
      return '<tr data-sup="' + esc(s.id) + '" class="sup-row">' +
        '<td data-label="Supplier"><div class="cell-person"><span class="store-avatar">' + esc(initials(s.name)) + '</span><div class="cell-main"><b>' + esc(s.name) + '</b>' + (s.contact ? '<small>' + esc(s.contact) + '</small>' : '') + '</div></div></td>' +
        '<td data-label="GSTIN">' + esc(s.gst || '—') + '</td>' +
        '<td data-label="Phone">' + esc(s.phone || '—') + '</td>' +
        '<td data-label="Purchases">' + supplierPurchaseCount(s) + '</td>' +
        '<td data-label="Balance"><b>' + money(bal) + '</b></td>' +
        '<td data-label="Actions">' + actions + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="6" class="empty-cell">No suppliers yet. Click “Add supplier” to get started.</td></tr>';
  }
  var selectedSupplierId = null;
  function supplierStatementRows() {
    return state.purchases
      .filter(function (p) { return String(p.supplierId) === String(selectedSupplierId); })
      .slice()
      .sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  }
  function supplierRange() {
    var from = $('#spFrom'), to = $('#spTo');
    var lo = from && from.value ? dayStart(new Date(from.value)).getTime() : 0;
    var hi = to && to.value ? dayEnd(new Date(to.value)).getTime() : Number.MAX_SAFE_INTEGER;
    return { lo: lo, hi: hi };
  }
  function supplierBalanceOf(p) {
    return (p.status === 'cancelled') ? 0 : Math.max(Number(p.balance || 0), 0);
  }
  function supplierStats(s) {
    var list = state.purchases.filter(function (p) { return String(p.supplierId) === String(s.id) && p.status !== 'cancelled'; });
    var total = list.reduce(function (a, p) { return a + Number(p.total || 0); }, 0);
    var last = list.reduce(function (a, p) { return (!a || (p.ts || 0) > a.ts) ? p : a; }, null);
    return { orders: list.length, total: total, outstanding: list.reduce(function (a, p) { return a + supplierBalanceOf(p); }, 0), last: last ? last.date : null };
  }
  function renderSupplierProfile() {
    var s = state.suppliers.filter(function (x) { return String(x.id) === String(selectedSupplierId); })[0];
    if (!s) { closeSupplierProfile(); return; }
    if ($('#spAvatar')) $('#spAvatar').textContent = initials(s.name);
    if ($('#spName')) $('#spName').textContent = s.name;
    if ($('#spGst')) $('#spGst').textContent = s.gst ? 'GSTIN · ' + s.gst : (s.phone ? 'Phone · ' + s.phone : (s.email ? s.email : 'No contact on record'));
    var stats = supplierStats(s);
    if ($('#spOrders')) $('#spOrders').textContent = stats.orders;
    if ($('#spLifetime')) $('#spLifetime').textContent = money(stats.total);
    if ($('#spOutstanding')) $('#spOutstanding').textContent = money(stats.outstanding);
    if ($('#spLast')) $('#spLast').textContent = stats.last || '—';
    var range = supplierRange();
    var win = supplierStatementRows().filter(function (p) { return (p.ts || 0) >= range.lo && (p.ts || 0) <= range.hi; });
    var table = $('#spStmtTable');
    if (table) {
      table.innerHTML = win.length
        ? win.map(function (p) {
            var bal = supplierBalanceOf(p);
            var pill = p.status === 'cancelled' ? '<span class="status low">cancelled</span>' : '<span class="status' + (p.paymentStatus === 'paid' ? '' : p.paymentStatus === 'partial' ? ' warn' : ' low') + '">' + esc(p.paymentStatus || 'unpaid') + '</span>';
            return '<tr>' +
              '<td data-label="Date">' + esc(p.date || '—') + '</td>' +
              '<td data-label="Bill"><span class="sku-tag">' + esc(p.number || '') + '</span></td>' +
              '<td data-label="Items">' + esc(purchaseItemsLabel(p)) + '</td>' +
              '<td data-label="Total">' + money(p.total) + '</td>' +
              '<td data-label="Paid">' + money(p.paid || 0) + '</td>' +
              '<td data-label="Balance">' + (bal > 0 ? '<b>' + money(bal) + '</b>' : '—') + '</td>' +
              '<td data-label="Status">' + pill + '</td>' +
              '</tr>';
          }).join('')
        : '<tr><td colspan="7" class="empty-cell">No purchases in this period.</td></tr>';
    }
    var closing = win.reduce(function (a, p) { return a + supplierBalanceOf(p); }, 0);
    if ($('#spClosing')) $('#spClosing').textContent = 'Closing: ' + money(closing);
    if ($('#supplierProfile')) $('#supplierProfile').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function openSupplierProfile(id) {
    selectedSupplierId = id;
    var box = $('#supplierProfile');
    if (box) box.hidden = false;
    renderSupplierProfile();
  }
  function closeSupplierProfile() {
    selectedSupplierId = null;
    var box = $('#supplierProfile');
    if (box) box.hidden = true;
    var rows = $('#supplierRows');
    if (rows) rows.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function supplierStatementText() {
    var s = state.suppliers.filter(function (x) { return String(x.id) === String(selectedSupplierId); })[0];
    if (!s) return '';
    var range = supplierRange();
    var win = supplierStatementRows().filter(function (p) { return (p.ts || 0) >= range.lo && (p.ts || 0) <= range.hi; });
    var closing = win.reduce(function (a, p) { return a + supplierBalanceOf(p); }, 0);
    var lines = [];
    lines.push('Salesventory — Supplier statement');
    lines.push(s.name + (s.phone ? ' · ' + s.phone : ''));
    lines.push('Created ' + fmtDay(Date.now()));
    lines.push('');
    lines.push('Date'.padEnd(12) + 'Bill'.padEnd(16) + 'Total'.padEnd(12) + 'Paid'.padEnd(10) + 'Balance');
    win.forEach(function (p) {
      lines.push((p.date || '').padEnd(12) + String(p.number || '').slice(0, 15).padEnd(16) + money(p.total).padEnd(12) + money(p.paid || 0).padEnd(10) + money(supplierBalanceOf(p)));
    });
    lines.push('');
    lines.push('Closing balance: ' + money(closing));
    return lines.join('\n');
  }
  function copySupplierStatement() {
    var txt = supplierStatementText();
    if (!txt) { toast('Nothing to copy'); return; }
    function done() { toast('Statement copied'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    } else { fallbackCopy(txt, done); }
  }
  function downloadSupplierStatementCSV() {
    var s = state.suppliers.filter(function (x) { return String(x.id) === String(selectedSupplierId); })[0];
    if (!s) return;
    var range = supplierRange();
    var win = supplierStatementRows().filter(function (p) { return (p.ts || 0) >= range.lo && (p.ts || 0) <= range.hi; });
    var rows = [['Date', 'Bill', 'Items', 'Total', 'Paid', 'Balance', 'Status']];
    win.forEach(function (p) {
      rows.push([p.date || '', p.number || '', purchaseItemsLabel(p), p.total, p.paid || 0, supplierBalanceOf(p), p.status === 'cancelled' ? 'cancelled' : (p.paymentStatus || '')]);
    });
    var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'supplier-statement-' + (s.name || 'supplier').replace(/\s+/g, '-').toLowerCase() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    toast('Statement exported as CSV');
  }
  function printSupplierStatement() {
    var s = state.suppliers.filter(function (x) { return String(x.id) === String(selectedSupplierId); })[0];
    if (!s) { toast('Nothing to print'); return; }
    var range = supplierRange();
    var win = supplierStatementRows().filter(function (p) { return (p.ts || 0) >= range.lo && (p.ts || 0) <= range.hi; });
    var closing = win.reduce(function (a, p) { return a + supplierBalanceOf(p); }, 0);
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Supplier statement — ' + esc(s.name) + '</title>' +
      '<style>body{font:13px/1.6 system-ui,sans-serif;color:#0F172A;margin:36px}h1{font-size:20px;margin:0 0 2px}p{color:#46566D;margin:2px 0}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #E4EAF2}th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#46566D}.sum{margin-top:16px;font-weight:700}</style></head><body>' +
      '<h1>Salesventory — Supplier statement</h1>' +
      '<p><b>' + esc(s.name) + '</b></p>' +
      '<p>' + (s.phone ? esc(s.phone) : 'No phone on record') + '</p>' +
      '<p>Prepared ' + fmtDay(Date.now()) + '</p>' +
      '<table><thead><tr><th>Date</th><th>Bill</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>' +
      (win.map(function (p) {
        var bal = supplierBalanceOf(p);
        return '<tr><td>' + esc(p.date || '') + '</td><td>' + esc(p.number || '') + '</td><td>' + esc(purchaseItemsLabel(p)) + '</td><td>' + money(p.total) + '</td><td>' + money(p.paid || 0) + '</td><td>' + (bal > 0 ? money(bal) : '—') + '</td><td>' + esc(p.status === 'cancelled' ? 'cancelled' : (p.paymentStatus || '')) + '</td></tr>';
      }).join('') || '<tr><td colspan="7">No purchases in this period.</td></tr>') +
      '</tbody></table>' +
      '<p class="sum">Closing balance: ' + money(closing) + '</p>' +
      '</body></html>';
    var pw = window.open('', '_blank', 'width=760,height=900');
    if (pw) { pw.document.write(html); pw.document.close(); pw.focus(); setTimeout(function () { pw.print(); }, 350); }
    else toast('Allow pop-ups to print');
  }
  var supplierEditId = null;
  function openSupplierDialog(s) {
    supplierEditId = s ? s.id : null;
    $('#supplierDialogTitle').textContent = s ? 'Edit supplier' : 'Add supplier';
    var el = { name: $('#sName'), gst: $('#sGst'), phone: $('#sPhone'), email: $('#sEmail'), contact: $('#sContact'), terms: $('#sTerms'), address: $('#sAddress'), notes: $('#sNotes') };
    el.name.value = s ? s.name : '';
    el.gst.value = s ? s.gst : '';
    el.phone.value = s ? s.phone : '';
    el.email.value = s ? s.email : '';
    el.contact.value = s ? s.contact : '';
    el.terms.value = s ? s.terms : '0';
    el.address.value = s ? s.address : '';
    el.notes.value = s ? s.notes : '';
    $('#supplierDialog').showModal();
  }
  function bindSuppliers() {
    bindCsvImport('supplier');
    $('#addSupplier').addEventListener('click', function () { openSupplierDialog(null); });
    $('#supplierCancel').addEventListener('click', function () { $('#supplierDialog').close(); });
    $('#supplierForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = {
        name: $('#sName').value.trim(),
        gst: $('#sGst').value.trim().toUpperCase(),
        phone: $('#sPhone').value.trim(),
        email: $('#sEmail').value.trim(),
        contact: $('#sContact').value.trim(),
        terms: Number($('#sTerms').value) || 0,
        address: $('#sAddress').value.trim(),
        notes: $('#sNotes').value.trim()
      };
      if (!data.name) { toast('Enter a supplier name'); return; }
      try {
        if (supplierEditId) await cloud.suppliers.update(supplierEditId, data);
        else await cloud.suppliers.create(state.businessId, state.user ? state.user.id : null, data);
        await refreshCloudData();
        $('#supplierDialog').close(); toast(supplierEditId ? 'Supplier updated' : 'Supplier added');
      } catch (err) { toast(friendly(err)); }
    });
    if ($('#supplierSearch')) $('#supplierSearch').addEventListener('input', renderSuppliers);
    $('#supplierRows').addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn && e.target.closest('[data-sup]')) {
        openSupplierProfile(e.target.closest('[data-sup]').dataset.sup);
        return;
      }
      if (!btn) return;
      var id = btn.dataset.id;
      if (btn.dataset.act === 'statement-supplier') { openSupplierProfile(id); return; }
      if (btn.dataset.act === 'edit-supplier') {
        var found = state.suppliers.find(function (x) { return String(x.id) === String(id); });
        if (found) openSupplierDialog(found);
        return;
      }
      var ok = await confirmDialog('Delete supplier?', 'The supplier is hidden from your workspace. Existing purchase records stay untouched.');
      if (!ok) return;
      try { await cloud.suppliers.remove(id); await refreshCloudData(); toast('Supplier removed'); }
      catch (err) { toast(friendly(err)); }
    });
    var pf = $('#supplierProfile');
    if (pf) {
      var byId = function (id) { return $(id); };
      var close = byId('#spClose');
      if (close) close.addEventListener('click', closeSupplierProfile);
      var copy = byId('#spCopy');
      if (copy) copy.addEventListener('click', copySupplierStatement);
      var csv = byId('#spCsv');
      if (csv) csv.addEventListener('click', downloadSupplierStatementCSV);
      var pr = byId('#spPrint');
      if (pr) pr.addEventListener('click', printSupplierStatement);
      ['#spFrom', '#spTo'].forEach(function (sel) {
        var el = $(sel);
        if (el) el.addEventListener('change', renderSupplierProfile);
      });
    }
  }

  /* ============ purchases ============ */
  function supplierOptions(selectedId) {
    var opts = state.suppliers.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (String(selectedId) === String(s.id) ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    });
    return opts.join('') || '<option value="">Add a supplier first</option>';
  }
  function purchaseProductOptions(productId) {
    var opts = state.products.filter(function (p) { return !p.service; }).map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (String(productId) === String(p.id) ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    });
    return opts.join('') || '<option value="">Products will appear here</option>';
  }
  function purchaseItemRow(p) {
    var row = document.createElement('div');
    row.className = 'purchase-item';
    row.innerHTML =
      '<select class="po-product" aria-label="Product">' + purchaseProductOptions(p ? p.productId : null) + '</select>' +
      '<input class="po-qty" inputmode="decimal" value="' + (p ? p.qty : '1') + '" aria-label="Quantity">' +
      '<input class="po-cost" inputmode="decimal" value="' + (p ? p.cost : '') + '" placeholder="Cost" aria-label="Cost price">' +
      '<b class="po-total">' + money(p ? p.qty * p.cost : 0) + '</b>' +
      '<button type="button" class="action-btn danger po-remove" aria-label="Remove line item">×</button>';
    return row;
  }
  function recomputePurchaseTotal() {
    var box = $('#purchaseItems'); if (!box) return;
    var total = 0;
    box.querySelectorAll('.purchase-item').forEach(function (row) {
      var qty = parseFloat(row.querySelector('.po-qty').value) || 0;
      var cost = parseFloat(row.querySelector('.po-cost').value) || 0;
      row.querySelector('.po-total').textContent = money(qty * cost);
      total += qty * cost;
    });
    if ($('#purchaseTotalVal')) $('#purchaseTotalVal').textContent = money(total);
  }
  function purchaseRowsFromDom() {
    var items = [];
    $('#purchaseItems').querySelectorAll('.purchase-item').forEach(function (row) {
      var pid = row.querySelector('.po-product').value;
      var qty = parseFloat(row.querySelector('.po-qty').value);
      var cost = parseFloat(row.querySelector('.po-cost').value);
      if (!pid || !(qty > 0) || !(cost >= 0)) return;
      items.push({ product_id: pid, quantity: qty, cost_price: cost });
    });
    return items;
  }
  function openPurchaseDialog() {
    $('#purchaseForm').reset();
    var box = $('#purchaseItems');
    box.innerHTML = '';
    box.appendChild(purchaseItemRow(null));
    $('#poSupplier').innerHTML = supplierOptions();
    recomputePurchaseTotal();
    $('#purchaseDialog').showModal();
  }
  function purchaseItemsLabel(p) {
    var first = p.items.slice(0, 2).map(function (it) { return it.name + ' × ' + it.qty; }).join(', ');
    return p.items.length > 2 ? first + ' +' + (p.items.length - 2) + ' more' : first;
  }
  function purchaseOverdue(p) {
    if (p.status === 'cancelled') return false;
    if (!(Number(p.balance || 0) > 0)) return false;
    if (p.dueDate) return new Date(p.dueDate).getTime() < Date.now();
    return p.ts ? (Date.now() - p.ts) > 30 * 864e5 : false;
  }
  function purchasePaymentPill(p) {
    if (p.status === 'cancelled') return '<span class="status low">cancelled</span>';
    if (purchaseOverdue(p)) return '<span class="status low">overdue</span>';
    var c = p.paymentStatus === 'unpaid' ? ' low' : (p.paymentStatus === 'partial' ? ' warn' : '');
    return '<span class="status' + c + '">' + esc(p.paymentStatus || 'unpaid') + '</span>';
  }
  function purchaseDocLabel(p) {
    return p.status === 'received' ? 'BILL' : 'PO';
  }
  function printPurchaseDocument(p) {
    if (!p) return;
    var biz = state.businessProfile || {};
    var w = window.open('', '_blank', 'width=860,height=940');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print purchase documents.'); return; }
    var paid = Number(p.paid || 0);
    var due = Number(p.balance || 0);
    var itemRows = (p.items || []).map(function (it) {
      return '<tr><td>' + esc(it.name) + '</td><td class="num">' + (Number(it.qty) || 0) + '</td><td class="num">' + money(it.cost) + '</td><td class="num">' + money(it.lineTotal) + '</td></tr>';
    }).join('') || '<tr><td colspan="4">No items</td></tr>';
    var docTitle = purchaseDocLabel(p) === 'BILL' ? 'PURCHASE BILL' : 'PURCHASE ORDER';
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>' + docTitle + ' — ' + esc(p.number) + '</title>' +
      '<style>body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:40px;font-size:13px}' +
      '.head{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px}' +
      'h1{font-size:22px;margin:0}h2{font-size:15px;letter-spacing:.08em;margin:0}' +
      '.muted{color:#666;font-size:11px;line-height:1.6}.meta{display:flex;justify-content:space-between;margin:22px 0 10px}' +
      'table{width:100%;border-collapse:collapse;margin-top:8px}' +
      'th,td{border:1px solid #ddd;padding:7px 9px;text-align:left;font-size:12px}' +
      'th{background:#f4f4f4}.num{text-align:right}.tot{font-weight:bold}.big{font-size:13px}' +
      '.status-pill{font-size:10px;border:1px solid #111;border-radius:999px;padding:3px 10px;text-transform:uppercase;letter-spacing:.05em}' +
      '.totals{margin-left:auto;width:320px}.foot{margin-top:28px;color:#666;font-size:10px}' +
      '</style></head><body>' +
      '<div class="head"><div><h1>' + esc(biz.name || state.businessName || '') + '</h1>' +
      '<div class="muted">' + esc((biz.address || '') + (biz.phone ? (biz.address ? ' · ' : '') + biz.phone : '')) + '</div></div>' +
      '<div style="text-align:right"><h2>' + docTitle + '</h2><div class="muted">' + esc(p.number) + '</div><div class="muted">' + esc(p.date) + '</div></div></div>' +
      '<div class="meta"><div class="muted"><b>Supplier</b><br>' + esc(p.supplier) + '</div>' +
      '<div style="text-align:right"><span class="status-pill">' + esc(purchaseDocLabel(p)) + ' · ' + esc(p.status) + '</span></div></div>' +
      '<table><thead><tr><th>ITEM</th><th class="num">QTY</th><th class="num">COST</th><th class="num">LINE TOTAL</th></tr></thead><tbody>' + itemRows + '</tbody></table>' +
      '<div class="totals" style="margin-top:14px">' +
      '<div><span>Subtotal</span><b class="num" style="float:right">' + money(p.total) + '</b></div>' +
      '<div style="margin-top:6px;border-top:1px solid #ddd;padding-top:8px"><span class="tot">Total</span><b class="tot num" style="float:right">' + money(p.total) + '</b></div>' +
      '<div style="margin-top:4px"><span>Paid</span><b class="num" style="float:right">' + money(paid) + '</b></div>' +
      '<div style="margin-top:4px"><span>Balance due</span><b class="num" style="float:right">' + money(due) + '</b></div>' +
      '<div style="margin-top:4px"><span>Payment</span><b class="num" style="float:right;text-transform:capitalize">' + esc(purchasePaymentPill(p).replace(/<[^>]+>/g, '')) + '</b></div>' +
      '</div>' +
      (p.notes ? '<p class="muted" style="margin-top:18px"><b>Notes</b><br>' + esc(p.notes) + '</p>' : '') +
      '<p class="foot">Generated from Salesventory · ' + new Date().toDateString() + '</p>' +
      '</body></html>');
    w.document.close();
    w.focus();
    w.print();
  }
  function renderPurchases() {
    var rows = $('#purchaseRows'); if (!rows) return;
    var q = ($('#purchaseSearch').value || '').toLowerCase();
    var payables = state.purchases.filter(function (p) { return p.status !== 'cancelled'; })
      .reduce(function (a, p) { return a + Math.max(p.balance || 0, 0); }, 0);
    if ($('#payablesTotal')) $('#payablesTotal').textContent = money(payables);
    var capsHere = caps();
    rows.innerHTML = state.purchases.filter(function (p) {
      return (p.number + ' ' + p.supplier + ' ' + p.items.map(function (it) { return it.name; }).join(' ')).toLowerCase().indexOf(q) !== -1;
    }).map(function (p) {
      var actions = '';
      if (p.status === 'draft' || p.status === 'ordered' || p.status === 'received') {
        if (capsHere.managePurchases && p.status !== 'received') {
          actions += '<button class="action-btn" data-act="receive-purchase" data-id="' + esc(p.id) + '">Receive stock</button>';
        }
        if (capsHere.managePurchases && (p.status === 'draft')) {
          actions += '<button class="action-btn danger" data-act="cancel-purchase" data-id="' + esc(p.id) + '">Cancel</button>';
        }
      }
      if (p.status !== 'cancelled' && capsHere.finance && (p.balance || 0) > 0) {
        actions += '<button class="action-btn primary-lite" data-act="pay-purchase" data-id="' + esc(p.id) + '">Pay</button>';
      }
      if (p.status !== 'cancelled') {
        actions += '<button class="action-btn" data-act="print-purchase" data-id="' + esc(p.id) + '">Print</button>';
      }
      return '<tr data-row-id="b-' + p.id + '">' +
        '<td data-label="Purchase"><b><span class="doc-tag">' + esc(purchaseDocLabel(p)) + '</span>' + esc(p.number.replace(/^PO-/, '')) + '</b></td>' +
        '<td data-label="Supplier">' + esc(p.supplier) + '</td>' +
        '<td data-label="Items">' + esc(purchaseItemsLabel(p)) + '</td>' +
        '<td data-label="Amount"><b>' + money(p.total) + '</b></td>' +
        '<td data-label="Due">' + esc((p.dueDate || '').slice(0, 10) || '—') + '</td>' +
        '<td data-label="Balance"><b>' + money(p.balance) + '</b></td>' +
        '<td data-label="Status"><span class="status' + (p.status === 'received' ? '' : ' neutral') + '">' + esc(p.status) + '</span></td>' +
        '<td data-label="Payment">' + purchasePaymentPill(p) + '</td>' +
        '<td data-label="Date">' + esc(p.date) + '</td>' +
        '<td data-label="Actions">' + actions + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="10" class="empty-cell">No purchase bills yet. Click “New purchase” to record one.</td></tr>';
  }
  var paymentTarget = null;
  function openPaymentDialog(p) {
    paymentTarget = p;
    $('#paymentForm').reset();
    $('#paymentAmount').value = Math.max(p.balance || 0, 0) || '';
    $('#paymentMethod2').value = 'bank';
    $('#paymentRef').value = '';
    $('#paymentBalance').textContent = 'Outstanding for ' + p.number + ': ' + money(p.balance);
    $('#paymentDialog').showModal();
  }
  function bindPurchases() {
    $('#addPurchase').addEventListener('click', function () {
      if (!state.suppliers.length) { toast('Add a supplier before recording purchases'); gotoView('suppliers'); return; }
      openPurchaseDialog();
    });
    $('#purchaseCancel').addEventListener('click', function () { $('#purchaseDialog').close(); });
    $('#paymentCancel').addEventListener('click', function () { $('#paymentDialog').close(); });
    $('#addPurchaseItem').addEventListener('click', function () {
      var box = $('#purchaseItems');
      box.appendChild(purchaseItemRow(null));
      box.lastChild.querySelector('.po-product').value = '';
      recomputePurchaseTotal();
    });
    $('#purchaseItems').addEventListener('input', recomputePurchaseTotal);
    $('#purchaseItems').addEventListener('change', recomputePurchaseTotal);
    $('#purchaseItems').addEventListener('click', function (e) {
      var btn = e.target.closest('.po-remove');
      if (!btn) return;
      var box = $('#purchaseItems');
      if (box.children.length <= 1) { toast('A purchase needs at least one line item'); return; }
      box.removeChild(btn.closest('.purchase-item'));
      recomputePurchaseTotal();
    });
    $('#purchaseForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var supplierId = $('#poSupplier').value;
      if (!supplierId) { toast('Choose a supplier'); return; }
      var items = purchaseRowsFromDom();
      if (!items.length) { toast('Add at least one product line'); return; }
      var notes = ($('#poNotes') && $('#poNotes').value) ? $('#poNotes').value.trim() : '';
      var billNow = $('#poBillNow') ? $('#poBillNow').checked : false;
      try {
        var made = await cloud.purchases.create({
          p_business_id: state.businessId,
          p_supplier_id: supplierId,
          p_items: items,
          p_notes: notes || null
        });
        if (billNow) await cloud.purchases.receive(made);
        await refreshCloudData();
        $('#purchaseDialog').close();
        toast(billNow ? 'Bill recorded & stock received' : 'Purchase order saved');
      } catch (err) { toast(friendly(err)); }
    });
    $('#purchaseRows').addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-act="receive-purchase"], [data-act="cancel-purchase"], [data-act="pay-purchase"], [data-act="print-purchase"]');
      if (!btn) return;
      var act = btn.dataset.act, id = btn.dataset.id;
      var found = state.purchases.find(function (x) { return String(x.id) === String(id); });
      if (act === 'print-purchase') { printPurchaseDocument(found); return; }
      if (act === 'receive-purchase') {
        var ok = await confirmDialog('Receive stock?', 'Stock levels are updated with the purchased quantities and product costs are refreshed.');
        if (!ok) return;
        try { await cloud.purchases.receive(id); await refreshCloudData(); toast('Stock received'); }
        catch (err) { toast(friendly(err)); }
        return;
      }
      if (act === 'cancel-purchase') {
        ok = await confirmDialog('Cancel this purchase?', 'The bill is marked cancelled. Stock is never changed.');
        if (!ok) return;
        try { await cloud.purchases.cancel(id); await refreshCloudData(); toast('Purchase cancelled'); }
        catch (err) { toast(friendly(err)); }
        return;
      }
      openPaymentDialog(found);
    });
    if ($('#purchaseSearch')) $('#purchaseSearch').addEventListener('input', renderPurchases);
    $('#paymentForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!paymentTarget) return;
      var amount = parseFloat($('#paymentAmount').value);
      var method = $('#paymentMethod2').value;
      var ref = $('#paymentRef').value.trim();
      if (!(amount > 0)) { toast('Enter a payment amount'); return; }
var pid = paymentTarget.id;
      try {
        await cloud.purchasePayments.create(pid, amount, method, ref);
        await refreshCloudData();
        $('#paymentDialog').close();
        toast('Payment recorded');
      } catch (err) { toast(friendly(err)); }
    });
  }

  /* ============ invoices / history ============ */
  function invoiceOverdue(i) {
    var bal = Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0);
    if (!(bal > 0)) return false;
    if (i.dueDate) return new Date(i.dueDate).getTime() < Date.now();
    return i.ts ? (Date.now() - i.ts) > 30 * 864e5 : false;
  }
  function invoicePayment(i) {
    if (invoiceOverdue(i)) return '<span class="status low">overdue</span>';
    var stored = i.paymentStatus || 'paid';
    var total = Number(i.total || 0);
    var bal = Number(i.balance || 0);
    var received = Number(i.paid || 0);
    var status = stored;
    if (received > 0) status = total > 0 && bal <= 0 ? 'paid' : (bal < total ? 'partial' : 'unpaid');
    var c = status === 'unpaid' || status === 'partial' ? ' warn' : '';
    var txt = status;
    if (status === 'partial' && bal > 0) txt += ' · ' + money(bal) + ' left';
    return '<span class="status' + c + '">' + esc(txt) + '</span>';
  }
  var invoiceFilter = 'all';
  function invoiceFilterMatch(i) {
    if (invoiceFilter === 'all') return true;
    if (invoiceFilter === 'overdue') return invoiceOverdue(i);
    if (invoiceFilter === 'due') return dueSoon(i);
    return (i.paymentStatus || 'paid') === invoiceFilter;
  }
  function dueSoon(i) {
    if (!(invBal(i) > 0) || invoiceOverdue(i)) return false;
    if (!i.dueDate) return false;
    var d = new Date(i.dueDate).getTime();
    return d >= Date.now() - 864e5 && d <= Date.now() + 3 * 864e5;
  }
  function invoiceRow(i, compact) {
    var due = '<td data-label="Due">' + esc(i.dueDate || '—') + '</td>';
    if (compact) {
      return '<tr>' +
        '<td data-label="Transaction"><b>' + esc(i.id) + '</b></td>' +
        '<td data-label="Customer">' + esc(i.customer) + '</td>' +
        '<td data-label="Item">' + esc(i.product) + '</td>' +
        '<td data-label="Amount"><b>' + money(i.total) + '</b></td>' +
        due +
        '<td data-label="Status">' + invoicePayment(i) + '</td>' +
        '<td data-label="Date">' + esc(i.date) + '</td>' +
        '</tr>';
    }
    var canDelete = caps().deleteSales;
    var receivable = Number(i.balance || 0) > 0;
    var receive = receivable ? '<button class="action-btn" data-act="receive-payment" data-id="' + esc(i.id) + '">Receive</button>' : '';
    var remind = (invoiceOverdue(i) || dueSoon(i)) ? '<button class="action-btn" data-act="remind-invoice" data-id="' + esc(i.id) + '">Remind</button>' : '';
    var del = canDelete ? '<button class="action-btn danger" data-act="delete-invoice" data-id="' + esc(i.id) + '">Delete</button>' : '';
    return '<tr data-row-id="i-' + esc(i.id) + '">' +
      '<td data-label="Transaction"><b>' + esc(i.id) + '</b></td>' +
      '<td data-label="Customer">' + esc(i.customer) + '</td>' +
      '<td data-label="Item">' + esc(i.product) + ' × ' + i.qty + '</td>' +
      '<td data-label="Amount"><b>' + money(i.total) + '</b></td>' +
      due +
      '<td data-label="Payment">' + invoicePayment(i) + '</td>' +
      '<td data-label="Date">' + esc(i.date) + '</td>' +
      '<td data-label="Actions">' + receive + '<a class="action-btn" href="sales.html#open=repick:' + encodeURIComponent(i.id) + '" title="Quick re-sell — copy items into Billing">Re-sell</a><button class="action-btn" data-act="print-invoice" data-id="' + esc(i.id) + '">Print</button><button class="action-btn" data-act="print-invoice-thermal" data-id="' + esc(i.id) + '" title="58mm thermal receipt">58mm</button><button class="action-btn" data-act="share-invoice" data-id="' + esc(i.id) + '">WhatsApp</button>' + remind + del + '</td>' +
      '</tr>';
  }
  function renderInvoices() {
    var searchEl = $('#invoiceSearch');
    var q = (searchEl ? searchEl.value : '').toLowerCase();
    var filtered = state.invoices.filter(function (i) { return (i.id + ' ' + i.customer + ' ' + i.phone).toLowerCase().indexOf(q) !== -1 && invoiceFilterMatch(i); });
    if ($('#historyRows')) $('#historyRows').innerHTML = filtered.map(function (i) { return invoiceRow(i, false); }).join('') || '<tr><td colspan="8" class="empty-cell">No matching transactions.</td></tr>';
    if ($('#recent')) $('#recent').innerHTML = state.invoices.slice(0, 5).map(function (i) { return invoiceRow(i, true); }).join('') || '<tr><td colspan="7" class="empty-cell">No transactions yet.</td></tr>';
  }
  function findInvoice(id) { return state.invoices.find(function (x) { return x.id === id; }); }
  function allReceipts() {
    var out = [];
    state.invoices.forEach(function (i) {
      (i.receipts || []).forEach(function (p) {
        out.push({
          id: p.id, invoiceId: i.cloudId, invoiceNo: i.id, customer: i.customer, phone: i.phone || '',
          amount: p.amount, method: p.method, ref: p.ref, ts: new Date(p.at).getTime(),
          date: fmtDay(new Date(p.at))
        });
      });
    });
    return out.sort(function (a, b) { return b.ts - a.ts; });
  }
  function renderReceipts() {
    var rows = $('#receiptRows'); if (!rows) return;
    var list = allReceipts();
    if ($('#receiptsTotal')) $('#receiptsTotal').textContent = money(list.reduce(function (a, x) { return a + x.amount; }, 0));
    rows.innerHTML = list.map(function (p) {
      return '<tr><td data-label="Receipt"><b><span class="doc-tag">RCPT</span>' + esc(String(p.id).slice(0, 8).toUpperCase()) + '</b></td>' +
        '<td data-label="Invoice">' + esc(p.invoiceNo) + '</td>' +
        '<td data-label="Customer">' + esc(p.customer) + '</td>' +
        '<td data-label="Amount"><b>' + money(p.amount) + '</b></td>' +
        '<td data-label="Method">' + esc(p.method.toUpperCase()) + '</td>' +
        '<td data-label="Reference">' + esc(p.ref || '—') + '</td>' +
        '<td data-label="Date">' + esc(p.date) + '</td>' +
        '<td data-label="Actions"><button class="action-btn" data-act="print-receipt" data-id="' + esc(p.id) + '">Print</button><button class="action-btn" data-act="share-receipt" data-id="' + esc(p.id) + '">WhatsApp</button></td></tr>';
    }).join('') || '<tr><td colspan="8" class="empty-cell">No payments received yet.</td></tr>';
  }
  function printReceipt(p) {
    var biz = state.businessProfile || {};
    var w = window.open('', '_blank', 'width=720,height=760');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print receipts.'); return; }
    var rno = 'RCPT-' + String(p.id).slice(0, 8).toUpperCase();
    var sym = symbol();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + rno + '</title><style>' +
      'body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:44px;max-width:560px}' +
      'h1{font-size:22px;margin:0}h2{font-size:15px;letter-spacing:.1em;margin:0}.muted{color:#666;font-size:11px}' +
      '.head{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px}' +
      '.row{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #ddd}.big{font-size:22px;font-weight:700}' +
      '.foot{margin-top:26px;color:#666;font-size:10px}' +
      '</style></head><body>' +
      '<div class="head"><div><h1>' + esc(biz.name || state.businessName || '') + '</h1><div class="muted">' + esc(biz.address || '') + '</div></div>' +
      '<div style="text-align:right"><h2>RECEIPT</h2><div>' + rno + '</div><div class="muted">' + esc(p.date) + '</div></div></div>' +
      '<p class="muted">Received from</p><div class="row"><b>' + esc(p.customer) + '</b></div>' +
      '<p class="muted">Amount received</p><div class="row big"><span>' + sym + '</span><span>' + Number(p.amount).toLocaleString('en-IN') + '</span></div>' +
      '<div class="row"><span>Payment method</span><b>' + esc(p.method.toUpperCase()) + '</b></div>' +
      '<div class="row"><span>Reference</span><b>' + esc(p.ref || '—') + '</b></div>' +
      '<div class="row"><span>On account of invoice</span><b>' + esc(p.invoiceNo) + '</b></div>' +
      '<p class="foot">Verified payment received. Generated from Salesventory · ' + new Date().toDateString() + '</p>' +
      '<script>print()<\/script></body></html>');
    w.document.close();
  }
  function bindInvoices() {
    if ($('#invoiceSearch')) $('#invoiceSearch').addEventListener('input', renderInvoices);
    var filter = $('#invoiceFilter');
    if (filter) filter.addEventListener('change', function () { invoiceFilter = filter.value; renderInvoices(); });
    $('#historyRows').addEventListener('click', onInvoiceAction);
    var rr = $('#receiptRows');
    if (rr) rr.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act="print-receipt"], [data-act="share-receipt"]');
      if (!btn) return;
      var list = allReceipts();
      var found = list.find(function (x) { return String(x.id) === String(btn.dataset.id); });
      if (!found) return;
      if (btn.dataset.act === 'print-receipt') printReceipt(found);
      else shareReceipt(found);
    });
  }
  var receiptTarget = null;
  function openReceiptDialog(i) {
    receiptTarget = i;
    var bal = Number(i.balance || 0);
    $('#receiptAmount').value = bal > 0 ? bal : '';
    $('#receiptBalance').textContent = 'Outstanding: ' + money(bal) + ' on ' + i.id;
    $('#receiptMethod').value = 'cash';
    $('#receiptRef').value = '';
    $('#receiptDialog').showModal();
  }
  function bindReceiptDialog() {
    if (!$('#receiptDialog')) return;
    $('#receiptCancel').addEventListener('click', function () { $('#receiptDialog').close(); });
    $('#receiptForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!receiptTarget) return;
      var amount = parseFloat($('#receiptAmount').value);
      var method = $('#receiptMethod').value;
      var ref = $('#receiptRef').value.trim();
      if (!(amount > 0)) { toast('Enter the amount received'); return; }
      var i = receiptTarget;
      if (amount > Number(i.balance || 0) + 0.01) { toast('Amount exceeds the outstanding balance'); return; }
      var newBal = Math.max(0, Number(i.balance || 0) - amount);
      var newStatus = newBal <= 0.01 ? 'paid' : 'partial';
      try {
        await cloud.invoicePayments.create(state.businessId, i.cloudId, amount, method, ref || null, state.user ? state.user.id : null);
        try { await cloud.invoices.updateStatus(i.cloudId, newStatus, method); }
        catch (st) { toast('Payment saved but status sync failed'); }
        await refreshCloudData();
        $('#receiptDialog').close();
        toast('Payment received');
      } catch (err) { toast(friendly(err)); }
    });
  }
  async function onInvoiceAction(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var i = findInvoice(btn.dataset.id);
    if (!i) return;
    if (btn.dataset.act === 'print-invoice') { printInvoice(i); return; }
    if (btn.dataset.act === 'print-invoice-thermal') { printInvoiceThermal(i); return; }
    if (btn.dataset.act === 'share-invoice') { shareInvoice(i); return; }
    if (btn.dataset.act === 'remind-invoice') { remindCustomer(i); return; }
    if (btn.dataset.act === 'receive-payment') { openReceiptDialog(i); return; }
    if (btn.dataset.act === 'delete-invoice') {
      var ok = await confirmDialog('Delete transaction?', 'The transaction ' + i.id + ' will be removed and stock will be restored.');
      if (!ok) return;
      try { await cloud.invoices.remove(i.cloudId || i.id); await refreshCloudData(); toast('Transaction deleted'); }
      catch (err) { toast(friendly(err)); }
    }
  }
  function printInvoice(i) {
    var w = window.open('', '_blank', 'width=720,height=900');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print invoices.'); return; }
    var sym = symbol();
    var biz = state.businessProfile || {};
    var lines = (i.items && i.items.length)
      ? i.items.map(function (x) {
          return '<tr><td>' + esc(x.name) + '</td><td class="num">' + (Number(x.qty) || 0) + '</td><td class="num">' + sym + Number(x.rate || 0).toLocaleString('en-IN') + '</td><td class="num">' + sym + Number(x.lineTotal || x.qty * x.rate || 0).toLocaleString('en-IN') + '</td></tr>';
        }).join('')
      : '<tr><td>' + esc(i.product) + '</td><td class="num">' + i.qty + '</td><td class="num">' + sym + Number(i.rate || 0).toLocaleString('en-IN') + '</td><td class="num">' + sym + Number(i.subtotal || i.qty * i.rate || 0).toLocaleString('en-IN') + '</td></tr>';
    var subtotal = Number(i.subtotal || i.items.reduce(function (a, x) { return a + Number(x.lineTotal || x.qty * x.rate || 0); }, 0));
    var paid = Number(i.paid || 0);
    var bal = Math.max(Number(i.balance || 0), 0);
    var status = invoiceOverdue(i) ? 'OVERDUE' : String(i.paymentStatus || 'paid').toUpperCase();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(i.id) + '</title><style>' +
      'body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:40px;max-width:660px}' +
      'h1{font-size:22px;margin:0}h2{font-size:15px;letter-spacing:.1em;margin:0}.muted{color:#777;font-size:11px;line-height:1.6}' +
      '.top{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px}' +
      'table{width:100%;border-collapse:collapse;margin:18px 0 12px}' +
      'th,td{border:1px solid #ddd;padding:7px 9px;text-align:left;font-size:12px}th{background:#f4f4f4}.num{text-align:right}' +
      '.total{font-size:24px;font-weight:700}.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eee}' +
      '.foot{margin-top:26px;color:#777;font-size:11px}' +
      '</style></head><body>' +
      '<div class="top"><div><h1>' + esc(biz.name || state.businessName || '') + '</h1><div class="muted">' + esc((biz.address || '') + (biz.phone ? (biz.address ? ' · ' : '') + biz.phone : '')) + '</div></div>' +
      '<div style="text-align:right"><h2>INVOICE</h2><b>' + esc(i.id) + '</b><div class="muted">' + esc(i.date) + (i.dueDate ? '<br>Due: ' + esc(String(i.dueDate).slice(0, 10)) : '') + '</div></div></div>' +
      '<p class="muted"><b>Customer:</b> ' + esc(i.customer) + (i.phone ? '<br><b>Phone:</b> ' + esc(i.phone) : '') + '</p>' +
      '<table><thead><tr><th>ITEM</th><th class="num">QTY</th><th class="num">RATE</th><th class="num">LINE TOTAL</th></tr></thead><tbody>' + lines + '</tbody></table>' +
      '<div style="margin:0 0 8px auto;max-width:300px">' +
      '<div class="row"><span>Subtotal</span><span>' + sym + subtotal.toLocaleString('en-IN') + '</span></div>' +
      (i.discount ? '<div class="row"><span>Discount</span><span>− ' + sym + Number(i.discount).toLocaleString('en-IN') + '</span></div>' : '') +
      '<div class="row total" style="border-bottom:0"><span>Total</span><span>' + sym + Number(i.total).toLocaleString('en-IN') + '</span></div>' +
      '<div class="row"><span>Paid</span><span>' + sym + paid.toLocaleString('en-IN') + '</span></div>' +
      '<div class="row"><span>Balance due</span><b>' + sym + bal.toLocaleString('en-IN') + '</b></div>' +
      '</div>' +
      '<p>Payment: ' + String(i.paymentMethod || 'upi').toUpperCase() + ' · <b>' + status + '</b></p>' +
      '<p class="muted">Thank you for your business.</p>' +
      '<script>print()<\/script></body></html>');
    w.document.close();
  }
  function printInvoiceThermal(i) {
    var w = window.open('', '_blank', 'width=380,height=820');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print receipts.'); return; }
    var sym = symbol();
    var biz = state.businessProfile || {};
    var lines = (i.items && i.items.length)
      ? i.items.map(function (x) {
          var amt = Number(x.lineTotal || x.qty * x.rate || 0);
          return '<div class="tl"><span>' + esc(x.name) + '</span><b>' + sym + (Number(x.qty) || 0) + 'x' + amt.toLocaleString('en-IN') + '</b></div>';
        }).join('')
      : '<div class="tl"><span>' + esc(i.product) + '</span><b>' + sym + Number(i.qty || 0) + 'x' + Number((i.subtotal || i.total || 0)).toLocaleString('en-IN') + '</b></div>';
    var paid = Number(i.paid || 0);
    var bal = Math.max(Number(i.balance || 0), 0);
    var status = invoiceOverdue(i) ? 'OVERDUE' : String(i.paymentStatus || 'paid').toUpperCase();
    var div = function (k, v, bold) { return '<div class="tl"><span>' + k + '</span><b' + (bold ? ' class="big"' : '') + '>' + v + '</b></div>'; };
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(i.id) + '</title><style>' +
      '@media print{@page{size:58mm auto;margin:0}}' +
      'body{font-family:"Courier New",monospace;font-size:12px;color:#111;margin:0;padding:12px;width:54mm}' +
      '.c{text-align:center}.muted{color:#555;font-size:11px}h1{font-size:15px;margin:0 0 4px}p{margin:4px 0}.dash{border-top:1px dashed #888;margin:6px 0}' +
      '.tl{display:flex;justify-content:space-between;gap:6px;margin:2px 0}.big{font-size:14px}' +
      '</style></head><body>' +
      '<div class="c"><h1>' + esc(biz.name || state.businessName || '') + '</h1>' +
      (biz.address ? '<p class="muted">' + esc(biz.address) + '</p>' : '') +
      (biz.phone ? '<p class="muted">' + esc(biz.phone) + '</p>' : '') +
      '<p class="muted"><b>INVOICE ' + esc(i.id) + '</b><br>' + esc(i.date) + (i.dueDate ? ' · Due ' + esc(String(i.dueDate).slice(0, 10)) : '') + '</p></div>' +
      '<p>Customer: ' + esc(i.customer) + (i.phone ? ' · ' + esc(i.phone) : '') + '</p>' +
      '<div class="dash"></div>' + lines +
      '<div class="dash"></div>' +
      div('Subtotal', sym + Number(i.subtotal || i.qty * i.rate || 0).toLocaleString('en-IN')) +
      (i.discount ? div('Discount', '− ' + sym + Number(i.discount).toLocaleString('en-IN')) : '') +
      div('TOTAL', sym + Number(i.total).toLocaleString('en-IN'), true) +
      div('Paid', sym + paid.toLocaleString('en-IN')) +
      div('Balance', sym + bal.toLocaleString('en-IN')) +
      '<div class="dash"></div>' +
      '<p class="c">' + esc(String(i.paymentMethod || 'upi').toUpperCase()) + ' · <b>' + esc(status) + '</b></p>' +
      '<p class="c muted">Thank you for your business!</p>' +
      '<script>print()<\/script></body></html>');
    w.document.close();
  }
  function shareInvoice(i) {
    var text = String(state.businessName).toUpperCase() + '\nTransaction: ' + i.id + '\nCustomer: ' + i.customer + '\n' + i.product + ' × ' + i.qty + '\nTotal: ' + symbol() + i.total + '\nPayment: ' + String(i.paymentMethod || 'upi').toUpperCase() + ' (' + (i.paymentStatus || 'paid') + ')\nDate: ' + i.date + '\nThank you for your business!';
    var phone = String(i.phone || '').replace(/\D/g, '');
    var target = phone.length === 10 ? '91' + phone : phone;
    window.open('https://wa.me/' + target + '?text=' + encodeURIComponent(text), '_blank');
  }
  function reminderText(i) {
    if (invoiceOverdue(i)) {
      return String(state.businessName).toUpperCase() + '\nReminder: invoice ' + i.id + ' for ' + symbol() + Number(i.balance || 0).toLocaleString('en-IN') + ' (due ' + (i.dueDate || i.date) + ') is still outstanding. Kindly settle the balance at your earliest convenience.\nThank you!';
    }
    return String(state.businessName).toUpperCase() + '\nGentle reminder: invoice ' + i.id + ' for ' + symbol() + Number(i.balance || 0).toLocaleString('en-IN') + ' is due on ' + (i.dueDate || i.date) + '. Please arrange payment in time.\nThank you!';
  }
  function remindCustomer(i) {
    var phone = String(i.phone || '').replace(/\D/g, '');
    if (phone.length < 10) { toast('No customer phone on file — add one to send reminders'); return; }
    var target = phone.length === 10 ? '91' + phone : phone;
    window.open('https://wa.me/' + target + '?text=' + encodeURIComponent(reminderText(i)), '_blank');
  }
  function shareReceipt(p) {
    var phone = String(p.phone || '').replace(/\D/g, '');
    if (phone.length < 10) { toast('No customer phone for this receipt — add one to share'); return; }
    var text = String(state.businessName).toUpperCase() + '\nPayment received ✔\nReceipt: ' + p.invoiceNo + '\nCustomer: ' + p.customer + '\nAmount: ' + symbol() + Number(p.amount).toLocaleString('en-IN') + '\nMethod: ' + String(p.method || 'upi').toUpperCase() + (p.ref ? '\nReference: ' + p.ref : '') + '\nDate: ' + p.date + '\nThank you for your business!';
    var target = phone.length === 10 ? '91' + phone : phone;
    window.open('https://wa.me/' + target + '?text=' + encodeURIComponent(text), '_blank');
  }
  function statementText(c) {
    var invs = state.invoices.filter(function (i) { return i.customer === c.name && invBal(i) > 0; }).sort(function (a, b) { return (b.dueDate || b.date) > (a.dueDate || a.date) ? 1 : -1; });
    var outstanding = invs.reduce(function (a, i) { return a + invBal(i); }, 0);
    var head = String(state.businessName).toUpperCase() + '\nStatement: ' + c.name + (c.phone ? '\nPhone: ' + c.phone : '') + '\nOutstanding: ' + symbol() + outstanding.toLocaleString('en-IN') + ' (' + invs.length + ' open)\n\n';
    var body = invs.slice(0, 12).map(function (i) { return '• ' + i.id + ' — ' + money(invBal(i)) + ' (due ' + (i.dueDate || i.date) + ')' + (invoiceOverdue(i) ? ' OVERDUE' : '') + ' · ' + i.date; }).join('\n');
    return head + (body || 'No open invoices.') + '\n\nPlease clear the balance at your earliest convenience. Thank you!';
  }
  function shareStatement(c) {
    var phone = String(c.phone || '').replace(/\D/g, '');
    if (phone.length < 10) { toast('No phone on file for ' + c.name); return; }
    var target = phone.length === 10 ? '91' + phone : phone;
    window.open('https://wa.me/' + target + '?text=' + encodeURIComponent(statementText(c)), '_blank');
  }

  /* ============ dashboard ============ */
  function renderDashboard() {
    var w = dashWindow();
    var rangeInvs = state.invoices.filter(function (i) { return inWin(i.ts, w); });
    var rangeExps = state.expenses.filter(function (x) { return inWin(x.ts, w); });
    var rangePchs = state.purchases.filter(function (p) { return p.status !== 'cancelled' && inWin(p.ts, w); });

    var sales = rangeInvs.reduce(function (a, b) { return a + Number(b.total || 0); }, 0);
    var cogs = rangeInvs.reduce(function (a, b) { return a + (Number(b.cost || 0) * Number(b.qty || 0)); }, 0);
    var discounts = rangeInvs.reduce(function (a, b) { return a + Number(b.discount || 0); }, 0);
    var expenses = rangeExps.reduce(function (a, b) { return a + Number(b.amount || 0); }, 0);
    var purchases = rangePchs.reduce(function (a, b) { return a + Number(b.total || 0); }, 0);
    var gross = sales - cogs - discounts;

    if ($('#revenue')) $('#revenue').textContent = money(sales);
    if ($('#dashRangeLabel')) $('#dashRangeLabel').textContent = w.label;
    if ($('#dashPurchases')) $('#dashPurchases').textContent = money(purchases);
    if ($('#dashExpenses')) $('#dashExpenses').textContent = money(expenses);
    if ($('#dashGross')) $('#dashGross').textContent = moneySigned(gross);
    if ($('#dashMargin')) $('#dashMargin').textContent = sales > 0 ? Math.round((gross / sales) * 100) + '%' : '0%';
    if ($('#profit')) $('#profit').textContent = moneySigned(gross - expenses);
    if ($('#kpiPnL')) $('#kpiPnL').textContent = moneySigned(gross - expenses);
    if ($('#kpiPnLMeta')) $('#kpiPnLMeta').textContent = 'Net after COGS & expenses · ' + w.label;

    var lowProds = state.products.filter(function (p) { return !isService(p) && p.stock <= p.reorder; });
    if ($('#lowStock')) $('#lowStock').textContent = lowProds.length;
    if ($('#oos')) $('#oos').textContent = state.products.filter(function (p) { return !isService(p) && p.stock <= 0; }).length;

    /* today's sales */
    var todayInvoices = state.invoices.filter(function (i) { return isSameDay(i.ts); });
    var todayRevenue = todayInvoices.reduce(function (a, b) { return a + Number(b.total || 0); }, 0);
    if ($('#kpiToday')) $('#kpiToday').textContent = money(todayRevenue);
    if ($('#kpiTodayMeta')) $('#kpiTodayMeta').textContent = todayInvoices.length ? todayInvoices.length + (todayInvoices.length === 1 ? ' sale today' : ' sales today') : 'No sales recorded yet';

    /* balance-sheet KPIs */
    var invBal = function (i) { return Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0); };
    var receivables = state.invoices.reduce(function (a, b) { return a + invBal(b); }, 0);
    var recvCount = state.invoices.filter(function (i) { return invBal(i) > 0; }).length;
    var payables = state.purchases.filter(function (p) { return p.status !== 'cancelled'; }).reduce(function (a, b) { return a + Math.max(Number(b.balance || 0), 0); }, 0);
    if ($('#kpiReceivables')) $('#kpiReceivables').textContent = money(receivables);
    if ($('#kpiReceivablesMeta')) $('#kpiReceivablesMeta').textContent = recvCount ? recvCount + ' invoice(s) with balance' : 'No outstanding receivables';
    if ($('#kpiPayables')) $('#kpiPayables').textContent = money(payables);
    if ($('#kpiPayablesMeta')) $('#kpiPayablesMeta').textContent = 'Supplier bills to pay';
    var stockValue = state.products.filter(function (p) { return !isService(p); }).reduce(function (a, p) { return a + (Number(p.cost || 0) * Number(p.stock || 0)); }, 0);
    if ($('#kpiStockValue')) $('#kpiStockValue').textContent = money(stockValue);
    if ($('#kpiStockValueMeta')) $('#kpiStockValueMeta').textContent = 'Valued at purchase cost';

    /* outstanding + overdue */
    var pending = state.invoices.reduce(function (a, b) { return a + invBal(b); }, 0);
    if ($('#kpiPending')) $('#kpiPending').textContent = money(pending);
    if ($('#kpiPendingMeta')) {
      var pendCount = state.invoices.filter(function (i) { return invBal(i) > 0; }).length;
      var overdueCount = state.invoices.filter(function (i) {
        if (!(invBal(i) > 0)) return false;
        if (i.dueDate && new Date(i.dueDate).getTime() < Date.now()) return true;
        return i.ts && !isSameDay(i.ts) && (Date.now() - i.ts) > 30 * 864e5;
      }).length;
      $('#kpiPendingMeta').textContent = (overdueCount ? overdueCount + ' overdue · ' : '') + (pendCount ? pendCount + ' invoice(s) with balance' : 'No outstanding amounts');
    }

    /* due today / overdue focus strip */
    var todayS2 = new Date().toISOString().slice(0, 10);
    var dueToday = function (d) { return d && String(d).slice(0, 10) === todayS2; };
    var recvDue = state.invoices.filter(function (i) { return invBal(i) > 0 && dueToday(i.dueDate); });
    var recvOver = state.invoices.filter(invoiceOverdue);
    var payDue = state.purchases.filter(function (p) { return p.status !== 'cancelled' && Number(p.balance || 0) > 0 && dueToday(p.dueDate); });
    var payOver = state.purchases.filter(purchaseOverdue);
    if ($('#dColDue')) $('#dColDue').textContent = 'Receivables due today · ' + money(recvDue.reduce(function (a, i) { return a + invBal(i); }, 0)) + (recvDue.length ? ' (' + recvDue.length + ')' : '');
    if ($('#dColOver')) $('#dColOver').textContent = 'Receivables overdue · ' + money(recvOver.reduce(function (a, i) { return a + invBal(i); }, 0)) + (recvOver.length ? ' (' + recvOver.length + ')' : '');
    if ($('#dPayDue')) $('#dPayDue').textContent = 'Payables due today · ' + money(payDue.reduce(function (a, p) { return a + Math.max(Number(p.balance || 0), 0); }, 0)) + (payDue.length ? ' (' + payDue.length + ')' : '');
    if ($('#dPayOver')) $('#dPayOver').textContent = 'Payables overdue · ' + money(payOver.reduce(function (a, p) { return a + Math.max(Number(p.balance || 0), 0); }, 0)) + (payOver.length ? ' (' + payOver.length + ')' : '');

    /* top product + top customer (range) */
    var perProduct = {}, perCustomer = {};
    rangeInvs.forEach(function (i) {
      if (!perProduct[i.product]) perProduct[i.product] = { qty: 0, revenue: 0 };
      perProduct[i.product].qty += Number(i.qty); perProduct[i.product].revenue += Number(i.total);
      if (!perCustomer[i.customer]) perCustomer[i.customer] = { count: 0, revenue: 0 };
      perCustomer[i.customer].count += 1; perCustomer[i.customer].revenue += Number(i.total);
    });
    var prodRank = Object.keys(perProduct)
      .map(function (k) { return { name: k, qty: perProduct[k].qty, revenue: perProduct[k].revenue }; })
      .sort(function (a, b) { return (b.revenue - a.revenue) || (b.qty - a.qty); });
    var best = prodRank[0];
    if ($('#kpiBest')) $('#kpiBest').textContent = best ? best.name : '—';
    if ($('#kpiBestMeta')) $('#kpiBestMeta').textContent = best ? best.qty + ' units · ' + money(best.revenue) : 'No sales data yet';
    var custRank = Object.keys(perCustomer)
      .map(function (k) { return { name: k, count: perCustomer[k].count, revenue: perCustomer[k].revenue }; })
      .sort(function (a, b) { return b.revenue - a.revenue; });
    var topCustomer = custRank[0];
    if ($('#kpiTopCustomer')) $('#kpiTopCustomer').textContent = topCustomer ? topCustomer.name : '—';
    if ($('#kpiTopCustomerMeta')) $('#kpiTopCustomerMeta').textContent = topCustomer ? topCustomer.count + ' order(s) · ' + money(topCustomer.revenue) : 'No customers yet';

    /* stock + due alerts */
    if ($('#alerts')) {
      var overRecv = state.invoices.filter(invoiceOverdue);
      var overPay = state.purchases.filter(purchaseOverdue);
      var extra = '';
      if (overRecv.length) {
        var amt = overRecv.reduce(function (a, i) { return a + invBal(i); }, 0);
        extra += '<div class="alert"><div><b>Overdue receivables · ' + overRecv.length + '</b><div class="muted">' + money(amt) + ' outstanding past due</div></div><a class="status low" data-go="history" href="history.html" style="text-decoration:none">Collect</a></div>';
      }
      if (overPay.length) {
        var pam = overPay.reduce(function (a, p) { return a + Math.max(Number(p.balance || 0), 0); }, 0);
        extra += '<div class="alert"><div><b>Overdue payables · ' + overPay.length + '</b><div class="muted">' + money(pam) + ' due to suppliers</div></div><a class="status low" data-go="purchases" href="purchases.html" style="text-decoration:none">Pay</a></div>';
      }
      var alerts = state.products.filter(function (p) { return !isService(p); }).slice()
        .sort(function (a, b) { return (a.stock / Math.max(a.reorder, 1)) - (b.stock / Math.max(b.reorder, 1)); })
        .slice(0, 5)
        .map(function (p) {
          var low = p.stock <= p.reorder;
          return '<div class="alert"><div><b>' + esc(p.name) + '</b><div class="muted">' + p.stock + ' units available · reorder at ' + p.reorder + '</div></div>' +
            '<a class="status' + (low ? ' low' : '') + '" href="products.html#open=lowstock" data-go="inventory" style="text-decoration:none">' + (low ? 'Restock' : 'Healthy') + '</a></div>';
        }).join('');
      $('#alerts').innerHTML = (extra + alerts) || '<p class="muted" style="color:rgba(255,255,255,.8);padding:4px 0">No alerts. Everything looks healthy.</p>';
    }

    /* trends: revenue + expenses, bucketed by day (month when window > 35 days) */
    var monthMode = (w.to - w.from) > 35 * 864e5;
    var bucketKey = function (d) { return monthMode ? (d.getFullYear() + '-' + String(d.getMonth() + 1)) : d.toISOString().slice(0, 10); };
    var buckets = {};
    rangeInvs.forEach(function (i) {
      if (!i.ts) return;
      var d = new Date(i.ts); if (isNaN(d.getTime())) return;
      var k = bucketKey(d);
      if (!buckets[k]) buckets[k] = { sales: 0, expenses: 0 };
      buckets[k].sales += Number(i.total || 0);
    });
    rangeExps.forEach(function (x) {
      if (!x.ts) return;
      var d = new Date(x.ts); if (isNaN(d.getTime())) return;
      var k = bucketKey(d);
      if (!buckets[k]) buckets[k] = { sales: 0, expenses: 0 };
      buckets[k].expenses += Number(x.amount || 0);
    });
    var bvals = Object.keys(buckets).sort().map(function (k) { return [k, buckets[k]]; });
    if (bvals.length > 40) bvals = bvals.slice(-40);
    var maxSales = Math.max.apply(Math, bvals.map(function (v) { return v[1].sales; }).concat([1]));
    var maxExp = Math.max.apply(Math, bvals.map(function (v) { return v[1].expenses; }).concat([1]));
    var barFeed = function (key, v, max) {
      return '<div class="bar-wrap"><div class="bar" style="height:' + Math.max(12, (v / max) * 150) + 'px" title="' + money(v) + '"></div><span>' + esc(key.slice(5).replace('-', '/')) + '</span></div>';
    };
    if ($('#bars')) {
      $('#bars').innerHTML = bvals.length
        ? bvals.map(function (v) { return barFeed(v[0], v[1].sales, maxSales); }).join('')
        : '<p class="muted" style="padding:28px 22px">Sales chart appears once transactions are created.</p>';
    }
    if ($('#barsExp')) {
      $('#barsExp').innerHTML = bvals.length
        ? bvals.map(function (v) { return '<div class="bar-wrap"><div class="bar exp" style="height:' + Math.max(12, (v[1].expenses / maxExp) * 150) + 'px" title="' + money(v[1].expenses) + '"></div><span>' + esc(v[0].slice(5).replace('-', '/')) + '</span></div>'; }).join('')
        : '<p class="muted" style="padding:28px 22px">Expense chart appears once expenses are recorded.</p>';
    }
  }

  /* ============ sales performance suite ============ */
  function repWindow() {
    var sel = $('#repRange');
    var v = sel ? sel.value : 'month';
    var now = new Date();
    var f = $('#repFrom'), t = $('#repTo');
    var from, to;
    if (v === 'today') { from = dayStart(now).getTime(); to = now.getTime(); }
    else if (v === 'yesterday') { var y = new Date(now); y.setDate(y.getDate() - 1); from = dayStart(y).getTime(); to = dayStart(now).getTime() - 1; }
    else if (v === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); to = now.getTime(); }
    else if (v === 'lastmonth') { from = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(); to = dayEnd(new Date(now.getFullYear(), now.getMonth(), 0)).getTime(); }
    else if (v === 'year') { from = new Date(now.getFullYear(), 0, 1).getTime(); to = now.getTime(); }
    else if (v === 'custom') {
      from = f && f.value ? dayStart(new Date(f.value)).getTime() : new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      to = t && t.value ? dayEnd(new Date(t.value)).getTime() : now.getTime();
      if (from > to) { var tmp = from; from = to; to = tmp; }
    }
    else { from = now.getTime() - Number(v || 7) * 864e5; to = now.getTime(); }
    return { from: from, to: to, key: v, label: sel && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : v };
  }
  function itemCategory(it) {
    var p = state.products.filter(function (x) { return String(x.id) === String(it.productId); })[0];
    return (p && p.category) ? p.category : 'Uncategorised';
  }
  function salesPerformance() {
    var w = repWindow();
    var invs = state.invoices.filter(function (i) { return (i.ts || 0) >= w.from && (i.ts || 0) <= w.to; });
    var revenue = 0, qty = 0, cost = 0;
    var byProduct = {}, byCategory = {}, byCustomer = {};
    var customersSet = {};
    invs.forEach(function (i) {
      revenue += Number(i.total || 0);
      customersSet[i.customer] = true;
      var items = (i.items && i.items.length) ? i.items : [{ productId: i.productId, name: i.product, qty: i.qty, rate: i.rate, cost: i.cost, lineTotal: Number(i.total || i.rate * i.qty || 0) }];
      items.forEach(function (it) {
        var ln = Number(it.lineTotal || 0) || Number(it.rate || 0) * Number(it.qty || 0);
        var cst = Number(it.cost || 0) * Number(it.qty || 0);
        qty += Number(it.qty || 0); cost += cst;
        if (!byProduct[it.name]) byProduct[it.name] = { qty: 0, revenue: 0, cost: 0, category: itemCategory(it) };
        byProduct[it.name].qty += Number(it.qty || 0);
        byProduct[it.name].revenue += ln;
        byProduct[it.name].cost += cst;
        var cat = itemCategory(it);
        if (!byCategory[cat]) byCategory[cat] = { qty: 0, revenue: 0, cost: 0 };
        byCategory[cat].qty += Number(it.qty || 0);
        byCategory[cat].revenue += ln;
        byCategory[cat].cost += cst;
      });
      if (!byCustomer[i.customer]) byCustomer[i.customer] = { orders: 0, qty: 0, revenue: 0, outstanding: 0, last: null };
      byCustomer[i.customer].orders += 1;
      byCustomer[i.customer].qty += items.reduce(function (a, it) { return a + Number(it.qty || 0); }, 0);
      byCustomer[i.customer].revenue += Number(i.total || 0);
      byCustomer[i.customer].outstanding = Math.max(Number(byCustomer[i.customer].outstanding || 0), Number(i.balance || 0));
      byCustomer[i.customer].last = Math.max(byCustomer[i.customer].last || 0, i.ts || 0);
    });
    return {
      window: w, revenue: revenue, orders: invs.length, qty: qty,
      grossProfit: revenue - cost, customers: Object.keys(customersSet).length,
      byProduct: byProduct, byCategory: byCategory, byCustomer: byCustomer
    };
  }
  function sipRows(tbody, map, revTotal) {
    if (!tbody) return;
    var entries = Object.keys(map).map(function (k) { return { name: k, v: map[k] }; })
      .sort(function (a, b) { return b.v.revenue - a.v.revenue; });
    tbody.innerHTML = entries.length
      ? entries.map(function (e) {
          var share = revTotal ? Math.round((e.v.revenue / revTotal) * 100) : 0;
          var profit = e.v.revenue - e.v.cost;
          return '<tr>' +
            '<td data-label="Item"><b>' + esc(e.name) + '</b></td>' +
            '<td data-label="Qty">' + Number(e.v.qty || 0) + '</td>' +
            '<td data-label="Revenue"><b>' + money(e.v.revenue) + '</b></td>' +
            '<td data-label="Profit">' + (profit < 0 ? '<span class="status low">' : '') + money(profit) + (profit < 0 ? '</span>' : '') + '</td>' +
            '<td data-label="Share">' + share + '%</td>' +
            '</tr>';
        }).join('')
      : '<tr><td colspan="5" class="empty-cell">No sales in this period.</td></tr>';
  }
  function renderSalesPerformance() {
    var sp = salesPerformance();
    var w = sp.window;
    if ($('#repCaption')) $('#repCaption').textContent = w.label + ' · ' + sp.orders + ' orders · ' + money(sp.revenue) + ' revenue';
    if ($('#repRevenue')) $('#repRevenue').textContent = money(sp.revenue);
    if ($('#repOrders')) $('#repOrders').textContent = sp.orders;
    if ($('#repQty')) $('#repQty').textContent = sp.qty;
    if ($('#repGross')) $('#repGross').textContent = money(sp.grossProfit);
    if ($('#repCustomers')) $('#repCustomers').textContent = sp.customers;

    var best = Object.keys(sp.byProduct).sort(function (a, b) { return sp.byProduct[b].revenue - sp.byProduct[a].revenue; })[0];
    if ($('#bestProduct')) $('#bestProduct').textContent = best || '—';
    var topCust = Object.keys(sp.byCustomer).sort(function (a, b) { return sp.byCustomer[b].revenue - sp.byCustomer[a].revenue; })[0];
    if ($('#topCustomerRep')) $('#topCustomerRep').textContent = topCust || '—';

    sipRows($('#salesByProduct'), sp.byProduct, sp.revenue);
    var catEntries = Object.keys(sp.byCategory).map(function (k) { return { name: k, v: sp.byCategory[k] }; }).sort(function (a, b) { return b.v.revenue - a.v.revenue; });
    var catTable = $('#salesByCategory');
    if (catTable) {
      catTable.innerHTML = catEntries.length
        ? catEntries.map(function (e) {
            return '<tr><td data-label="Category"><b>' + esc(e.name) + '</b></td><td data-label="Qty">' + Number(e.v.qty || 0) + '</td>' +
              '<td data-label="Revenue"><b>' + money(e.v.revenue) + '</b></td><td data-label="Share">' + (sp.revenue ? Math.round((e.v.revenue / sp.revenue) * 100) : 0) + '%</td></tr>';
          }).join('')
        : '<tr><td colspan="4" class="empty-cell">No category sales in this period.</td></tr>';
    }
    var custTable = $('#salesByCustomer');
    if (custTable) {
      var custEntries = Object.keys(sp.byCustomer).map(function (k) { return { name: k, v: sp.byCustomer[k] }; }).sort(function (a, b) { return b.v.revenue - a.v.revenue; });
      custTable.innerHTML = custEntries.slice(0, 20).length
        ? custEntries.slice(0, 20).map(function (e) {
            return '<tr><td data-label="Customer"><b>' + esc(e.name) + '</b></td><td data-label="Orders">' + e.v.orders + '</td>' +
              '<td data-label="Qty">' + Number(e.v.qty || 0) + '</td><td data-label="Revenue"><b>' + money(e.v.revenue) + '</b></td>' +
              '<td data-label="Outstanding">' + (e.v.outstanding > 0 ? money(e.v.outstanding) : '—') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="5" class="empty-cell">No customer sales in this period.</td></tr>';
    }
  }

  /* ============ reports ============ */
  function renderReports() {
    var revenue = state.invoices.reduce(function (a, b) { return a + b.total; }, 0);
    var expenses = state.expenses.reduce(function (a, b) { return a + b.amount; }, 0);
    if ($('#avgOrder')) $('#avgOrder').textContent = money(state.invoices.length ? revenue / state.invoices.length : 0);
    if ($('#inventoryValue')) $('#inventoryValue').textContent = money(state.products.filter(function (p) { return !isService(p); }).reduce(function (a, p) { return a + (Number(p.cost || 0) * Number(p.stock || 0)); }, 0));
    if ($('#customerCount')) $('#customerCount').textContent = customers().length;
    if ($('#reportExpenses')) $('#reportExpenses').textContent = money(expenses);
    var prod = {};
    state.invoices.forEach(function (i) {
      if (!prod[i.product]) prod[i.product] = { qty: 0, revenue: 0 };
      prod[i.product].qty += Number(i.qty); prod[i.product].revenue += Number(i.total);
    });
    if ($('#productPerformance')) {
      $('#productPerformance').innerHTML = Object.keys(prod)
        .sort(function (a, b) { return prod[b].revenue - prod[a].revenue; })
        .map(function (name) {
          var v = prod[name];
          return '<div class="report-row"><div><b>' + esc(name) + '</b><small>' + v.qty + ' sold / delivered</small></div><strong>' + money(v.revenue) + '</strong></div>';
        }).join('') || '<p class="muted" style="padding:10px 0">No sales data yet.</p>';
    }
    var pay = {};
    state.invoices.forEach(function (i) { pay[i.paymentMethod || 'upi'] = (pay[i.paymentMethod || 'upi'] || 0) + i.total; });
    if ($('#paymentMix')) {
      $('#paymentMix').innerHTML = Object.keys(pay)
        .sort(function (a, b) { return pay[b] - pay[a]; })
        .map(function (name) {
          var v = pay[name];
          return '<div class="report-row"><div><b>' + esc(name.toUpperCase()) + '</b><small>' + (revenue ? Math.round((v / revenue) * 100) : 0) + '% of sales</small></div><strong>' + money(v) + '</strong></div>';
        }).join('') || '<p class="muted" style="color:rgba(255,255,255,.85);padding:10px 0">No payment data yet.</p>';
    }
    renderAging();
    renderSalesPerformance();
    renderExpenseCats();
    renderCashPanel();
    renderPyblRecon();
    renderPnl();
  }

  function pnlFor(from, to) {
    var revenue = 0, cogs = 0;
    state.invoices.forEach(function (i) {
      if ((i.ts || 0) < from || (i.ts || 0) > to) return;
      revenue += Number(i.total || 0);
      var items = (i.items && i.items.length) ? i.items : [{ productId: i.productId, name: i.product, qty: i.qty, cost: i.cost, rate: i.rate, lineTotal: Number(i.total || 0) }];
      items.forEach(function (it) {
        var cst = Number(it.cost || 0);
        if (!cst) { var pp = state.products.find(function (x) { return x.name === it.name; }); cst = pp ? Number(pp.cost || 0) : 0; }
        cogs += cst * Number(it.qty || 0);
      });
    });
    var expenses = 0;
    state.expenses.forEach(function (e) {
      var et = (typeof e.ts === 'number') ? e.ts : new Date(e.date || e.expense_date || 0).getTime();
      if (et >= from && et <= to) expenses += Number(e.amount || 0);
    });
    var gross = revenue - cogs;
    return { revenue: revenue, cogs: cogs, gross: gross, expenses: expenses, net: gross - expenses };
  }
  function renderPnl() {
    if (!($('#pnlRevenue') && $('#pnlCogs'))) return;
    var w = repWindow();
    var p = pnlFor(w.from, w.to);
    $('#pnlRevenue').textContent = money(p.revenue);
    $('#pnlCogs').textContent = money(p.cogs);
    $('#pnlGross').textContent = money(p.gross);
    $('#pnlExpenses').textContent = money(p.expenses);
    $('#pnlNet').textContent = money(p.net);
    var tb = $('#pnlMonths');
    if (tb) {
      var now = new Date(), html = '';
      for (var k = 5; k >= 0; k--) {
        var d = new Date(now.getFullYear(), now.getMonth() - k, 1);
        var from = d.getTime(), to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1;
        var m = pnlFor(from, to);
        var lbl = d.toLocaleString('en', { month: 'short', year: 'numeric' });
        html += '<tr><td data-label="Month"><b>' + lbl + '</b></td><td data-label="Revenue">' + money(m.revenue) + '</td>' +
          '<td data-label="COGS">' + money(m.cogs) + '</td><td data-label="Gross">' + money(m.gross) + '</td>' +
          '<td data-label="Expenses">' + money(m.expenses) + '</td><td data-label="Net"><b style="color:' + (m.net < 0 ? 'var(--danger)' : 'inherit') + '">' + money(m.net) + '</b></td></tr>';
      }
      tb.innerHTML = html;
    }
  }

  function pyblReconRows() {
    var sup = state.purchases.reduce(function (a, p) {
      if (!p || p.status === 'cancelled') return a;
      var k = p.supplierId || p.supplier;
      if (!a[k]) a[k] = { name: p.supplier, bills: 0, billed: 0, paid: 0, balance: 0, overdueAmt: 0, overdueCount: 0 };
      var bal = Math.max(Number(p.balance || 0), 0);
      a[k].bills += 1;
      a[k].billed += Number(p.total || 0);
      (p.payments || []).forEach(function (py) { a[k].paid += Number(py.amount || 0); });
      a[k].balance += bal;
      if (purchaseOverdue(p)) { a[k].overdueAmt += bal; a[k].overdueCount += 1; }
      return a;
    }, {});
    return Object.keys(sup).map(function (k) {
      var r = sup[k];
      r.billed = Math.round(r.billed * 100) / 100;
      r.paid = Math.round(r.paid * 100) / 100;
      r.balance = Math.round(r.balance * 100) / 100;
      r.overdueAmt = Math.round(r.overdueAmt * 100) / 100;
      if (r.balance <= 0.005) r.status = 'settled';
      else if (r.overdueAmt > 0) r.status = 'overdue';
      else r.status = 'open';
      return r;
    }).sort(function (a, b) { return b.balance - a.balance; });
  }
  function renderPyblRecon() {
    var tb = $('#pyblReconTable'); if (!tb) return;
    var rows = pyblReconRows();
    var tot = { bills: 0, billed: 0, paid: 0, balance: 0, overdueAmt: 0 };
    rows.forEach(function (r) { tot.bills += r.bills; tot.billed += r.billed; tot.paid += r.paid; tot.balance += r.balance; tot.overdueAmt += r.overdueAmt; });
    var pill = { settled: 'ok', open: 'open', overdue: 'danger' };
    tb.innerHTML = rows.map(function (r) {
      return '<tr><td data-label="Supplier"><b>' + esc(r.name) + '</b></td>' +
        '<td data-label="Bills">' + r.bills + '</td>' +
        '<td data-label="Billed">' + money(r.billed) + '</td>' +
        '<td data-label="Paid">' + money(r.paid) + '</td>' +
        '<td data-label="Outstanding"><b>' + money(r.balance) + '</b></td>' +
        '<td data-label="Overdue" style="color:' + (r.overdueAmt > 0 ? 'var(--danger)' : 'inherit') + '">' + (r.overdueAmt > 0 ? money(r.overdueAmt) : '—') + '</td>' +
        '<td data-label="Status"><span class="bill-pill ' + pill[r.status] + '">' + r.status + '</span></td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty-cell">No purchase bills recorded yet.</td></tr>';
    if ($('#pyblReconTot')) $('#pyblReconTot').textContent = money(tot.balance);
  }

  function cashMovements() {
    var out = [];
    state.invoices.forEach(function (i) {
      if (String(i.paymentMethod || '').toLowerCase() === 'cash') {
        out.push({ ts: i.ts || 0, date: i.date, party: i.customer, doc: i.id, type: 'Cash sale', amount: Number(i.total || 0), dir: 1 });
      }
      (i.receipts || []).forEach(function (p) {
        if (String(p.method || '').toLowerCase() === 'cash') {
          out.push({ ts: new Date(p.at).getTime() || i.ts || 0, date: fmtDay(new Date(p.at)), party: i.customer, doc: i.id, type: 'Cash collection', amount: Number(p.amount || 0), dir: 1 });
        }
      });
    });
    state.purchases.forEach(function (p) {
      (p.payments || []).forEach(function (py) {
        if (String(py.method || '').toLowerCase() === 'cash') {
          out.push({ ts: new Date(py.at).getTime() || p.ts || 0, date: fmtDay(new Date(py.at)), party: p.supplier, doc: p.number, type: 'Supplier payment', amount: Number(py.amount || 0), dir: -1 });
        }
      });
    });
    return out.sort(function (a, b) { return b.ts - a.ts; });
  }
  function cashTotals() {
    var mv = cashMovements();
    var inn = 0, out = 0;
    mv.forEach(function (x) { if (x.dir > 0) inn += x.amount; else out += x.amount; });
    return { in: inn, out: out, net: inn - out, movements: mv };
  }
  function renderCashPanel() {
    var tb = $('#cashTable'); if (!tb) return;
    var t = cashTotals();
    if ($('#cashIn')) $('#cashIn').textContent = 'Received ' + money(t.in);
    if ($('#cashOut')) $('#cashOut').textContent = 'Paid out ' + money(t.out);
    if ($('#cashNet')) $('#cashNet').textContent = 'Net cash ' + money(t.net);
    tb.innerHTML = t.movements.slice(0, 50).map(function (x) {
      return '<tr><td data-label="Date">' + esc(x.date) + '</td><td data-label="Party">' + esc(x.party) + '</td>' +
        '<td data-label="Document"><span class="sku-tag">' + esc(x.doc) + '</span></td><td data-label="Type">' + esc(x.type) + '</td>' +
        '<td data-label="Amount"><b style="color:' + (x.dir > 0 ? 'var(--success,#16a34a)' : 'var(--danger)') + '">' + (x.dir > 0 ? '+' : '−') + money(x.amount) + '</b></td></tr>';
    }).join('') || '<tr><td colspan="5" class="empty-cell">No cash transactions recorded yet.</td></tr>';
  }

  function renderExpenseCats() {
    var tb = $('#expCatTable'); if (!tb) return;
    var byCat = {}, count = {};
    state.expenses.forEach(function (x) {
      var k = x.category || 'Miscellaneous';
      byCat[k] = (byCat[k] || 0) + x.amount;
      count[k] = (count[k] || 0) + 1;
    });
    var grand = state.expenses.reduce(function (a, b) { return a + b.amount; }, 0);
    var keys = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    tb.innerHTML = keys.map(function (k) {
      return '<tr><td data-label="Category"><b>' + esc(k) + '</b></td><td data-label="Entries">' + count[k] + '</td>' +
        '<td data-label="Amount">' + money(byCat[k]) + '</td><td data-label="Share">' + (grand ? Math.round((byCat[k] / grand) * 100) : 0) + '%</td></tr>';
    }).join('') || '<tr><td colspan="4" class="empty-cell">No expenses recorded yet.</td></tr>';
  }

  /* ============ receivables & payables ageing ============ */
  function renderAging() {
    var now = Date.now();
    var ageDays = function (ts, due) {
      var base = 0;
      if (due) { var d = new Date(due); if (!isNaN(d.getTime())) base = d.getTime(); }
      if (!base) base = ts || now;
      return Math.max(0, Math.floor((now - base) / 864e5));
    };
    var bucketOf = function (d) { return d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+'; };
    var invBal = function (i) { return Math.max(Number(i.balance || 0) || (i.paymentStatus !== 'paid' ? Number(i.total || 0) : 0), 0); };

    var recvItems = state.invoices
      .filter(function (i) { return invBal(i) > 0; })
      .map(function (i) {
        var d = ageDays(i.ts, i.dueDate);
        return { bucket: bucketOf(d), days: d, party: i.customer, number: i.number, due: i.dueDate, total: Number(i.total || 0), balance: invBal(i) };
      });
    var payItems = state.purchases
      .filter(function (p) { return p.status !== 'cancelled' && Number(p.balance || 0) > 0; })
      .map(function (p) {
        var d = ageDays(p.ts, p.dueDate);
        return { bucket: bucketOf(d), days: d, party: p.supplier, number: p.number, due: p.dueDate, total: Number(p.total || 0), balance: Math.max(Number(p.balance || 0), 0) };
      });

    var total = function (arr) { return arr.reduce(function (a, x) { return a + x.balance; }, 0); };
    if ($('#recvTotal')) $('#recvTotal').textContent = money(total(recvItems));
    if ($('#payTotal')) $('#payTotal').textContent = money(total(payItems));

    var todayS = new Date().toISOString().slice(0, 10);
    var isDueToday = function (d) { return d && String(d).slice(0, 10) === todayS; };
    var sumBals = function (arr) { return arr.reduce(function (a, x) { return a + x; }, 0); };
    var recvDueToday = state.invoices.filter(function (i) { return invBal(i) > 0 && isDueToday(i.dueDate); });
    var recvOverdue = state.invoices.filter(invoiceOverdue);
    var payDueToday = state.purchases.filter(function (p) { return p.status !== 'cancelled' && Number(p.balance || 0) > 0 && isDueToday(p.dueDate); });
    var payOverdue = state.purchases.filter(purchaseOverdue);
    if ($('#recvDueToday')) $('#recvDueToday').textContent = 'Due today ' + money(sumBals(recvDueToday.map(invBal)));
    if ($('#recvOverdue')) $('#recvOverdue').textContent = 'Overdue ' + money(sumBals(recvOverdue.map(invBal)));
    if ($('#payDueToday')) $('#payDueToday').textContent = 'Due today ' + money(sumBals(payDueToday.map(function (p) { return Math.max(Number(p.balance || 0), 0); })));
    if ($('#payOverdue')) $('#payOverdue').textContent = 'Overdue ' + money(sumBals(payOverdue.map(function (p) { return Math.max(Number(p.balance || 0), 0); })));

    var strip = function (el, items) {
      if (!el) return;
      var buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      items.forEach(function (x) { buckets[x.bucket] = (buckets[x.bucket] || 0) + x.balance; });
      el.innerHTML = ['0-30', '31-60', '61-90', '90+'].map(function (b) {
        var v = buckets[b] || 0;
        return '<div class="age-chip' + (b === '90+' && v > 0 ? ' danger' : '') + '"><span>' + b + ' days</span><b>' + money(v) + '</b></div>';
      }).join('');
    };
    strip($('#recvBuckets'), recvItems);
    strip($('#payBuckets'), payItems);

    var rows = function (tbody, items) {
      if (!tbody) return;
      tbody.innerHTML = items.length
        ? items.slice().sort(function (a, b) { return b.days - a.days; }).map(function (x) {
            var due = x.due ? esc(String(x.due).slice(0, 10)) : '—';
            return '<tr><td data-label="Party">' + esc(x.party) + '</td><td data-label="Document"><span class="sku-tag">' + esc(x.number) + '</span></td><td data-label="Due">' + due + '</td><td data-label="Total">' + money(x.total) + '</td><td data-label="Balance"><b>' + money(x.balance) + '</b></td></tr>';
          }).join('')
        : '<tr><td colspan="5" class="empty-cell">Nothing outstanding — all settled.</td></tr>';
    };
    rows($('#recvAgingTable'), recvItems);
    rows($('#payAgingTable'), payItems);
  }

  /* ============ settings ============ */
  var settingsLocked = false;
  function renderSettings() {
    if (!state.businessId) return;
    var biz = state.businessProfile || {};
    var isOwner = state.role === 'owner';
    var hint = $('#settingsHint');
    if (hint) hint.textContent = isOwner ? 'Business profile is updated here. Only the owner can change these details.' : 'Business profile is managed by the workspace owner.';
    var roleEl = $('#settingsRole');
    if (roleEl) { roleEl.textContent = 'Role · ' + (state.role || 'owner'); roleEl.hidden = false; }
    var editable = !isOwner;
    ['setName', 'setPhone', 'setAddress', 'setCurrency', 'setPrefix'].forEach(function (id) {
      var el = $(id); if (el) el.disabled = editable;
    });
    var f = $('#settingsForm');
    if (f && !settingsLocked) {
      f._filled = true;
      if ($('#setName')) $('#setName').value = biz.name || state.businessName || '';
      if ($('#setPhone')) $('#setPhone').value = biz.phone || '';
      if ($('#setAddress')) $('#setAddress').value = biz.address || '';
      if ($('#setCurrency')) $('#setCurrency').value = state.currency || biz.currency || 'INR';
      if ($('#setPrefix')) $('#setPrefix').value = biz.invoice_prefix || '';
    }
    if ($('#setBusinessId')) $('#setBusinessId').textContent = state.businessId;
    if ($('#setSlug')) $('#setSlug').textContent = biz.slug || '—';
    if ($('#setRole')) $('#setRole').textContent = state.role || '—';
    var plan = $('#setPlan');
    if (plan) plan.textContent = billingState && billingState.plan ? billingState.plan : 'Active subscription';
  }
  function bindSettings() {
    ['#tallySalesBtn', '#tallyPurchasesBtn', '#tallyLedgersBtn'].forEach(function (id) {
      var b = $(id);
      if (b) b.addEventListener('click', function () {
        var kind = id === '#tallySalesBtn' ? 'sales' : id === '#tallyPurchasesBtn' ? 'purchases' : 'ledgers';
        exportTally(kind);
      });
    });
    var form = $('#settingsForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!state.businessId) { toast('Open your cloud workspace first'); return; }
      if (state.role !== 'owner') { toast('Only the business owner can save settings'); return; }
      var patch = {
        name: $('#setName').value.trim(),
        phone: $('#setPhone').value.trim() || null,
        address: $('#setAddress').value.trim() || null,
        currency: $('#setCurrency').value,
        invoice_prefix: $('#setPrefix').value.trim()
      };
      if (!patch.name) { toast('Business name is required'); return; }
      try {
        settingsLocked = true;
        var updated = await cloud.businesses.update(state.businessId, patch);
        settingsLocked = false;
        state.businessProfile = updated || state.businessProfile;
        state.businessName = updated.name || state.businessName;
        state.currency = updated.currency || state.currency;
        var bn = $('#businessName'); if (bn) bn.textContent = state.businessName;
        var sn = $('#storeName'); if (sn) sn.textContent = state.businessName;
        var meta = $('#storeMeta'); if (meta) meta.textContent = 'Business · cloud · ' + state.currency;
        var ini = initials(state.businessName);
        var sa = $('#storeAvatar'); if (sa) sa.textContent = ini;
        var pb = $('#profileBadge'); if (pb) pb.textContent = ini;
        renderSettings();
        toast('Settings saved');
      } catch (err) { settingsLocked = false; toast(friendly(err)); }
    });
  }

  /* ============ export ============ */
  function bindExport() {
    var btn = $('#exportData');
    if (btn) btn.addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({
        product: 'Salesventory', exportedAt: new Date().toISOString(),
        mode: state.mode, businessId: state.businessId, role: state.role,
        products: state.products, invoices: state.invoices, expenses: state.expenses,
        suppliers: state.suppliers, purchases: state.purchases
      }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'salesventory-business-backup.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
      toast('Business data exported');
    });
  }

  function parseCsv(text) {
    text = String(text || '').replace(/^\uFEFF/, '');
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
        row = [];
      } else cur += ch;
    }
    row.push(cur);
    if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
    return rows;
  }
  function mapImportRow(kind, arr) {
    if (!arr || !arr.length) return null;
    var heads = arr.map(function (h) { return String(h || '').trim().toLowerCase(); });
    var val = function (re, fallback) { for (var i = 0; i < heads.length; i++) if (re.test(heads[i])) return String(arr[i] || '').trim(); return fallback; };
    var num = function (re) { var v = val(re); var n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
    var name = val(/name/);
    if (!name) return null;
    if (kind === 'product') {
      var service = /yes|true|service|1/i.test(val(/service|track/i) || '');
      return {
        name: name, cost: num(/cost/), price: num(/price|selling|rate/),
        stock: service ? 0 : num(/^stock|qty|quantity/), reorder: service ? 0 : num(/reorder/),
        category: val(/category|cat$/), sku: val(/sku|\bcode$/), barcode: val(/barcode|ean|upc/),
        unit: val(/unit|uom/) || (service ? 'service' : 'pcs'), service: service
      };
    }
    if (kind === 'customer') {
      var customerTags = val(/tags?/);
      return {
        name: name, phone: val(/phone|mobile/), email: val(/e-?mail/), company: val(/company|firm|business/),
        address: val(/address/), tags: customerTags ? customerTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [], notes: val(/notes?/)
      };
    }
    return {
      name: name, phone: val(/phone|mobile/), email: val(/e-?mail/), gst: val(/gst|gstin|tax/),
      address: val(/address/), contact: val(/contact|person|representative/), terms: Math.round(num(/terms|days/)), notes: val(/notes?/)
    };
  }
  function bindCsvImport(kind) {
    var btn = $('#importCsvBtn'), inp = $('#importCsvInput');
    if (!btn || !inp) return;
    btn.addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', async function () {
      var file = inp.files && inp.files[0];
      inp.value = '';
      if (!file) return;
      var text = await file.text();
      var rows = parseCsv(text);
      if (!rows.length) { toast('Empty CSV or missing header row'); return; }
      var mapped = rows.slice(1).map(function (r) { return mapImportRow(kind, r); }).filter(Boolean);
      if (!mapped.length) { toast('No valid rows — check that a “name” column exists'); return; }
      var preview = mapped.slice(0, 3).map(function (r) { return r.name; }).join(', ');
      var ok = await confirmDialog('Import ' + mapped.length + ' ' + kind + '(s)?', 'Preview: ' + preview + (mapped.length > 3 ? ' + ' + (mapped.length - 3) + ' more' : '') + '. Duplicates and invalid rows are skipped.');
      if (!ok) return;
      var done = 0, errs = 0;
      for (var i = 0; i < mapped.length; i++) {
        try {
          if (kind === 'product') await cloud.products.create(state.businessId, mapped[i]);
          else if (kind === 'customer') await cloud.customers.create(state.businessId, mapped[i]);
          else await cloud.suppliers.create(state.businessId, state.user && state.user.id, mapped[i]);
          done++;
        } catch (e) { errs++; }
      }
      toast('Imported ' + done + ' ' + kind + '(s)' + (errs ? ' · ' + errs + ' failed' : ''));
      await refreshCloudData();
    });
  }
  function downloadCSV(filename, headers, rows) {
    var csvCell = function (v) {
      var s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var lines = [headers.map(csvCell).join(',')].concat(rows.map(function (r) { return r.map(csvCell).join(','); }));
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    toast('Report exported');
  }

  /* ============ catalogue & restock list ============ */
  function shareCatalogue() {
    var biz = state.businessProfile || {};
    var cat = biz.name || state.businessName || 'Our store';
    var list = state.products.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (!list.length) { toast('Add products before sharing a catalogue'); return; }
    var text = '*' + cat + ' — Catalogue*\n\n' + list.filter(function (p) { return !isService(p); }).map(function (p) {
      return '• ' + p.name + ' — ' + money(p.price) + (p.category ? ' (' + p.category + ')' : '');
    }).join('\n') + '\n\n' + 'Prices in ' + symbol() + '. Message us for availability & orders!';
    copyClipboard(text);
    toast('Catalogue copied — paste it in WhatsApp');
  }
  function printRestockList() {
    var low = state.products.filter(function (p) { return !isService(p); })
      .filter(function (p) { return p.stock <= p.reorder; })
      .sort(function (a, b) { return (a.stock / Math.max(a.reorder, 1)) - (b.stock / Math.max(b.reorder, 1)); });
    if (!low.length) { toast('Nothing to restock — stock looks healthy'); return; }
    var biz = state.businessProfile || {};
    var rows = low.map(function (p) {
      var suggest = Math.max(p.reorder - p.stock, 1);
      return '<tr><td>' + esc(p.name) + (p.sku ? ' · ' + esc(p.sku) : '') + '</td><td>' + (p.category ? esc(p.category) : '—') + '</td><td>' + p.stock + '</td><td>' + p.reorder + '</td><td><b>' + suggest + '</b> ' + esc(p.unit || 'units') + '</td></tr>';
    }).join('');
    var w = window.open('', '_blank', 'width=700,height=800');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print.'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Restock list</title><style>' +
      'body{font-family:system-ui,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}' +
      'p.muted{color:#555;margin:4px 0 14px}table{width:100%;border-collapse:collapse;font-size:14px}' +
      'th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #ddd}th{background:#f4f4f4;text-transform:uppercase;font-size:11px;letter-spacing:.04em}' +
      '</style></head><body>' +
      '<h1>Restock list</h1><p class="muted">' + esc(biz.name || state.businessName || 'Store') + ' · ' + low.length + ' items below reorder level · ' + new Date().toDateString() + '</p>' +
      '<table><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Reorder level</th><th>Suggested order</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<script>print()<\/script></body></html>');
    w.document.close();
  }
  function copyClipboard(text) {
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { legacy(); });
    } else legacy();
  }

  function exportTally(kind) {
    var now = new Date().toISOString().slice(0, 10);
    if (kind === 'sales') {
      var srows = [];
      state.invoices.forEach(function (i) {
        var items = (i.items && i.items.length) ? i.items : [{ name: i.product, qty: i.qty, rate: i.rate, lineTotal: Number(i.total || 0) }];
        items.forEach(function (it) {
          var lineAmt = Number(it.lineTotal || 0) || Number(it.rate || 0) * Number(it.qty || 0);
          srows.push([i.date, i.id, i.customer || 'Walk-in customer', 'Sundry Debtors', 'Sales Accounts', lineAmt, String(i.paymentStatus || 'paid'), String(i.paymentMethod || '')]);
        });
      });
      downloadCSV('tally-sales-vouchers-' + now + '.csv',
        ['Date', 'Voucher No', 'Party Ledger', 'Ledger Group', 'Sales Account', 'Amount', 'Payment Status', 'Payment Mode'], srows);
      return;
    }
    if (kind === 'purchases') {
      var prows = [];
      state.purchases.forEach(function (p) {
        prows.push([p.date || '', p.number, p.supplier, 'Sundry Creditors', 'Purchases Accounts', Number(p.total || 0), String(p.status || ''), String(p.balance || '')]);
      });
      downloadCSV('tally-purchase-vouchers-' + now + '.csv',
        ['Date', 'Voucher No', 'Party Ledger', 'Ledger Group', 'Purchases Account', 'Amount', 'Status', 'Balance'], prows);
      return;
    }
    var ledrows = [];
    customers().forEach(function (c) {
      ledrows.push([c.name, 'Sundry Debtors', String(c.phone || ''), c.orders, money(c.total || 0), money(c.outstanding || 0)]);
    });
    (state.suppliers || []).forEach(function (s) {
      var billed = state.purchases.filter(function (p) { return String(p.supplierId) === String(s.id) && p.status !== 'cancelled'; }).reduce(function (a, p) { return a + Number(p.total || 0); }, 0);
      ledrows.push([s.name, 'Sundry Creditors', String(s.phone || ''), supplierPurchaseCount(s), money(billed), money(supplierOutstanding(s))]);
    });
    downloadCSV('tally-party-ledgers-' + now + '.csv',
      ['Ledger Name', 'Ledger Group', 'Phone', 'Transactions', 'Turnover', 'Outstanding Balance'], ledrows);
  }
  function reportCSV(kind) {
    var now = new Date().toISOString().slice(0, 10);
    if (kind === 'sales') {
      downloadCSV('salesventory-transactions-' + now + '.csv',
        ['Transaction', 'Customer', 'Phone', 'Item', 'Qty', 'Rate', 'Subtotal', 'Discount', 'Total', 'Paid', 'Balance', 'Status', 'Due', 'Method', 'Date'],
        (state.invoices || []).map(function (i) {
          return [i.id, i.customer, i.phone, i.product, i.qty, i.rate, i.subtotal, i.discount, i.total, i.paid, i.balance,
            invoiceOverdue(i) ? 'overdue' : (i.paymentStatus || 'paid'), i.dueDate || '', i.paymentMethod || '', i.date];
        }));
      return;
    }
    if (kind === 'expenses') {
      downloadCSV('salesventory-expenses-' + now + '.csv',
        ['Date', 'Category', 'Amount', 'Note'],
        (state.expenses || []).map(function (e) { return [e.date, e.category, e.amount, e.note]; }));
      return;
    }
    if (kind === 'expcats') {
      var byCat = {};
      (state.expenses || []).forEach(function (x) {
        var k = x.category || 'Miscellaneous';
        byCat[k] = (byCat[k] || 0) + x.amount;
      });
      downloadCSV('salesventory-expenses-by-category-' + now + '.csv',
        ['Category', 'Amount'],
        Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).map(function (k) { return [k, byCat[k]]; }));
      return;
    }
    if (kind === 'pyblrecon') {
      downloadCSV('salesventory-payables-recon-' + now + '.csv',
        ['Supplier', 'Bills', 'Billed', 'Paid', 'Outstanding', 'Overdue', 'Status'],
        pyblReconRows().map(function (r) {
          return [r.name, r.bills, r.billed, r.paid, r.balance, r.overdueAmt, r.status];
        }));
      return;
    }
    if (kind === 'inventory') {
      downloadCSV('salesventory-inventory-' + now + '.csv',
        ['Name', 'SKU', 'Category', 'Unit', 'Cost', 'Selling price', 'Stock', 'Reorder', 'Stock value'],
        (state.products || []).map(function (p) {
          return [p.name, p.sku || '', p.category || '', p.unit || '', p.cost, p.price, p.stock, p.reorder, Number(p.stock || 0) * Number(p.cost || 0)];
        }));
      return;
    }
    if (kind === 'receivables') {
      var open = (state.invoices || []).filter(function (i) { return Number(i.balance || 0) > 0; });
      downloadCSV('salesventory-receivables-' + now + '.csv',
        ['Customer', 'Invoice', 'Due date', 'Total', 'Paid', 'Balance', 'Age'],
        open.map(function (i) {
          return [i.customer, i.id, i.dueDate || '', i.total, i.paid, i.balance,
            i.dueDate ? Math.max(0, Math.floor((Date.now() - new Date(i.dueDate).getTime()) / 864e5)) + ' days' : ''];
        }));
    }
  }
  function printReport() {
    var w = window.open('', '_blank', 'width=1024,height=900');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print reports.'); return; }
    var open = (state.invoices || []).filter(function (i) { return Number(i.balance || 0) > 0; });
    var invRows = (state.invoices || []).slice(0, 100).map(function (i) {
      return '<tr><td>' + esc(i.id) + '</td><td>' + esc(i.customer) + '</td><td>' + esc(i.product) + ' × ' + i.qty + '</td>' +
        '<td class="num">' + money(i.total) + '</td><td>' + (invoiceOverdue(i) ? 'overdue' : esc(i.paymentStatus || 'paid')) + '</td><td>' + esc(i.date) + '</td></tr>';
    }).join('');
    var expRows = (state.expenses || []).slice(0, 100).map(function (e) {
      return '<tr><td>' + esc(e.date) + '</td><td>' + esc(e.category) + '</td><td>' + money(e.amount) + '</td><td>' + esc(e.note) + '</td></tr>';
    }).join('');
    var expByCat = {};
    (state.expenses || []).forEach(function (e) { var k = e.category || 'Miscellaneous'; expByCat[k] = (expByCat[k] || 0) + e.amount; });
    var expCatRows = Object.keys(expByCat).sort(function (a, b) { return expByCat[b] - expByCat[a]; })
      .map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="num">' + money(expByCat[k]) + '</td></tr>'; }).join('');
    var invValue = (state.products || []).reduce(function (a, p) { return a + Number(p.stock || 0) * Number(p.cost || 0); }, 0);
    var trxTotal = (state.invoices || []).reduce(function (a, i) { return a + Number(i.total || 0); }, 0);
    var expTotal = (state.expenses || []).reduce(function (a, e) { return a + Number(e.amount || 0); }, 0);
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>Salesventory report</title>' +
      '<style>body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:32px;font-size:12px}' +
      'h1{font-size:20px;margin:0 0 2px}h2{font-size:13px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.05em}' +
      '.muted{color:#666}.tl{overflow:hidden;margin:0 0 6px}.tl b{float:right}' +
      'table{width:100%;border-collapse:collapse;margin:0 0 4px}' +
      'th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}' +
      'th{background:#f4f4f4}.num{text-align:right}.tot{font-weight:bold;font-size:12px}' +
      '.sum li{display:inline-block;margin-right:26px}.sum .k{color:#666;display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em}' +
      '</style></head><body>' +
      '<h1>' + esc(state.businessName) + '</h1><div class="muted">Business performance report · Generated ' + new Date().toDateString() + '</div>' +
      '<div class="sum"><ul style="list-style:none;padding:0">' +
      '<li><span class="k">Total sales</span><b>' + money(trxTotal) + '</b></li>' +
      '<li><span class="k">Total expenses</span><b>' + money(expTotal) + '</b></li>' +
      '<li><span class="k">Inventory value</span><b>' + money(invValue) + '</b></li>' +
      '<li><span class="k">Outstanding</span><b>' + money(open.reduce(function (a, i) { return a + Number(i.balance || 0); }, 0)) + '</b></li>' +
      '<li><span class="k">Net cash</span><b>' + money(cashTotals().net) + '</b></li>' +
      '<li><span class="k">Net profit</span><b>' + money(pnlFor(0, Date.now() + 864e5).net) + '</b></li>' +
      '</ul></div>' +
      '<h2>Transactions</h2><table><thead><tr><th>ID</th><th>Customer</th><th>Item</th><th class="num">Total</th><th>Status</th><th>Date</th></tr></thead><tbody>' + (invRows || '<tr><td colspan="6">No transactions</td></tr>') + '</tbody></table>' +
      '<h2>Expenses</h2><table><thead><tr><th>Date</th><th>Category</th><th class="num">Amount</th><th>Note</th></tr></thead><tbody>' + (expRows || '<tr><td colspan="4">No expenses</td></tr>') + '</tbody></table>' +
      '<h2>Expenses by category</h2><table><thead><tr><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' + (expCatRows || '<tr><td colspan="2">No expenses</td></tr>') + '</tbody></table>' +
      '<h2>Outstanding receivables</h2><table><thead><tr><th>Customer</th><th>Invoice</th><th class="num">Balance</th></tr></thead><tbody>' +
      (open.map(function (i) { return '<tr><td>' + esc(i.customer) + '</td><td>' + esc(i.id) + '</td><td class="num">' + money(i.balance) + '</td></tr>'; }).join('') || '<tr><td colspan="3">All settled</td></tr>') +
      '</tbody></table>' +
      '<p class="muted">Exported from Salesventory. Business ID: ' + esc(state.businessId || '—') + '</p>' +
      '</body></html>');
    w.document.close();
    w.focus();
    w.print();
  }
  function bindReports() {
    var map = { csvSalesBtn: 'sales', csvExpensesBtn: 'expenses', csvInventoryBtn: 'inventory', csvAgingBtn: 'receivables', csvExpcatBtn: 'expcats', csvPyblReconBtn: 'pyblrecon' };
    Object.keys(map).forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function () { reportCSV(map[id]); });
    });
    var pb = $('#printReportBtn');
    if (pb) pb.addEventListener('click', printReport);
    var repRange = $('#repRange');
    if (repRange) {
      repRange.addEventListener('change', function () {
        var custom = repRange.value === 'custom';
        var f = $('#repFrom'), t = $('#repTo');
        if (f) f.disabled = !custom;
        if (t) t.disabled = !custom;
        renderSalesPerformance();
      });
      ['#repFrom', '#repTo'].forEach(function (sel) {
        var el = $(sel);
        if (el) el.addEventListener('change', renderSalesPerformance);
      });
    }
  }

  /* ============ plans & billing ============ */
  var PLANS = { INR: { monthly: { amount: 399, label: '₹399' }, annual: { amount: 3990, label: '₹3,990' } }, USD: { monthly: { amount: 4.99, label: '$4.99' }, annual: { amount: 49.99, label: '$49.99' } } };
  var billingState = { interval: 'monthly', currency: 'INR', config: null, ready: false, loading: false, lastAttempt: 0, failTries: 0, error: null };
  var razorpayPromise = null;

  async function authToken() {
    if (!cloud) throw new Error('Open a cloud workspace first.');
    var res = await cloud.auth.session();
    var token = res && res.data ? res.data.session && res.data.session.access_token : null;
    if (!token) throw new Error('Please sign in before managing a paid plan.');
    return token;
  }
  async function apiPost(path, body) {
    var token = await authToken();
    var r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(body || {}) });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) { var e = new Error(data.error || 'Payment request failed (' + r.status + ')'); e.status = r.status; e.code = data.code; throw e; }
    return data;
  }
  async function billingStatus() {
    if (!cloud || !state.businessId) return null;
    var token = await authToken();
    var r = await fetch('/api/billing/status?businessId=' + encodeURIComponent(state.businessId), { headers: { authorization: 'Bearer ' + token }, cache: 'no-store' });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(data.error || 'Unable to load billing status');
    return data;
  }
  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve(window.Razorpay);
    if (razorpayPromise) return razorpayPromise;
    razorpayPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.async = true;
      s.onload = function () { window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay Checkout did not load')); };
      s.onerror = function () { reject(new Error('Unable to load secure payment checkout')); };
      document.head.appendChild(s);
    });
    return razorpayPromise;
  }
  function statusLabel(status) {
    if (!status) return 'Free workspace';
    if (status === 'created' || status === 'authenticated') return 'Payment received — activation pending';
    if (status === 'active') return 'Active subscription';
    if (status === 'past_due' || status === 'pending' || status === 'halted') return 'Payment attention needed';
    if (status === 'cancelled') return 'Cancellation scheduled';
    if (status === 'pending_verification') return 'Awaiting manual payment verification';
    return String(status);
  }
  var statusToCss = function (status) {
    if (!status) return 'neutral';
    if (status === 'active') return '';
    if (status === 'created' || status === 'authenticated' || status === 'pending_verification') return 'warn';
    return 'low';
  };

  function renderPlans() {
    var interval = billingState.interval, currency = billingState.currency;
    var price = PLANS[currency][interval];
    if ($('#planPrice')) $('#planPrice').textContent = price.label;
    var meta = $('#planPriceMeta');
    if (meta) meta.textContent = interval === 'annual' ? '/ year (2 months free)' : '/ month';
    var sub = billingState.config ? billingState.config.subscription : null;

    if (!cloud || !state.businessId) {
      var card = $('#planStatusCard'), note = $('#planCtaNote');
      if (card) card.hidden = true;
      if (note) note.textContent = 'Sign in with a cloud workspace to manage or activate your plan.';
      return;
    }
    if (!billingState.ready) {
      var pendingNote = $('#planCtaNote');
      if (pendingNote && billingState.error) pendingNote.textContent = billingState.error;
      if (!billingState.loading && billingState.failTries < 2 && Date.now() - billingState.lastAttempt > 8000) { loadBillingStatus(); return; }
      return;
    }

    var cardEl = $('#planStatusCard');
    var titleEl = $('#planStatusTitle'), metaEl = $('#planStatusMeta');
    var isActive = sub && sub.status === 'active';
    var pendingActivation = sub && (sub.status === 'created' || sub.status === 'authenticated');
    if (cardEl) {
      cardEl.hidden = false;
      cardEl.style.borderLeftColor = statusToCss(sub && sub.status) === 'low' ? 'var(--danger)' : statusToCss(sub && sub.status) === 'warn' ? 'var(--warn)' : 'var(--brand)';
      if (titleEl) {
        titleEl.textContent = statusLabel(sub && sub.status);
        titleEl.style.color = pendingActivation ? 'var(--warn)' : (sub && sub.status === 'active' ? 'var(--ok)' : 'var(--ink)');
      }
      if (metaEl) {
        var parts = [];
        if (sub) {
          if (sub.plan_interval) parts.push(sub.plan_interval + ' (' + (sub.currency || 'INR') + ')');
          if (sub.current_period_end) parts.push('current period ends ' + new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
          if (sub.pending_plan_interval) parts.push('plan change scheduled for period end');
          if (sub.cancel_at_period_end) parts.push('cancellation at period end');
          if (pendingActivation) parts.push('provider confirmation required before access activates');
          if (sub.status === 'pending_verification') parts.push('manual payment is under review by the team');
        } else parts.push('You are on the free workspace.');
        metaEl.textContent = parts.join(' · ') || 'No subscription yet.';
      }
    }
    var upsell = $('#upgradePlan'), noteEl = $('#planCtaNote');
    if (isActive) {
      if (upsell) { upsell.textContent = 'Change plan'; upsell.disabled = sub.plan_interval === interval && sub.currency === currency; }
      if (noteEl) noteEl.textContent = 'Your workspace remains fully active while changes take effect at period end.';
    } else {
      if (upsell) upsell.textContent = 'Upgrade now';
      if (noteEl) noteEl.textContent = 'No charges until checkout is completed. Cancel anytime.';
    }
    try {
      billingState.config && ($('#supportLink').href = 'mailto:' + (window.SV_SUPPORT_EMAIL || 'support@salesventory.app'));
    } catch (e) {}
  }

  async function loadBillingStatus() {
    if (billingState.loading) return;
    billingState.loading = true;
    billingState.lastAttempt = Date.now();
    var cardEl = $('#planStatusCard');
    try {
      billingState.config = await billingStatus();
      billingState.ready = true;
      billingState.error = null;
      billingState.failTries = 0;
    } catch (err) {
      billingState.ready = false;
      billingState.failTries = (billingState.failTries || 0) + 1;
      billingState.error = billingState.failTries > 2 ? 'Billing status is temporarily unavailable. Refresh the page to retry.' : friendly(err);
      if (cardEl) cardEl.hidden = true;
    } finally {
      billingState.loading = false;
    }
    renderPlans();
  }

  async function openAutomated() {
    var interval = billingState.interval, currency = billingState.currency;
    var btn = $('#upgradePlan');
    if (!state.businessId) { toast('Open your cloud workspace first'); return; }
    var original = btn.textContent;
    btn.disabled = true; btn.textContent = 'Opening secure checkout…';
    try {
      var currentSub = billingState.config && billingState.config.subscription ? billingState.config.subscription : null;
      if (currentSub && currentSub.status === 'active') {
        if (currentSub.plan_interval === interval && currentSub.currency === currency) {
          toast('You are already on this Salesventory plan');
          return;
        }
        btn.textContent = 'Scheduling plan change…';
        await apiPost('/api/billing/change-plan', { businessId: state.businessId, interval: interval, currency: currency });
        billingState.ready = false; loadBillingStatus();
        toast('Plan change scheduled. It takes effect at the end of your current period.');
        return;
      }
      var created = await apiPost('/api/billing/create-subscription', { businessId: state.businessId, interval: interval, currency: currency });
      var Razorpay = await loadRazorpay();
      var userData = state.user;
      var options = {
        key: created.keyId,
        subscription_id: created.subscriptionId,
        name: 'Salesventory',
        description: created.label || (interval + ' subscription'),
        prefill: {
          name: (userData && (userData.user_metadata && (userData.user_metadata.full_name || userData.user_metadata.name))) || '',
          email: userData ? userData.email : '',
          contact: ''
        },
        notes: { business_id: state.businessId, plan_interval: interval, currency: currency },
        theme: { color: '#6E6CFF', backdrop_color: '#070B14' },
        handler: async function (response) {
          try {
            var verified = await apiPost('/api/billing/verify-payment', Object.assign({ businessId: state.businessId }, response));
            billingState.ready = false; loadBillingStatus();
            toast('Payment verified. Salesventory access is active.');
          } catch (err) { toast(friendly(err)); }
        },
        modal: { ondismiss: function () {} }
      };
      var checkout = new Razorpay(options);
      checkout.on('payment.failed', function (response) {
        toast((response && response.error && response.error.description) || 'Payment failed. No subscription access was activated.');
      });
      checkout.open();
    } catch (err) {
      if (currency === 'INR' && (err.status === 503 || /not configured|configuration/i.test(err.message || ''))) {
        toast('Automated checkout is being configured. Opening the verified UPI fallback.');
        openManualQr();
      } else toast(friendly(err));
    } finally {
      btn.disabled = false; btn.textContent = original;
    }
  }

  function ensureUpiDialog() {
    if ($('#mfUpiDialog')) return;
    var el = document.createElement('dialog');
    el.id = 'mfUpiDialog';
    el.className = 'dialog-card';
    el.innerHTML =
      '<div><p class="kicker">MANUAL UPI FALLBACK</p><h3 id="mfUpiTitle">Pay Salesventory</h3></div>' +
      '<div style="text-align:center;margin:6px 0 14px"><img id="mfUpiQr" alt="UPI payment QR code" width="220" height="220" style="border-radius:12px;border:1px solid var(--line)">' +
      '<p style="margin:12px 0 0;font-size:22px;font-weight:700" id="mfUpiAmount"></p><p class="muted" id="mfUpiId" style="font-size:12px"></p></div>' +
      '<a class="btn primary full" id="mfUpiOpen" href="#" target="_blank" rel="noopener">Open UPI app</a>' +
      '<p class="muted" style="font-size:12px;margin:12px 0">Access activates only after our team verifies this payment.</p>' +
      '<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;margin-bottom:12px">UPI transaction/reference number<input id="mfUpiUtr" inputmode="numeric" autocomplete="off" placeholder="Example: 415812345678"></label>' +
      '<button class="btn primary full" id="mfUpiSubmit" type="button">Submit payment for verification</button>' +
      '<p id="mfUpiStatus" class="muted" style="font-size:12px;margin:10px 0 0"></p>' +
      '<div class="dialog-actions"><button class="btn ghost" id="mfUpiClose" type="button">Close</button></div>';
    document.body.appendChild(el);
    $('#mfUpiClose').addEventListener('click', function () { el.close(); });
    $('#mfUpiSubmit').addEventListener('click', submitManualPayment);
  }
  async function openManualQr() {
    ensureUpiDialog();
    if (!state.businessId) { toast('Open your cloud workspace first'); return; }
    var interval = billingState.interval;
    var r = await fetch('/api/upi-config', { cache: 'no-store' });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) { toast(data.error || 'UPI payment is not configured yet'); return; }
    var amount = PLANS.INR[interval].amount;
    var params = new URLSearchParams({ pa: data.upiId, pn: data.payeeName, am: String(amount), cu: 'INR', tn: 'Salesventory ' + interval + ' plan' });
    var uri = 'upi://pay?' + params.toString();
    $('#mfUpiTitle').textContent = (interval === 'annual' ? 'Annual' : 'Monthly') + ' Salesventory plan';
    $('#mfUpiAmount').textContent = '₹' + amount.toLocaleString('en-IN');
    $('#mfUpiId').textContent = data.upiId;
    $('#mfUpiQr').src = 'https://quickchart.io/qr?size=240&margin=2&text=' + encodeURIComponent(uri);
    $('#mfUpiOpen').href = uri;
    $('#mfUpiUtr').value = '';
    $('#mfUpiStatus').textContent = '';
    $('#mfUpiDialog').dataset.interval = interval;
    $('#mfUpiDialog').showModal();
  }
  async function submitManualPayment() {
    var d = $('#mfUpiDialog');
    var utr = $('#mfUpiUtr').value.trim();
    var statusEl = $('#mfUpiStatus');
    var btn = $('#mfUpiSubmit');
    if (!utr) { statusEl.textContent = 'Enter the UPI transaction/reference number.'; return; }
    btn.disabled = true; btn.textContent = 'Submitting…';
    statusEl.textContent = 'Submitting payment for verification…';
    try {
      await apiPost('/api/manual-payment', { businessId: state.businessId, interval: d.dataset.interval, currency: 'INR', amount: PLANS.INR[d.dataset.interval].amount, utr: utr });
      statusEl.textContent = 'Payment submitted. Access remains locked until verification.';
      billingState.ready = false; loadBillingStatus();
      toast('Payment submitted for verification');
    } catch (err) { statusEl.textContent = friendly(err); toast(friendly(err)); }
    finally { btn.disabled = false; btn.textContent = 'Submit payment for verification'; }
  }

  function bindPlans() {
    $$('.interval-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        billingState.interval = c.dataset.interval;
        $$('.interval-btn').forEach(function (x) { var on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
        renderPlans();
      });
    });
    $$('.currency-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        billingState.currency = c.dataset.currency;
        $$('.currency-btn').forEach(function (x) { var on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
        renderPlans();
      });
    });
    $('#upgradePlan').addEventListener('click', function () { openAutomated(); });
    $('#manualUpiButton').addEventListener('click', function () { openManualQr(); });
    $('#syncPlan').addEventListener('click', async function () {
      var btn = $('#syncPlan'); btn.disabled = true; btn.textContent = 'Syncing…';
      try { var res = await apiPost('/api/billing/sync', { businessId: state.businessId }); toast('Plan synced (' + (res.status || 'ok') + ')'); billingState.ready = false; loadBillingStatus(); }
      catch (err) { toast(friendly(err)); }
      finally { btn.disabled = false; btn.textContent = 'Sync with provider'; }
    });
    $('#cancelPlan').addEventListener('click', async function () {
      var ok = await confirmDialog('Cancel subscription?', 'Your workspace stays accessible until the current period ends.');
      if (!ok) return;
      var btn = $('#cancelPlan'); btn.disabled = true;
      try { await apiPost('/api/billing/cancel', { businessId: state.businessId }); toast('Cancellation scheduled for period end'); billingState.ready = false; loadBillingStatus(); }
      catch (err) { toast(friendly(err)); }
      finally { btn.disabled = false; }
    });
  }

  /* ============ theme ============ */
  function themeMeta() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', document.documentElement.getAttribute('data-theme') === 'light' ? '#F4F6FB' : '#070B14');
  }
  function bindTheme() {
    var btn = $('#themeToggle');
    if (btn) btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('sv-theme', next); } catch (e) { }
      themeMeta();
    });
    themeMeta();
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (ev) {
      try { if (!localStorage.getItem('sv-theme')) document.documentElement.setAttribute('data-theme', ev.matches ? 'light' : 'dark'); } catch (e) { }
    });
  }
  /* ============ render all ============ */
  var rendering = false;
  function renderAll() {
    if (rendering) return;
    rendering = true;
    try {
      productOptions(); renderInventory(); renderCustomers(); renderSuppliers(); renderPurchases(); renderExpenses();
      renderInvoices(); renderReceipts(); renderDashboard(); renderReports();
      renderPlans(); updatePreview(); renderSettings();
      handleOpenIntent();
    } finally { rendering = false; }
  }

  /* ============ quick create + global search ============ */
  function initQuickCreate() {
    var btn = $('#quickCreateBtn'), menu = $('#quickCreateMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var was = menu.hidden;
      hideQuickMenu(); menu.hidden = !was;
    });
    document.addEventListener('click', hideQuickMenu);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideQuickMenu(); });
  }
  function hideQuickMenu() {
    var menu = $('#quickCreateMenu');
    if (menu) menu.hidden = true;
  }
  function globalResultsData(q) {
    q = String(q || '').toLowerCase().trim();
    var out = [];
    if (!q) return out;
    var push = function (type, page, id, label, sub) {
      if (out.length >= 8) return;
      out.push({ type: type, href: page + '#open=' + type + ':' + encodeURIComponent(String(id)), label: label, sub: sub });
    };
    (state.products || []).forEach(function (p) {
      if (out.length >= 8) return;
      if ((p.name + ' ' + (p.sku || '') + ' ' + (p.barcode || '') + ' ' + (p.category || '')).toLowerCase().indexOf(q) !== -1)
        push('product', 'products.html', p.id, p.name, (p.category || 'Product') + (p.stock != null ? ' · stock ' + p.stock : ''));
    });
    customers().forEach(function (c) {
      if (out.length >= 8) return;
      if ((c.name + ' ' + (c.phone || '') + ' ' + (c.company || '')).toLowerCase().indexOf(q) !== -1)
        push('customer', 'customers.html', customerKey(c), c.name, (c.phone || '') + ' · paid ' + money(c.total || 0));
    });
    (state.suppliers || []).forEach(function (s) {
      if (out.length >= 8) return;
      if ((s.name + ' ' + (s.phone || '') + ' ' + (s.gst || '')).toLowerCase().indexOf(q) !== -1)
        push('supplier', 'suppliers.html', s.id, s.name, (s.phone || '') + ' · ' + money(supplierOutstanding(s)) + ' owed');
    });
    (state.invoices || []).slice(0, 300).forEach(function (i) {
      if (out.length >= 8) return;
      if ((i.id + ' ' + i.customer + ' ' + (i.product || '')).toLowerCase().indexOf(q) !== -1)
        push('invoice', 'history.html', i.id, i.id, i.customer + ' · ' + money(i.total) + ' · ' + i.date);
    });
    (state.purchases || []).slice(0, 200).forEach(function (p) {
      if (out.length >= 8) return;
      if ((p.number + ' ' + p.supplier + ' ' + (p.supplierId || '')).toLowerCase().indexOf(q) !== -1)
        push('purchase', 'purchases.html', p.id, p.number, p.supplier + ' · ' + money(p.total || 0));
    });
    return out;
  }
  function initGlobalSearch() {
    var input = $('#globalSearch'), box = $('#globalResults');
    if (!input || !box) return;
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var items = globalResultsData(input.value);
        box.innerHTML = '';
        if (!input.value.trim()) { box.hidden = true; return; }
        if (!items.length) {
          box.innerHTML = '<div class="gs-empty">No matches for “' + esc(input.value.trim()) + '”.</div>';
        } else {
          items.forEach(function (r) {
            var a = document.createElement('a');
            a.className = 'gs-hit';
            a.href = r.href;
            a.innerHTML = '<span class="q-type">' + r.type.toUpperCase() + '</span><span class="gs-main"><b>' + esc(r.label) + '</b><small>' + esc(r.sub) + '</small></span>';
            a.addEventListener('click', function () { box.hidden = true; input.value = ''; hideQuickMenu(); });
            box.appendChild(a);
          });
        }
        box.hidden = false;
      }, 150);
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.hidden = true; input.blur(); } });
    document.addEventListener('click', function (e) {
      if (e.target !== input && !box.contains(e.target)) box.hidden = true;
      if (e.target !== input && !box.contains(e.target) && e.target.closest && !e.target.closest('.quick-create')) hideQuickMenu();
    });
    input.addEventListener('focus', function () { if (input.value.trim()) box.hidden = false; });
  }
  var lastIntent = null;
  function handleOpenIntent() {
    var h = location.hash;
    if (h.indexOf('#open=') !== 0 || h === lastIntent) return;
    lastIntent = h;
    var payload = decodeURIComponent(h.slice(6));
    var sep = payload.indexOf(':');
    var kind = sep === -1 ? payload : payload.slice(0, sep);
    var id = sep === -1 ? '' : payload.slice(sep + 1);
    var m = {
      product: ['#inventoryRows tr[data-row-id="p-' + id + '"]', 'products.html'],
      customer: ['#customerRows [data-cust="' + id + '"]', 'customers.html'],
      supplier: ['#supplierRows [data-sup="' + id + '"]', 'suppliers.html'],
      invoice: ['#historyRows tr[data-row-id="i-' + id + '"]', 'history.html'],
      purchase: ['#purchaseRows tr[data-row-id="b-' + id + '"]', 'purchases.html']
    };
    if (m[kind]) {
      var el = $(m[kind][0]);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('hit');
        setTimeout(function () { el.classList.remove('hit'); }, 2600);
        if (kind === 'customer' && el.click) el.click();
      }
      return;
    }
    if (kind === 'repick') {
      var src = state.invoices.find(function (x) { return String(x.id) === id; });
      if (!src) { toast('Invoice not found'); return; }
      var resolved = [];
      (src.items && src.items.length ? src.items : [{ name: src.product, qty: src.qty, rate: src.rate }]).forEach(function (line) {
        var prod = line.product_id || line.productId
          ? state.products.find(function (p) { return String(p.id) === String(line.product_id || line.productId); })
          : state.products.find(function (p) { return p.name === line.name; });
        if (!prod) return;
        resolved.push({ productId: prod.id, name: prod.name, qty: Number(line.qty) || 1, rate: Number(line.rate) || Number(prod.price || 0) });
      });
      saleLines = resolved;
      renderSaleItems();
      var tel = $('#phone');
      if (tel && src.phone) tel.value = src.phone;
      var cname = $('#customerName');
      if (cname) cname.value = src.customer || '';
      updatePreview();
      toast(saleLines.length ? 'Copied ' + saleLines.length + ' item(s) from ' + src.id + ' — set qty and bill' : 'No stockable items to copy');
      var form = $('#invoiceForm');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (kind === 'lowstock') {
      var pSearch = $('#productSearch');
      if (pSearch) pSearch.value = '';
      stockFilter = 'low';
      $$('.filter-chip').forEach(function (x) { var on = String(x.dataset.filter || '') === 'low'; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
      renderInventory();
      return;
    }
    if (kind === 'new') {
      if (id === 'product') openProductDialog(null);
      else if (id === 'customer') openCustomerDialog(null);
      else if (id === 'supplier') openSupplierDialog();
      else if (id === 'purchase') openPurchaseDialog();
      else if (id === 'expense') { var f = $('#expenseForm'); if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); var fi = f.querySelector('input,select'); if (fi) fi.focus(); } }
      else if (id === 'sale') gotoView('billing');
    }
  }

/* ============ mobile menu ============ */
  function bindMenu() {
    var sidebar = document.getElementById('sidebar');
    var btn = document.getElementById('menuToggle');
    var backdrop = document.getElementById('menuBackdrop');
    function close() {
      if (!sidebar) return;
      sidebar.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (backdrop) backdrop.classList.remove('show');
      document.body.classList.remove('menu-open');
    }
    if (btn && sidebar) {
      btn.addEventListener('click', function () {
        var open = sidebar.classList.toggle('open');
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (backdrop) backdrop.classList.toggle('show', open);
        document.body.classList.toggle('menu-open', open);
      });
      if (backdrop) backdrop.addEventListener('click', close);
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
      sidebar.addEventListener('click', function (ev) { if (ev.target && ev.target.closest && ev.target.closest('.nav')) close(); });
    }
    close();
    window.addEventListener('resize', function () { if (window.innerWidth > 840) close(); });
  }
  /* ============ boot ============ */
  function boot() {
    var page = currentPage();
    $$('.nav[data-view]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); gotoView(b.dataset.view); }); });
    $$('.goto-billing').forEach(function (b) { b.addEventListener('click', function () { gotoView('billing'); }); });
    $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { gotoView(b.dataset.go); }); });
    $$('.nav[data-view]').forEach(function (b) {
      var on = b.dataset.view === page;
      if (on) { b.classList.add('active'); b.setAttribute('aria-current', 'page'); }
    });
    bindTheme();
    bindMenu();
    bindAuth();
    bindExport();
    initQuickCreate();
    initGlobalSearch();
    setupScan();
    window.addEventListener('hashchange', handleOpenIntent);
    var dashRange = $('#dashRange');
    if (dashRange) {
      dashRange.addEventListener('change', function () {
        var custom = dashRange.value === 'custom';
        var f = $('#dashFrom'), t = $('#dashTo');
        if (f) f.disabled = !custom;
        if (t) t.disabled = !custom;
        renderDashboard();
      });
      ['#dashFrom', '#dashTo'].forEach(function (sel) {
        var el = $(sel);
        if (el) el.addEventListener('change', renderDashboard);
      });
    }
    if (page === 'billing') bindSale();
    if (page === 'inventory') bindInventory();
    if (page === 'suppliers') bindSuppliers();
    if (page === 'customers') bindCustomers();
    if (page === 'purchases') bindPurchases();
    if (page === 'expenses') bindExpenses();
    if (page === 'history') { bindInvoices(); bindReceiptDialog(); }
    if (page === 'reports') bindReports();
    if (page === 'plans') bindPlans();
    if (page === 'settings') bindSettings();
    initAuth();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();