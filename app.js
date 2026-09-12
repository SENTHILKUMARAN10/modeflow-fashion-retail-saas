/* Salesventory v3 — single controller for demo and Supabase-cloud workspaces.
   One store, one renderer, one clear flow. No runtime style injection. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var cloud = window.SDCloud && window.SDCloud.enabled ? window.SDCloud : null;

  /* ============ demo seed (fashion retail workspace) ============ */
  var dayTs = function (n, hour) {
    var d = new Date(); d.setDate(d.getDate() - (n || 0));
    if (hour !== undefined) d.setHours(hour, 12, 0, 0);
    return d.getTime();
  };
  var fmtDay = function (ts) { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };

  var seedProducts = [
    { id: 1, name: 'Kanchipuram Silk Saree', cost: 3600, price: 5999, stock: 14, reorder: 5 },
    { id: 2, name: 'Cotton Handloom Saree', cost: 980, price: 1899, stock: 26, reorder: 8 },
    { id: 3, name: 'Embroidered Kurta Set', cost: 1300, price: 2599, stock: 20, reorder: 6 },
    { id: 4, name: 'A-line Anarkali Dress', cost: 1750, price: 3299, stock: 11, reorder: 4 },
    { id: 5, name: 'Silk Dupatta', cost: 420, price: 899, stock: 34, reorder: 10 },
    { id: 6, name: 'Kada & Jhumka Bridal Set', cost: 700, price: 1499, stock: 17, reorder: 5 },
    { id: 7, name: 'Kolhapuri Chappals', cost: 550, price: 1199, stock: 22, reorder: 6 },
    { id: 8, name: 'Designer Potli Bag', cost: 380, price: 799, stock: 15, reorder: 4 },
    { id: 9, name: 'Styling & Alteration Service', cost: 200, price: 999, stock: 999, reorder: 0 }
  ];
  var seedInvoices = [
    { id: 'SV-2026-0184', customer: 'Priya Raman', phone: '9876543210', product: 'Kanchipuram Silk Saree', productId: 1, qty: 1, rate: 5999, cost: 3600, discount: 500, subtotal: 5999, total: 5499, paymentMethod: 'upi', paymentStatus: 'paid', date: fmtDay(dayTs(0, 11)), ts: dayTs(0, 11) },
    { id: 'SV-2026-0180', customer: 'Nithya S', phone: '9123456780', product: 'Embroidered Kurta Set', productId: 3, qty: 2, rate: 2599, cost: 1300, discount: 298, subtotal: 5198, total: 4900, paymentMethod: 'card', paymentStatus: 'paid', date: fmtDay(dayTs(1, 10)), ts: dayTs(1, 10) },
    { id: 'SV-2026-0176', customer: 'Harini M', phone: '9988776655', product: 'Styling & Alteration Service', productId: 9, qty: 1, rate: 999, cost: 200, discount: 0, subtotal: 999, total: 999, paymentMethod: 'upi', paymentStatus: 'unpaid', date: fmtDay(dayTs(2, 15)), ts: dayTs(2, 15) },
    { id: 'SV-2026-0171', customer: 'Aishwarya K', phone: '9000011111', product: 'Silk Dupatta', productId: 5, qty: 3, rate: 899, cost: 420, discount: 197, subtotal: 2697, total: 2500, paymentMethod: 'cash', paymentStatus: 'paid', date: fmtDay(dayTs(3, 12)), ts: dayTs(3, 12) },
    { id: 'SV-2026-0166', customer: 'Divya R', phone: '9444455555', product: 'Kolhapuri Chappals', productId: 7, qty: 2, rate: 1199, cost: 550, discount: 98, subtotal: 2398, total: 2300, paymentMethod: 'cash', paymentStatus: 'partial', date: fmtDay(dayTs(4, 17)), ts: dayTs(4, 17) }
  ];
  var seedExpenses = [
    { id: 1, category: 'Digital Marketing', amount: 3200, note: 'September campaign', date: fmtDay(dayTs(2, 9)), ts: dayTs(2, 9) },
    { id: 2, category: 'Store & Display', amount: 1450, note: 'New mannequin props', date: fmtDay(dayTs(1, 9)), ts: dayTs(1, 9) }
  ];

  var readStored = function (key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v || fallback; } catch (e) { return fallback; }
  };
  var saveLocal = function () {
    localStorage.setItem('sv_products', JSON.stringify(state.products));
    localStorage.setItem('sv_invoices', JSON.stringify(state.invoices));
    localStorage.setItem('sv_expenses', JSON.stringify(state.expenses));
  };

  var state = {
    mode: 'demo',
    demo: true,
    role: 'owner',
    businessId: null,
    businessName: 'Salesventory Workspace',
    currency: 'INR',
    user: null,
    channel: null,
    products: readStored('sv_products', seedProducts),
    invoices: readStored('sv_invoices', seedInvoices),
    expenses: readStored('sv_expenses', seedExpenses),
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

  /* ============ role capabilities ============ */
  var capabilities = function (role) {
    if (role === 'owner') return { manageProducts: true, deleteSales: true, deleteExpenses: true };
    if (role === 'manager') return { manageProducts: true, deleteSales: false, deleteExpenses: false };
    return { manageProducts: false, deleteSales: false, deleteExpenses: false };
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
    expenses: ['OPERATIONS', 'Business expenses'],
    history: ['TRANSACTIONS', 'Sales history'],
    reports: ['BUSINESS INTELLIGENCE', 'Performance analytics'],
    plans: ['PLANS & BILLING', 'Manage your subscription']
  };
  function gotoView(id) {
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
  function showApp(modeLabel) {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#modeBadge').textContent = modeLabel;
    $('#businessName').textContent = state.businessName;
    $('#storeName').textContent = state.businessName;
    var meta = $('#storeMeta'), roleEl = $('#roleBadge');
    if (meta) meta.textContent = (state.mode === 'cloud' ? 'Business · cloud' : 'Demo · sample data') + ' · ' + (state.currency || 'INR');
    if (roleEl) { roleEl.textContent = state.role; roleEl.hidden = state.mode !== 'cloud'; }
    var initialsText = initials(state.businessName);
    $('#storeAvatar').textContent = initialsText;
    $('#profileBadge').textContent = initialsText;
    renderAll();
    gotoView('dashboard');
  }
  function showLogin() {
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
  }

  /* ============ cloud data mapping ============ */
  function productFromCloud(r) {
    return {
      id: r.id, name: r.name,
      cost: Number(r.cost_price || 0), price: Number(r.selling_price || 0),
      stock: Number(r.track_stock === false ? 999 : (r.stock || 0)),
      reorder: Number(r.reorder_level || 0),
      cloud: true, service: r.track_stock === false
    };
  }
  function invoiceFromCloud(r) {
    var it = (r.invoice_items || [])[0] || {};
    return {
      id: r.invoice_number || 'INV-' + String(r.id).slice(0, 8),
      cloudId: r.id,
      customer: r.customer_name, phone: r.customer_phone || '',
      product: it.product_name || 'Item', productId: it.product_id,
      qty: Number(it.quantity || 1), rate: Number(it.rate || 0), cost: Number(it.cost_price || 0),
      discount: Number(r.discount || 0), subtotal: Number(r.subtotal || 0),
      total: Number(r.total || 0),
      paymentMethod: r.payment_method || 'upi', paymentStatus: r.payment_status || 'paid',
      date: fmtDay(new Date(r.created_at)), ts: new Date(r.created_at).getTime()
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
    state.channel = cloud.realtime.subscribe(id, function () { clearTimeout(state._rt); state._rt = setTimeout(refreshCloudData, 300); });
    toast('Workspace loaded');
    showApp('Cloud workspace');
  }
  async function refreshCloudData() {
    if (!state.businessId || !cloud) return;
    var statusEl = $('#cloudStatus');
    if (statusEl) statusEl.textContent = 'Syncing cloud data…';
    try {
      var results = await Promise.all([
        cloud.products.list(state.businessId),
        cloud.invoices.list(state.businessId),
        cloud.expenses.list(state.businessId)
      ]);
      state.products = results[0].map(productFromCloud);
      state.invoices = results[1].map(invoiceFromCloud);
      state.expenses = results[2].map(expenseFromCloud);
      var el = $('#cloudStatus');
      if (el && !$('#app').classList.contains('hidden')) el.textContent = '';
      renderAll();
    } catch (e) {
      var err = $('#cloudStatus');
      if (err) err.textContent = 'Cloud sync failed. Refresh to retry.';
    }
  }

  /* ============ auth ============ */
  function initAuth() {
    if (!cloud) {
      var s = $('#cloudStatus');
      if (s) s.textContent = (window.SDCloud && window.SDCloud.reason) || 'Cloud login is not configured.';
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
        var el = $('#cloudStatus');
        if (el) el.textContent = 'Secure cloud workspace ready.';
      }
    });
  }
  function bindAuth() {
    var cloudAuthPending = false;
    $('#demoLogin').addEventListener('click', function () {
      cloudWorkspaceLoading = false;
      if (state.channel) { cloud.realtime.unsubscribe(state.channel); state.channel = null; }
      state.mode = 'demo'; state.demo = true; state.role = 'owner';
      state.businessId = null;
      state.products = readStored('sv_products', seedProducts);
      state.invoices = readStored('sv_invoices', seedInvoices);
      state.expenses = readStored('sv_expenses', seedExpenses);
      state.businessName = 'Salesventory Workspace';
      state.currency = 'INR';
      showApp('Demo workspace');
    });
    $('#logout').addEventListener('click', async function () {
      if (cloud) { try { await cloud.auth.signOut(); } catch (e) {} }
      if (state.channel) { cloud.realtime.unsubscribe(state.channel); state.channel = null; }
      showLogin();
    });
    $('#cloudLogin').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (cloudAuthPending) return;
      if (!cloud) { toast('Cloud connection is unavailable'); return; }
      cloudAuthPending = true;
      try {
        var email = $('#loginEmail').value.trim();
        var password = $('#loginPassword').value;
        if (!email || !password) { toast('Enter your email and password'); return; }
        var res = await cloud.auth.signIn(email, password);
        if (res.error) throw res.error;
        await loadCloudWorkspace();
      } catch (err) { toast(friendly(err)); }
      finally { cloudAuthPending = false; }
    });
  }
  function friendly(err) {
    var m = String((err && err.message) || err || '');
    if (/invalid login credentials/i.test(m)) return 'Email or password is incorrect.';
    if (/network|failed to fetch|load failed/i.test(m)) return 'Network unavailable. Check your connection and try again.';
    if (m.length > 90) return 'The operation could not be completed. Please try again.';
    return m;
  }

  /* ============ sale form ============ */
  function productOptions() {
    var s = $('#product'); if (!s) return;
    var current = s.value;
    s.innerHTML = state.products.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + ' · ' + money(p.price) + '</option>';
    }).join('');
    if (current && state.products.some(function (p) { return String(p.id) === current; })) s.value = current;
    syncRate();
  }
  function selectedProduct() { return state.products.find(function (p) { return String(p.id) === String($('#product').value); }) || state.products[0]; }
  function syncRate() { var p = selectedProduct(); if (p && $('#rate')) $('#rate').value = p.price; updatePreview(); }
  function calcTotal() {
    var qty = Number($('#qty').value) || 0;
    var rate = Number($('#rate').value) || 0;
    var disc = Math.max(0, Number($('#discount').value) || 0);
    var subtotal = qty * rate;
    return { subtotal: subtotal, discount: Math.min(disc, subtotal), total: Math.max(0, subtotal - Math.min(disc, subtotal)) };
  }
  function updatePreview() {
    if (!$('#preview') || !$('#previewTotal')) return;
    var p = selectedProduct() || { name: 'Business item' };
    var qty = Number($('#qty').value) || 0;
    var t = calcTotal();
    $('#previewTotal').textContent = money(t.total);
    var name = $('#customerName').value.trim();
    $('#preview').innerHTML =
      '<div class="bill-head"><div><b>' + esc(state.businessName) + '</b><div class="muted">Business workspace</div></div>' +
      '<div class="text-right"><b>RECEIPT</b><div class="muted">Powered by Salesventory</div></div></div>' +
      '<p><b>Customer</b><br>' + esc(name || 'Walk-in customer') + '</p>' +
      '<p class="muted">' + esc($('#phone').value.trim() || 'No mobile number') + '</p>' +
      '<div class="line-item"><span>' + esc(p.name) + ' × ' + qty + '</span><b>' + money(qty * (Number($('#rate').value) || 0)) + '</b></div>' +
      '<div class="line-item"><span>Discount</span><span>− ' + money(t.discount) + '</span></div>' +
      '<div class="line-item"><span>Payment</span><span>' + esc(($('#paymentMethod').value || 'upi').toUpperCase()) + ' · ' + esc($('#paymentStatus').value || 'paid') + '</span></div>' +
      '<div class="bill-total"><span>Total</span><span>' + money(t.total) + '</span></div>' +
      '<p class="muted" style="font-size:11px;padding-bottom:20px">Thank you for your business.</p>';
  }
  function bindSale() {
    var q = function (s) { return $(s); };
    if (q('#product')) q('#product').addEventListener('change', syncRate);
    ['#qty', '#rate', '#discount', '#customerName', '#phone', '#paymentMethod', '#paymentStatus'].forEach(function (id) {
      var el = q(id); if (el) el.addEventListener('input', updatePreview);
    });
    $('#invoiceForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var p = selectedProduct();
      var qty = Number($('#qty').value);
      if (!p) { toast('Add at least one product first'); return; }
      if (qty <= 0) { toast('Enter a valid quantity'); return; }
      if (!isService(p) && !state.demo && !cloud) { toast('Cloud checkout is not available'); return; }
      if (!isService(p) && qty > p.stock) { toast('Not enough stock for this sale'); return; }
      var rate = Number($('#rate').value || p.price);
      if (rate < 0) { toast('Enter a valid selling price'); return; }
      var discount = Math.max(0, Number($('#discount').value) || 0);
      if (discount > qty * rate) { toast('Discount cannot exceed the subtotal'); return; }
      var done = function () {
        e.target.reset();
        $('#qty').value = 1; $('#discount').value = 0;
        productOptions(); renderAll();
        toast('Sale completed successfully');
        gotoView('history');
      };
      if (state.demo) {
        var t = calcTotal();
        state.invoices.unshift({
          id: 'SV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4),
          customer: $('#customerName').value.trim() || 'Walk-in customer',
          phone: $('#phone').value.trim(), product: p.name, productId: p.id, qty: qty,
          rate: rate, cost: Number(p.cost || 0), discount: discount, subtotal: qty * rate, total: t.total,
          paymentMethod: $('#paymentMethod').value, paymentStatus: $('#paymentStatus').value,
          date: fmtDay(Date.now()), ts: Date.now()
        });
        if (!isService(p)) p.stock = Math.max(0, Number(p.stock) - qty);
        saveLocal();
        done();
      } else {
        var submit = $('#invoiceForm').querySelector('button[type=submit]');
        if (submit) submit.disabled = true;
        try {
          await cloud.invoices.checkout({
            p_business_id: state.businessId,
            p_product_id: p.id,
            p_customer_name: $('#customerName').value.trim() || 'Walk-in customer',
            p_customer_phone: $('#phone').value.trim(),
            p_quantity: qty, p_rate: rate, p_discount: discount,
            p_payment_method: $('#paymentMethod').value, p_payment_status: $('#paymentStatus').value,
            p_idempotency_key: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : null
          });
          await refreshCloudData();
          done();
        } catch (err) { toast(friendly(err)); }
        finally { if (submit) submit.disabled = false; }
      }
    });
  }

  /* ============ inventory ============ */
  var stockFilter = 'all';
  function renderInventory() {
    var rows = $('#inventoryRows'); if (!rows) return;
    var q = ($('#productSearch').value || '').toLowerCase();
    var list = state.products
      .filter(function (p) { return p.name.toLowerCase().indexOf(q) !== -1; })
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
      return '<tr>' +
        '<td data-label="Product"><div><b>' + esc(p.name) + '</b><div class="muted sku-tag">SKU SV-' + String(p.id).padStart(4, '0') + '</div></div></td>' +
        '<td data-label="Cost">' + money(p.cost || 0) + '</td>' +
        '<td data-label="Selling"><b>' + money(p.price) + '</b></td>' +
        '<td data-label="Stock">' + (isService(p) ? 'Service' : p.stock + ' units') + '</td>' +
        '<td data-label="Reorder">' + (isService(p) ? '—' : p.reorder + ' units') + '</td>' +
        '<td data-label="Status"><span class="status' + (low ? ' low' : '') + '">' + (isService(p) ? 'Active' : (low ? 'Low stock' : 'In stock')) + '</span></td>' +
        '<td data-label="Actions">' + actions + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="7" class="empty-cell">No matching products.</td></tr>';
    var addBtn = $('#addProduct');
    if (addBtn) addBtn.hidden = !canManage;
  }
  function openProductDialog(id) {
    if (!id) {
      $('#productForm').reset();
      $('#pId').value = '';
      $('#pStock').value = 1; $('#pReorder').value = 5;
      $('#pStock').disabled = false; $('#pReorder').disabled = false;
      $('#pService').checked = false;
      $('#productDialogTitle').textContent = 'Add product';
    } else {
      var p = state.products.find(function (x) { return String(x.id) === String(id); });
      if (!p) return;
      $('#productDialogTitle').textContent = 'Edit product';
      $('#pId').value = p.id;
      $('#pName').value = p.name;
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
    if ($('#productSearch')) $('#productSearch').addEventListener('input', renderInventory);
    $$('.filter-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        stockFilter = c.dataset.filter || 'all';
        $$('.filter-chip').forEach(function (x) { var on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
        renderInventory();
      });
    });
    $('#addProduct').addEventListener('click', function () { openProductDialog(null); });
    $('#cancelProduct').addEventListener('click', function () { $('#productDialog').close(); });
    $('#productForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var id = $('#pId').value;
      var svc = $('#pService').checked;
      var data = {
        name: $('#pName').value.trim(),
        cost: Number($('#pCost').value),
        price: Number($('#pPrice').value),
        stock: svc ? 999 : Number($('#pStock').value),
        reorder: svc ? 0 : Number($('#pReorder').value),
        service: svc
      };
      if (!data.name) { toast('Enter a product or service name'); return; }
      if (data.price < 0 || data.cost < 0) { toast('Enter valid price values'); return; }
      if (state.demo) {
        if (id) Object.assign(state.products.find(function (p) { return String(p.id) === id; }), data);
        else state.products.push({ id: Date.now(), ...data });
        saveLocal();
        $('#productDialog').close();
        renderAll();
        toast(id ? 'Product updated' : 'Product added');
      } else {
        try {
          if (id) await cloud.products.update(id, data);
          else await cloud.products.create(state.businessId, data);
          $('#productDialog').close();
          await refreshCloudData();
          toast(id ? 'Product updated' : 'Product added');
        } catch (err) { toast(friendly(err)); }
      }
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
      if (state.demo) {
        state.products = state.products.filter(function (x) { return String(x.id) !== String(id); });
        saveLocal(); renderAll(); toast('Product deleted');
      } else {
        try { await cloud.products.remove(id); await refreshCloudData(); toast('Product deleted'); }
        catch (err) { toast(friendly(err)); }
      }
    }
  }

  /* ============ customers ============ */
  function customers() {
    var map = {};
    state.invoices.forEach(function (i) {
      var key = (i.phone || i.customer || '').toLowerCase();
      if (!map[key]) map[key] = { name: i.customer, phone: i.phone, orders: 0, total: 0, last: i.date, ts: i.ts || 0 };
      map[key].orders++;
      map[key].total += i.total;
      if ((i.ts || 0) >= map[key].ts) { map[key].last = i.date; map[key].ts = i.ts || 0; }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function renderCustomers() {
    var rows = $('#customerRows'); if (!rows) return;
    var q = ($('#customerSearch').value || '').toLowerCase();
    var list = customers().filter(function (c) { return (c.name + ' ' + c.phone).toLowerCase().indexOf(q) !== -1; });
    rows.innerHTML = list.map(function (c) {
      return '<tr>' +
        '<td data-label="Customer"><div class="cell-person"><span class="store-avatar">' + esc(initials(c.name)) + '</span><b>' + esc(c.name) + '</b></div></td>' +
        '<td data-label="Phone">' + esc(c.phone || '—') + '</td>' +
        '<td data-label="Transactions">' + c.orders + '</td>' +
        '<td data-label="Lifetime value"><b>' + money(c.total) + '</b></td>' +
        '<td data-label="Last purchase">' + esc(c.last || '—') + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="5" class="empty-cell">No matching customers. Customers appear once a sale is recorded.</td></tr>';
  }

  /* ============ expenses ============ */
  function renderExpenses() {
    var list = $('#expenseList'); if (!list) return;
    var total = state.expenses.reduce(function (a, b) { return a + b.amount; }, 0);
    if ($('#expenseTotal')) $('#expenseTotal').textContent = money(total);
    var canDelete = caps().deleteExpenses;
    list.innerHTML = state.expenses.map(function (x) {
      var del = canDelete ? '<button class="action-btn danger" data-act="delete-expense" data-id="' + x.id + '" aria-label="Delete expense">×</button>' : '';
      return '<div class="expense-item"><div><b>' + esc(x.category) + '</b><small>' + esc(x.note || x.date) + '</small></div>' +
        '<div><b>' + money(x.amount) + '</b> ' + del + '</div></div>';
    }).join('') || '<p class="muted" style="padding:16px 4px">No expenses recorded.</p>';
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
      if (state.demo) {
        state.expenses.unshift({ id: Date.now(), ...data, date: fmtDay(Date.now()), ts: Date.now() });
        saveLocal(); e.target.reset(); renderAll(); toast('Expense added');
      } else {
        try {
          await cloud.expenses.create(state.businessId, state.user ? state.user.id : null, data);
          await refreshCloudData(); e.target.reset(); toast('Expense added');
        } catch (err) { toast(friendly(err)); }
      }
    });
    $('#expenseList').addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-act="delete-expense"]');
      if (!btn) return;
      var ok = await confirmDialog('Delete expense?', 'This expense record will be removed. This cannot be undone.');
      if (!ok) return;
      var id = btn.dataset.id;
      if (state.demo) {
        state.expenses = state.expenses.filter(function (x) { return String(x.id) !== String(id); });
        saveLocal(); renderAll(); toast('Expense deleted');
      } else {
        try { await cloud.expenses.remove(id); await refreshCloudData(); toast('Expense deleted'); }
        catch (err) { toast(friendly(err)); }
      }
    });
  }

  /* ============ invoices / history ============ */
  function invoicePayment(i) {
    var c = i.paymentStatus === 'unpaid' ? ' low' : (i.paymentStatus === 'partial' ? ' warn' : '');
    return '<span class="status' + c + '">' + esc(i.paymentStatus || 'paid') + '</span>';
  }
  function invoiceRow(i, compact) {
    if (compact) {
      return '<tr>' +
        '<td data-label="Transaction"><b>' + esc(i.id) + '</b></td>' +
        '<td data-label="Customer">' + esc(i.customer) + '</td>' +
        '<td data-label="Item">' + esc(i.product) + '</td>' +
        '<td data-label="Amount"><b>' + money(i.total) + '</b></td>' +
        '<td data-label="Status">' + invoicePayment(i) + '</td>' +
        '<td data-label="Date">' + esc(i.date) + '</td>' +
        '</tr>';
    }
    var canDelete = caps().deleteSales;
    var del = canDelete ? '<button class="action-btn danger" data-act="delete-invoice" data-id="' + esc(i.id) + '">Delete</button>' : '';
    return '<tr>' +
      '<td data-label="Transaction"><b>' + esc(i.id) + '</b></td>' +
      '<td data-label="Customer">' + esc(i.customer) + '</td>' +
      '<td data-label="Item">' + esc(i.product) + ' × ' + i.qty + '</td>' +
      '<td data-label="Amount"><b>' + money(i.total) + '</b></td>' +
      '<td data-label="Payment">' + invoicePayment(i) + '</td>' +
      '<td data-label="Date">' + esc(i.date) + '</td>' +
      '<td data-label="Actions"><button class="action-btn" data-act="print-invoice" data-id="' + esc(i.id) + '">Print</button><button class="action-btn" data-act="share-invoice" data-id="' + esc(i.id) + '">WhatsApp</button>' + del + '</td>' +
      '</tr>';
  }
  function renderInvoices() {
    var q = ($('#invoiceSearch').value || '').toLowerCase();
    var filtered = state.invoices.filter(function (i) { return (i.id + ' ' + i.customer + ' ' + i.phone).toLowerCase().indexOf(q) !== -1; });
    if ($('#historyRows')) $('#historyRows').innerHTML = filtered.map(function (i) { return invoiceRow(i, false); }).join('') || '<tr><td colspan="7" class="empty-cell">No matching transactions.</td></tr>';
    if ($('#recent')) $('#recent').innerHTML = state.invoices.slice(0, 5).map(function (i) { return invoiceRow(i, true); }).join('') || '<tr><td colspan="6" class="empty-cell">No transactions yet.</td></tr>';
  }
  function findInvoice(id) { return state.invoices.find(function (x) { return x.id === id; }); }
  function bindInvoices() {
    if ($('#invoiceSearch')) $('#invoiceSearch').addEventListener('input', renderInvoices);
    $('#historyRows').addEventListener('click', onInvoiceAction);
  }
  async function onInvoiceAction(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var i = findInvoice(btn.dataset.id);
    if (!i) return;
    if (btn.dataset.act === 'print-invoice') { printInvoice(i); return; }
    if (btn.dataset.act === 'share-invoice') { shareInvoice(i); return; }
    if (btn.dataset.act === 'delete-invoice') {
      var ok = await confirmDialog('Delete transaction?', 'The transaction ' + i.id + ' will be removed and stock will be restored.');
      if (!ok) return;
      if (state.demo) {
        var p = state.products.find(function (x) { return String(x.id) === String(i.productId); });
        if (p && !isService(p)) p.stock = Number(p.stock) + Number(i.qty);
        state.invoices = state.invoices.filter(function (x) { return x.id !== i.id; });
        saveLocal(); renderAll(); toast('Transaction deleted');
      } else {
        try { await cloud.invoices.remove(i.cloudId || i.id); await refreshCloudData(); toast('Transaction deleted'); }
        catch (err) { toast(friendly(err)); }
      }
    }
  }
  function printInvoice(i) {
    var w = window.open('', '_blank', 'width=720,height=900');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print invoices.'); return; }
    var sym = symbol();
    w.document.write('<!doctype html><html><head><title>' + esc(i.id) + '</title><style>' +
      'body{font-family:' + "'Plus Jakarta Sans'" + ',Arial,sans-serif;padding:42px;color:#171713;max-width:640px;margin:auto}' +
      '.top{display:flex;justify-content:space-between;border-bottom:2px solid #171713;padding-bottom:18px}' +
      '.row{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #ddd}' +
      '.total{font-size:24px;font-weight:700}.muted{color:#777}' +
      '</style></head><body>' +
      '<div class="top"><div><h2>' + esc(state.businessName) + '</h2><div class="muted">Powered by Salesventory</div></div><div><b>' + esc(i.id) + '</b><div>' + esc(i.date) + '</div></div></div>' +
      '<p><b>Customer:</b> ' + esc(i.customer) + '</p><p><b>Phone:</b> ' + esc(i.phone || '—') + '</p>' +
      '<div class="row"><span>' + esc(i.product) + ' × ' + i.qty + '</span><b>' + sym + Number(i.subtotal || i.qty * i.rate).toLocaleString('en-IN') + '</b></div>' +
      '<div class="row"><span>Discount</span><span>− ' + sym + Number(i.discount || 0).toLocaleString('en-IN') + '</span></div>' +
      '<div class="row total"><span>Total</span><span>' + sym + Number(i.total).toLocaleString('en-IN') + '</span></div>' +
      '<p>Payment: ' + String(i.paymentMethod || 'upi').toUpperCase() + ' · ' + esc(i.paymentStatus || 'paid') + '</p>' +
      '<p class="muted">Thank you for your business.</p>' +
      '<script>print()<\/script></body></html>');
    w.document.close();
  }
  function shareInvoice(i) {
    var text = String(state.businessName).toUpperCase() + '\nTransaction: ' + i.id + '\nCustomer: ' + i.customer + '\n' + i.product + ' × ' + i.qty + '\nTotal: ' + symbol() + i.total + '\nPayment: ' + String(i.paymentMethod || 'upi').toUpperCase() + ' (' + (i.paymentStatus || 'paid') + ')\nDate: ' + i.date + '\nThank you for your business!';
    var phone = String(i.phone || '').replace(/\D/g, '');
    var target = phone.length === 10 ? '91' + phone : phone;
    window.open('https://wa.me/' + target + '?text=' + encodeURIComponent(text), '_blank');
  }

  /* ============ dashboard ============ */
  function renderDashboard() {
    var revenue = state.invoices.reduce(function (a, b) { return a + b.total; }, 0);
    var expenses = state.expenses.reduce(function (a, b) { return a + b.amount; }, 0);
    var cogs = state.invoices.reduce(function (a, b) { return a + (Number(b.cost || 0) * Number(b.qty || 0)); }, 0);
    if ($('#revenue')) $('#revenue').textContent = money(revenue);
    if ($('#profit')) $('#profit').textContent = money(revenue - cogs - expenses);
    if ($('#invoiceCount')) $('#invoiceCount').textContent = state.invoices.length;
    if ($('#lowStock')) $('#lowStock').textContent = state.products.filter(function (p) { return !isService(p) && p.stock <= p.reorder; }).length;

    /* KPI strip */
    var todayInvoices = state.invoices.filter(function (i) { return isSameDay(i.ts); });
    var todayRevenue = todayInvoices.reduce(function (a, b) { return a + b.total; }, 0);
    var todayCogs = todayInvoices.reduce(function (a, b) { return a + (Number(b.cost || 0) * Number(b.qty || 0)); }, 0);
    if ($('#kpiToday')) $('#kpiToday').textContent = money(todayRevenue);
    if ($('#kpiTodayMeta')) $('#kpiTodayMeta').textContent = todayInvoices.length ? todayInvoices.length + (todayInvoices.length === 1 ? ' sale today' : ' sales today') : 'No sales recorded yet';
    var perProduct = {};
    state.invoices.forEach(function (i) {
      if (!perProduct[i.product]) perProduct[i.product] = { qty: 0, revenue: 0 };
      perProduct[i.product].qty += Number(i.qty); perProduct[i.product].revenue += Number(i.total);
    });
    var ranked = Object.keys(perProduct)
      .map(function (k) { return { name: k, qty: perProduct[k].qty, revenue: perProduct[k].revenue }; })
      .sort(function (a, b) { return (b.qty - a.qty) || (b.revenue - a.revenue); });
    var best = ranked[0];
    if ($('#kpiBest')) $('#kpiBest').textContent = best ? best.name : '—';
    if ($('#kpiBestMeta')) $('#kpiBestMeta').textContent = best ? best.qty + ' units · ' + money(best.revenue) : 'No sales data yet';
    var pending = state.invoices.reduce(function (a, b) { return a + (b.paymentStatus !== 'paid' ? b.total : 0); }, 0);
    if ($('#kpiPending')) $('#kpiPending').textContent = money(pending);
    if ($('#kpiPendingMeta')) {
      var pendCount = state.invoices.filter(function (i) { return i.paymentStatus !== 'paid'; }).length;
      $('#kpiPendingMeta').textContent = pendCount ? pendCount + ' invoice(s) with outstanding balance' : 'No outstanding amounts';
    }
    var monthInvoices = state.invoices.filter(function (i) { return isSameMonth(i.ts); });
    var monthCogs = monthInvoices.reduce(function (a, b) { return a + (Number(b.cost || 0) * Number(b.qty || 0)); }, 0);
    var monthExpenses = state.expenses.filter(function (x) { return isSameMonth(x.ts); }).reduce(function (a, b) { return a + b.amount; }, 0);
    if ($('#kpiPnL')) $('#kpiPnL').textContent = money(monthInvoices.reduce(function (a, b) { return a + b.total; }, 0) - monthCogs - monthExpenses);
    if ($('#kpiPnLMeta')) $('#kpiPnLMeta').textContent = 'Sales minus cost & expenses this month';

    /* stock alerts */
    if ($('#alerts')) {
      var alerts = state.products.filter(function (p) { return !isService(p); }).slice()
        .sort(function (a, b) { return (a.stock / Math.max(a.reorder, 1)) - (b.stock / Math.max(b.reorder, 1)); })
        .slice(0, 5)
        .map(function (p) {
          var low = p.stock <= p.reorder;
          return '<div class="alert"><div><b>' + esc(p.name) + '</b><div class="muted">' + p.stock + ' units available · reorder at ' + p.reorder + '</div></div>' +
            '<span class="status' + (low ? ' low' : '') + '">' + (low ? 'Restock' : 'Healthy') + '</span></div>';
        }).join('');
      $('#alerts').innerHTML = alerts || '<p class="muted" style="color:rgba(255,255,255,.8);padding:4px 0">No inventory alerts. Everything looks healthy.</p>';
    }

    /* revenue chart */
    var range = Number($('#rangeSel').value || 7);
    var now = new Date();
    var cutoff = range >= 30 ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : Date.now() - range * 864e5;
    var daily = {};
    state.invoices.forEach(function (i) {
      if (i.ts && i.ts < cutoff) return;
      var key = new Date(i.ts).toISOString().slice(0, 10);
      daily[key] = (daily[key] || 0) + i.total;
    });
    var keys = Object.keys(daily).sort();
    var vals = keys.slice(-Math.min(range, keys.length)).map(function (k) { return [k, daily[k]]; });
    var max = Math.max.apply(Math, vals.map(function (v) { return v[1]; }).concat([1]));
    if ($('#bars')) {
      $('#bars').innerHTML = vals.length
        ? vals.map(function (v) {
            var label = v[0].slice(5);
            return '<div class="bar-wrap"><div class="bar" style="height:' + Math.max(12, (v[1] / max) * 150) + 'px" title="' + money(v[1]) + '"></div><span>' + esc(label) + '</span></div>';
          }).join('')
        : '<p class="muted" style="padding:28px 22px">Sales chart appears once transactions are created.</p>';
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
  }

  /* ============ export ============ */
  function bindExport() {
    $('#exportData').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({
        product: 'Salesventory', exportedAt: new Date().toISOString(),
        mode: state.mode, businessId: state.businessId, role: state.role,
        products: state.products, invoices: state.invoices, expenses: state.expenses
      }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'salesventory-business-backup.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
      toast('Business data exported');
    });
    if ($('#rangeSel')) $('#rangeSel').addEventListener('change', renderDashboard);
  }

  /* ============ plans & billing ============ */
  var PLANS = { INR: { monthly: { amount: 399, label: '₹399' }, annual: { amount: 3990, label: '₹3,990' } }, USD: { monthly: { amount: 4.99, label: '$4.99' }, annual: { amount: 49.99, label: '$49.99' } } };
  var billingState = { interval: 'monthly', currency: 'INR', config: null, ready: false, loading: false };
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
    if (!billingState.ready) { loadBillingStatus(); return; }

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
    var cardEl = $('#planStatusCard');
    try {
      billingState.config = await billingStatus();
      billingState.ready = true;
    } catch (err) {
      billingState.ready = false;
      if (cardEl) cardEl.hidden = true;
      var note = $('#planCtaNote');
      if (note) note.textContent = friendly(err);
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
  function renderAll() {
    productOptions(); renderInventory(); renderCustomers(); renderExpenses();
    renderInvoices(); renderDashboard(); renderReports();
    renderPlans(); updatePreview();
  }

  /* ============ boot ============ */
  function boot() {
    $$('.nav[data-view]').forEach(function (b) { b.addEventListener('click', function () { gotoView(b.dataset.view); }); });
    $$('.goto-billing').forEach(function (b) { b.addEventListener('click', function () { gotoView('billing'); }); });
    $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { gotoView(b.dataset.go); }); });
    bindTheme();
    bindAuth(); bindSale(); bindInventory(); bindExpenses(); bindInvoices(); bindExport(); bindPlans();
    initAuth();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();