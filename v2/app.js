/* SalesDesk v2 — single controller for demo and Supabase-cloud workspaces. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const cloud = window.SDCloud && window.SDCloud.enabled ? window.SDCloud : null;

  const seedProducts = [
    { id: 1, name: 'Wireless Keyboard', cost: 850, price: 1499, stock: 24, reorder: 8 },
    { id: 2, name: 'Premium Office Chair', cost: 4200, price: 6999, stock: 12, reorder: 4 },
    { id: 3, name: 'Business Consultation', cost: 0, price: 2499, stock: 999, reorder: 0 },
    { id: 4, name: 'Stainless Water Bottle', cost: 320, price: 699, stock: 18, reorder: 6 },
    { id: 5, name: 'LED Desk Lamp', cost: 610, price: 1199, stock: 7, reorder: 5 },
    { id: 6, name: 'Delivery & Setup Service', cost: 150, price: 499, stock: 999, reorder: 0 }
  ];
  const seedInvoices = [
    { id: 'VL-2026-1842', customer: 'Priya Raman', phone: '9876543210', product: 'Premium Office Chair', productId: 2, qty: 1, rate: 6999, cost: 4200, discount: 500, subtotal: 6999, total: 6499, paymentMethod: 'upi', paymentStatus: 'paid', date: '05 Sep 2026', ts: 1788591000000 },
    { id: 'VL-2026-1798', customer: 'Nithya S', phone: '9123456780', product: 'Wireless Keyboard', productId: 1, qty: 2, rate: 1499, cost: 850, discount: 198, subtotal: 2998, total: 2800, paymentMethod: 'card', paymentStatus: 'paid', date: '05 Sep 2026', ts: 1788587400000 },
    { id: 'VL-2026-1712', customer: 'Harini M', phone: '9988776655', product: 'Business Consultation', productId: 3, qty: 1, rate: 2499, cost: 0, discount: 0, subtotal: 2499, total: 2499, paymentMethod: 'upi', paymentStatus: 'paid', date: '04 Sep 2026', ts: 1788502200000 },
    { id: 'VL-2026-1660', customer: 'Aishwarya K', phone: '9000011111', product: 'Stainless Water Bottle', productId: 4, qty: 3, rate: 699, cost: 320, discount: 97, subtotal: 2097, total: 2000, paymentMethod: 'cash', paymentStatus: 'paid', date: '03 Sep 2026', ts: 1788415800000 },
    { id: 'VL-2026-1594', customer: 'Divya R', phone: '9444455555', product: 'LED Desk Lamp', productId: 5, qty: 2, rate: 1199, cost: 610, discount: 98, subtotal: 2398, total: 2300, paymentMethod: 'upi', paymentStatus: 'paid', date: '02 Sep 2026', ts: 1788329400000 }
  ];
  const seedExpenses = [
    { id: 1, category: 'Digital Marketing', amount: 3200, note: 'September campaign', date: '04 Sep 2026', ts: 1788500000000 },
    { id: 2, category: 'Office Supplies', amount: 1450, note: 'Operational supplies', date: '02 Sep 2026', ts: 1788320000000 }
  ];

  const readStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } };
  const saveLocal = () => {
    localStorage.setItem('velora_products', JSON.stringify(state.products));
    localStorage.setItem('velora_invoices', JSON.stringify(state.invoices));
    localStorage.setItem('velora_expenses', JSON.stringify(state.expenses));
  };

  const state = {
    mode: 'demo',
    businessId: null,
    businessName: 'SalesDesk Workspace',
    currency: 'INR',
    user: null,
    channel: null,
    demo: true,
    products: readStored('velora_products', seedProducts),
    invoices: readStored('velora_invoices', seedInvoices),
    expenses: readStored('velora_expenses', seedExpenses)
  };

  const symbol = () => ({ INR: '₹', USD: '$', GBP: '£', AED: 'د.إ', SGD: 'S$' }[state.currency] || '₹');
  const money = n => symbol() + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const todayStr = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtDate = iso => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const greeting = () => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'; };
  const isService = p => Number(p.stock) >= 900;

  /* ---------- toast, routing ---------- */
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 1900);
  }
  function greetingText() { return greeting() + '.'; }
  const titles = {
    dashboard: ['BUSINESS OVERVIEW', null],
    billing: ['SALES', 'Create a new sale'],
    inventory: ['CATALOGUE', 'Products & inventory'],
    customers: ['CUSTOMERS', 'Customer relationships'],
    expenses: ['OPERATIONS', 'Business expenses'],
    history: ['TRANSACTIONS', 'Sales history'],
    reports: ['BUSINESS INTELLIGENCE', 'Performance analytics']
  };
  function gotoView(id) {
    $$('.view').forEach(v => v.classList.toggle('active-view', v.id === id));
    $$('.nav[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === id));
    const t = titles[id];
    if (t) {
      if ($('#eyebrow')) $('#eyebrow').textContent = t[0];
      const el = $('#title');
      if (el) {
        if (t[1] === null) { if (!/^Good (morning|afternoon|evening)/i.test(el.textContent)) el.textContent = greetingText(); }
        else el.textContent = t[1];
      }
    }
    if (innerWidth < 900) scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showApp(modeLabel) {
    $('#login')?.classList.add('hidden');
    $('#app')?.classList.remove('hidden');
    if ($('#modeBadge')) $('#modeBadge').textContent = modeLabel;
    if ($('#businessName')) $('#businessName').textContent = state.businessName;
    renderAll();
    gotoView('dashboard');
  }
  function showLogin() {
    $('#app')?.classList.add('hidden');
    $('#login')?.classList.remove('hidden');
  }

  /* ---------- data mapping (cloud -> demo shape) ---------- */
  function productFromCloud(r) {
    return {
      id: r.id, name: r.name,
      cost: Number(r.cost_price || 0), price: Number(r.selling_price || 0),
      stock: Number(r.track_stock === false ? 999 : (r.stock ?? 0)),
      reorder: Number(r.reorder_level || 0),
      cloud: true
    };
  }
  function invoiceFromCloud(r) {
    const it = (r.invoice_items || [])[0] || {};
    return {
      id: r.invoice_number || 'INV-' + String(r.id).slice(0, 8),
      cloudId: r.id,
      customer: r.customer_name, phone: r.customer_phone || '',
      product: it.product_name || 'Item', productId: it.product_id,
      qty: Number(it.quantity || 1), rate: Number(it.rate || 0), cost: Number(it.cost_price || 0),
      discount: Number(r.discount || 0), subtotal: Number(r.subtotal || 0),
      total: Number(r.total || 0),
      paymentMethod: r.payment_method || 'upi', paymentStatus: r.payment_status || 'paid',
      date: fmtDate(r.created_at), ts: new Date(r.created_at).getTime()
    };
  }
  function expenseFromCloud(r) {
    return {
      id: r.id, category: r.category, amount: Number(r.amount || 0), note: r.note || '',
      date: fmtDate(r.expense_date || r.created_at), ts: new Date(r.expense_date || r.created_at).getTime(),
      cloud: true
    };
  }

  /* ---------- cloud workspace loading ---------- */
  async function loadCloudWorkspace() {
    const { data: { session } } = await cloud.auth.session();
    if (!session) return;
    const { data: { user } } = await cloud.auth.user();
    state.user = user;
    let members = [];
    try { members = await cloud.businesses.list(); } catch (e) { toast('Could not load businesses'); return; }
    const owned = members
      .filter(m => m.businesses)
      .map(m => ({ id: m.businesses.id, name: m.businesses.name, role: m.role, currency: m.businesses.currency, slug: m.businesses.slug }));
    if (!owned.length) {
      try {
        await cloud.client.rpc('create_business_with_owner', { p_name: 'My SalesDesk Workspace', p_slug: null, p_phone: null, p_address: null });
        members = await cloud.businesses.list();
        owned.push(...members.filter(m => m.businesses).map(m => ({ id: m.businesses.id, name: m.businesses.name, role: m.role, currency: m.businesses.currency })));
      } catch { toast('Could not create a workspace'); return; }
    }
    const saved = localStorage.getItem('salesdesk-v2-business');
    const pick = owned.find(b => b.id === saved) || owned[0];
    await activateBusiness(pick.id, pick.name, pick.currency);
  }
  async function activateBusiness(id, name, currency) {
    localStorage.setItem('salesdesk-v2-business', id);
    state.mode = 'cloud';
    state.demo = false;
    state.businessId = id;
    state.businessName = name;
    state.currency = currency || 'INR';
    if (state.channel) { cloud.realtime.unsubscribe(state.channel); state.channel = null; }
    await refreshCloudData();
    state.channel = cloud.realtime.subscribe(id, () => { clearTimeout(state._rt); state._rt = setTimeout(refreshCloudData, 300); });
    toast('Business loaded');
    showApp('Cloud workspace');
  }
  async function refreshCloudData() {
    if (!state.businessId) return;
    if ($('#cloudStatus')) $('#cloudStatus').textContent = 'Syncing cloud data…';
    try {
      const [prods, invs, exps] = await Promise.all([
        cloud.products.list(state.businessId),
        cloud.invoices.list(state.businessId),
        cloud.expenses.list(state.businessId)
      ]);
      state.products = prods.map(productFromCloud);
      state.invoices = invs.map(invoiceFromCloud);
      state.expenses = exps.map(expenseFromCloud);
      const el = $('#cloudStatus');
      if (el && $('#app').classList.contains('hidden') === false) el.textContent = '';
      renderAll();
    } catch (e) {
      const el = $('#cloudStatus');
      if (el) el.textContent = 'Cloud data sync failed. Refresh to retry.';
    }
  }

  /* ---------- auth UI ---------- */
  function initAuth() {
    if (!cloud) {
      if ($('#cloudStatus')) $('#cloudStatus').textContent = window.SDCloud?.reason || 'Cloud login is not configured.';
      return;
    }
    cloud.auth.onChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (state.channel) { cloud.realtime.unsubscribe(state.channel); state.channel = null; }
        showLogin();
      }
    });
    cloud.auth.session().then(({ data }) => {
      if (data?.session) loadCloudWorkspace();
      else if ($('#cloudStatus')) $('#cloudStatus').textContent = 'Secure cloud workspace ready.';
    });
  }
  function bindAuth() {
    $('#demoLogin').addEventListener('click', () => {
      state.mode = 'demo';
      state.demo = true;
      state.businessId = null;
      state.products = readStored('velora_products', seedProducts);
      state.invoices = readStored('velora_invoices', seedInvoices);
      state.expenses = readStored('velora_expenses', seedExpenses);
      state.businessName = 'SalesDesk Workspace';
      showApp('Demo workspace');
    });
    $('#logout').addEventListener('click', async () => {
      if (cloud) { try { await cloud.auth.signOut(); } catch {} }
      if (state.channel) { cloud?.realtime.unsubscribe(state.channel); state.channel = null; }
      showLogin();
    });
    $('#cloudLogin').addEventListener('submit', async e => {
      e.preventDefault();
      if (!cloud) { toast('Cloud connection is unavailable'); return; }
      const email = $('#loginEmail').value.trim();
      const password = $('#loginPassword').value;
      if (!email || !password) { toast('Enter your email and password'); return; }
      try {
        const { error } = await cloud.auth.signIn(email, password);
        if (error) throw error;
      } catch (err) { toast(err.message || 'Sign in failed'); }
    });
  }

  /* ---------- product options + preview ---------- */
  function productOptions() {
    const s = $('#product');
    if (!s) return;
    const current = s.value;
    s.innerHTML = state.products.map(p => `<option value="${p.id}">${esc(p.name)} · ${money(p.price)}</option>`).join('');
    if (current && state.products.some(p => String(p.id) === current)) s.value = current;
    syncRate();
  }
  function selectedProduct() { return state.products.find(p => String(p.id) === $('#product')?.value) || state.products[0]; }
  function syncRate() { const p = selectedProduct(); if (p && $('#rate')) $('#rate').value = p.price; updatePreview(); }
  function calcTotal() { return Math.max(0, (Number($('#qty')?.value) || 0) * (Number($('#rate')?.value) || 0) - (Number($('#discount')?.value) || 0)); }
  function updatePreview() {
    if (!$('#preview') || !$('#previewTotal')) return;
    const p = selectedProduct() || { name: 'Business item' };
    const qty = Number($('#qty')?.value) || 0;
    const total = calcTotal();
    $('#previewTotal').textContent = money(total);
    $('#preview').innerHTML = `<div class="bill-head"><div><b>YOUR BUSINESS</b><div class="muted">Business workspace</div></div><div class="text-right"><b>RECEIPT</b><div class="muted">Powered by SalesDesk</div></div></div>` +
      `<p><b>Customer</b><br>${esc($('#customerName')?.value || 'Walk-in customer')}</p><p class="muted">${esc($('#phone')?.value || 'No mobile number')}</p>` +
      `<div class="line-item"><span>${esc(p.name)} × ${qty}</span><b>${money(qty * (Number($('#rate')?.value) || 0))}</b></div>` +
      `<div class="line-item"><span>Discount</span><span>− ${money($('#discount')?.value)}</span></div>` +
      `<div class="line-item"><span>Payment</span><span>${esc(($('#paymentMethod')?.value || 'upi').toUpperCase())} · ${esc($('#paymentStatus')?.value || 'paid')}</span></div>` +
      `<div class="bill-total"><span>Total</span><span>${money(total)}</span></div>` +
      `<p class="muted" style="font-size:11px;padding-bottom:22px">Thank you for your business.</p>`;
  }
  function bindSale() {
    $('#product')?.addEventListener('change', syncRate);
    ['#qty', '#rate', '#discount', '#customerName', '#phone', '#paymentMethod', '#paymentStatus'].forEach(id => $(id)?.addEventListener('input', updatePreview));
    $('#invoiceForm').addEventListener('submit', async e => {
      e.preventDefault();
      const p = selectedProduct();
      const qty = Number($('#qty').value);
      if (!p || qty <= 0) return;
      if (!isService(p) && qty > p.stock) { toast('Not enough stock for this sale'); return; }
      const rate = Number($('#rate').value || p.price);
      const discount = Number($('#discount').value) || 0;
      const done = () => {
        e.target.reset();
        $('#qty').value = 1;
        $('#discount').value = 0;
        productOptions();
        renderAll();
        toast('Sale completed successfully');
        gotoView('history');
      };
      if (state.demo) {
        const inv = {
          id: 'VL-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4),
          customer: $('#customerName').value.trim() || 'Walk-in customer',
          phone: $('#phone').value.trim(), product: p.name, productId: p.id, qty,
          rate, cost: Number(p.cost || 0), discount, subtotal: qty * rate, total: calcTotal(),
          paymentMethod: $('#paymentMethod').value, paymentStatus: $('#paymentStatus').value, date: todayStr(), ts: Date.now()
        };
        state.invoices.unshift(inv);
        if (!isService(p)) p.stock = Math.max(0, p.stock - qty);
        saveLocal();
        done();
      } else {
        const submit = $('#invoiceForm').querySelector('button[type=submit]');
        if (submit) submit.disabled = true;
        try {
          await cloud.invoices.checkout({
            p_business_id: state.businessId,
            p_product_id: p.id,
            p_customer_name: $('#customerName').value.trim() || 'Walk-in customer',
            p_customer_phone: $('#phone').value.trim(),
            p_quantity: qty, p_rate: rate, p_discount: discount,
            p_payment_method: $('#paymentMethod').value, p_payment_status: $('#paymentStatus').value,
            p_idempotency_key: null
          });
          await refreshCloudData();
          done();
        } catch (err) {
          toast(err.message || 'Sale failed');
        } finally {
          if (submit) submit.disabled = false;
        }
      }
    });
  }

  /* ---------- inventory ---------- */
  let stockFilter = 'all';
  function renderInventory() {
    const rows = $('#inventoryRows');
    if (!rows) return;
    const q = ($('#productSearch')?.value || '').toLowerCase();
    const list = state.products
      .filter(p => p.name.toLowerCase().includes(q))
      .filter(p => stockFilter === 'low' ? (!isService(p) && p.stock <= p.reorder) : stockFilter === 'in' ? (isService(p) || p.stock > p.reorder) : true);
    rows.innerHTML = list.map(p => `<tr>
      <td data-label="Product"><div><b>${esc(p.name)}</b><div class="muted sku-tag">SKU VL-${String(p.id).padStart(4, '0')}</div></div></td>
      <td data-label="Cost">${money(p.cost || 0)}</td>
      <td data-label="Selling"><b>${money(p.price)}</b></td>
      <td data-label="Stock">${isService(p) ? 'Service' : p.stock + ' units'}</td>
      <td data-label="Reorder">${isService(p) ? '—' : p.reorder + ' units'}</td>
      <td data-label="Status"><span class="status ${!isService(p) && p.stock <= p.reorder ? 'low' : ''}">${isService(p) ? 'Active' : (p.stock <= p.reorder ? 'Low stock' : 'In stock')}</span></td>
      <td data-label="Actions"><button class="action-btn" data-act="edit-product" data-id="${p.id}">Edit</button><button class="action-btn danger" data-act="delete-product" data-id="${p.id}">Delete</button></td>
    </tr>`).join('') || '<tr><td colspan="7">No matching products.</td></tr>';
  }
  function openProductDialog(id) {
    if (!id) {
      $('#productForm').reset();
      $('#pId').value = '';
      $('#pReorder').value = 5;
      $('#productDialogTitle').textContent = 'Add product';
    } else {
      const p = state.products.find(x => String(x.id) === String(id));
      if (!p) return;
      $('#productDialogTitle').textContent = 'Edit product';
      $('#pId').value = p.id;
      $('#pName').value = p.name;
      $('#pCost').value = p.cost || 0;
      $('#pPrice').value = p.price;
      $('#pStock').value = isService(p) ? 0 : p.stock;
      $('#pReorder').value = p.reorder;
    }
    $('#productDialog').showModal();
  }
  function bindInventory() {
    $('#productSearch')?.addEventListener('input', renderInventory);
    $$('.filter-chip').forEach(c => c.addEventListener('click', () => {
      stockFilter = c.dataset.filter || 'all';
      $$('.filter-chip').forEach(x => { const on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
      renderInventory();
    }));
    $('#addProduct').addEventListener('click', () => openProductDialog(null));
    $('#cancelProduct').addEventListener('click', () => $('#productDialog').close());
    $('#productForm').addEventListener('submit', async e => {
      e.preventDefault();
      const id = $('#pId').value;
      const data = {
        name: $('#pName').value.trim(), cost: Number($('#pCost').value),
        price: Number($('#pPrice').value), stock: Number($('#pStock').value), reorder: Number($('#pReorder').value)
      };
      if (!data.name || data.price < 0) { toast('Enter a name and valid price'); return; }
      if (state.demo) {
        if (id) Object.assign(state.products.find(p => String(p.id) === id), data);
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
        } catch (err) { toast(err.message || 'Could not save product'); }
      }
    });
    $('#inventoryRows').addEventListener('click', onInventoryAction);
  }
  async function onInventoryAction(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit-product') { openProductDialog(id); return; }
    if (btn.dataset.act === 'delete-product') {
      if (state.products.length === 1) { toast('Keep at least one product'); return; }
      if (!confirm('Delete this product?')) return;
      if (state.demo) {
        state.products = state.products.filter(p => String(p.id) !== String(id));
        saveLocal();
        renderAll();
        toast('Product deleted');
      } else {
        try { await cloud.products.remove(id); await refreshCloudData(); toast('Product deleted'); }
        catch (err) { toast(err.message || 'Could not delete product'); }
      }
    }
  }

  /* ---------- customers ---------- */
  function customers() {
    const map = {};
    state.invoices.forEach(i => {
      const key = (i.phone || i.customer || '').toLowerCase();
      if (!map[key]) map[key] = { name: i.customer, phone: i.phone, orders: 0, total: 0, last: i.date, ts: i.ts || 0 };
      map[key].orders++;
      map[key].total += i.total;
      if ((i.ts || 0) >= map[key].ts) { map[key].last = i.date; map[key].ts = i.ts || 0; }
    });
    return Object.values(map);
  }
  function initials(name) { return String(name || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase(); }
  function renderCustomers() {
    const rows = $('#customerRows');
    if (!rows) return;
    const q = ($('#customerSearch')?.value || '').toLowerCase();
    const list = customers().filter(c => (c.name + ' ' + c.phone).toLowerCase().includes(q));
    rows.innerHTML = list.map(c => `<tr>
      <td data-label="Customer"><div class="cell-person"><span class="store-avatar">${esc(initials(c.name))}</span><b>${esc(c.name)}</b></div></td>
      <td data-label="Phone">${esc(c.phone || '—')}</td>
      <td data-label="Transactions">${c.orders}</td>
      <td data-label="Lifetime value"><b>${money(c.total)}</b></td>
      <td data-label="Last purchase">${c.last}</td>
    </tr>`).join('') || '<tr><td colspan="5">No matching customers.</td></tr>';
  }

  /* ---------- expenses ---------- */
  function renderExpenses() {
    const list = $('#expenseList');
    if (!list) return;
    const total = state.expenses.reduce((a, b) => a + b.amount, 0);
    if ($('#expenseTotal')) $('#expenseTotal').textContent = money(total);
    list.innerHTML = state.expenses.map(x => `<div class="expense-item">
      <div><b>${esc(x.category)}</b><small>${esc(x.note || x.date)}</small></div>
      <div><b>${money(x.amount)}</b> <button class="action-btn danger" data-act="delete-expense" data-id="${x.id}">×</button></div>
    </div>`).join('') || '<p class="muted">No expenses recorded.</p>';
  }
  function bindExpenses() {
    $('#expenseForm').addEventListener('submit', async e => {
      e.preventDefault();
      const data = {
        category: $('#expenseCategory').value.trim(), amount: Number($('#expenseAmount').value), note: $('#expenseNote').value.trim()
      };
      if (!data.category || !(data.amount > 0)) { toast('Enter a category and amount'); return; }
      if (state.demo) {
        state.expenses.unshift({ id: Date.now(), ...data, date: todayStr(), ts: Date.now() });
        saveLocal();
        e.target.reset();
        renderAll();
        toast('Expense added');
      } else {
        try {
          await cloud.expenses.create(state.businessId, state.user?.id, data);
          await refreshCloudData();
          e.target.reset();
          toast('Expense added');
        } catch (err) { toast(err.message || 'Could not add expense'); }
      }
    });
    $('#expenseList').addEventListener('click', async e => {
      const btn = e.target.closest('[data-act="delete-expense"]');
      if (!btn || !confirm('Delete this expense?')) return;
      const id = btn.dataset.id;
      if (state.demo) {
        state.expenses = state.expenses.filter(x => String(x.id) !== String(id));
        saveLocal();
        renderAll();
        toast('Expense deleted');
      } else {
        try { await cloud.expenses.remove(id); await refreshCloudData(); toast('Expense deleted'); }
        catch (err) { toast(err.message || 'Could not delete expense'); }
      }
    });
  }

  /* ---------- invoices / history ---------- */
  function invoicePayment(i) { return `<span class="status ${i.paymentStatus === 'unpaid' ? 'low' : ''}">${esc(i.paymentStatus || 'paid')}</span>`; }
  function invoiceRow(i, compact) {
    if (compact) return `<tr>
      <td data-label="Transaction"><b>${esc(i.id)}</b></td>
      <td data-label="Customer">${esc(i.customer)}</td>
      <td data-label="Item">${esc(i.product)}</td>
      <td data-label="Amount"><b>${money(i.total)}</b></td>
      <td data-label="Status">${invoicePayment(i)}</td>
      <td data-label="Date">${i.date}</td>
    </tr>`;
    return `<tr>
      <td data-label="Transaction"><b>${esc(i.id)}</b></td>
      <td data-label="Customer">${esc(i.customer)}</td>
      <td data-label="Item">${esc(i.product)} × ${i.qty}</td>
      <td data-label="Amount"><b>${money(i.total)}</b></td>
      <td data-label="Payment">${invoicePayment(i)}</td>
      <td data-label="Date">${i.date}</td>
      <td data-label="Actions"><button class="action-btn" data-act="print-invoice" data-id="${i.id}">Print</button><button class="action-btn" data-act="share-invoice" data-id="${i.id}">WhatsApp</button><button class="action-btn danger" data-act="delete-invoice" data-id="${i.id}">Delete</button></td>
    </tr>`;
  }
  function renderInvoices() {
    const q = ($('#invoiceSearch')?.value || '').toLowerCase();
    const filtered = state.invoices.filter(i => (i.id + ' ' + i.customer + ' ' + i.phone).toLowerCase().includes(q));
    if ($('#historyRows')) $('#historyRows').innerHTML = filtered.map(i => invoiceRow(i, false)).join('') || '<tr><td colspan="7">No matching transactions.</td></tr>';
    if ($('#recent')) $('#recent').innerHTML = state.invoices.slice(0, 5).map(i => invoiceRow(i, true)).join('') || '<tr><td colspan="6">No transactions yet.</td></tr>';
  }
  function findInvoice(id) { return state.invoices.find(x => x.id === id); }
  function bindInvoices() {
    $('#invoiceSearch')?.addEventListener('input', renderInvoices);
    $('#historyRows').addEventListener('click', onInvoiceAction);
  }
  async function onInvoiceAction(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const i = findInvoice(btn.dataset.id);
    if (!i) return;
    if (btn.dataset.act === 'print-invoice') { printInvoice(i); return; }
    if (btn.dataset.act === 'share-invoice') { shareInvoice(i); return; }
    if (btn.dataset.act === 'delete-invoice') {
      if (!confirm('Delete transaction and restore stock?')) return;
      if (state.demo) {
        const p = state.products.find(x => String(x.id) === String(i.productId));
        if (p && !isService(p)) p.stock += i.qty;
        state.invoices = state.invoices.filter(x => x.id !== i.id);
        saveLocal();
        renderAll();
        toast('Transaction deleted');
      } else {
        try { await cloud.invoices.remove(i.cloudId || i.id); await refreshCloudData(); toast('Transaction deleted'); }
        catch (err) { toast(err.message || 'Could not delete transaction'); }
      }
    }
  }
  function printInvoice(i) {
    const w = open('', '_blank', 'width=720,height=900');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print invoices.'); return; }
    w.document.write(`<!doctype html><html><head><title>${esc(i.id)}</title><style>
      body{font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:42px;color:#171713;max-width:640px;margin:auto}
      .top{display:flex;justify-content:space-between;border-bottom:2px solid #171713;padding-bottom:18px}
      .row{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #ddd}
      .total{font-size:24px;font-weight:700}.muted{color:#777}
      </style></head><body>
      <div class="top"><div><h2>YOUR BUSINESS</h2><div class="muted">Powered by SalesDesk</div></div><div><b>${esc(i.id)}</b><div>${i.date}</div></div></div>
      <p><b>Customer:</b> ${esc(i.customer)}</p><p><b>Phone:</b> ${esc(i.phone || '—')}</p>
      <div class="row"><span>${esc(i.product)} × ${i.qty}</span><b>${money(i.subtotal || i.qty * i.rate)}</b></div>
      <div class="row"><span>Discount</span><span>− ${money(i.discount)}</span></div>
      <div class="row total"><span>Total</span><span>${money(i.total)}</span></div>
      <p>Payment: ${(i.paymentMethod || 'upi').toUpperCase()} · ${i.paymentStatus || 'paid'}</p>
      <p class="muted">Thank you for your business.</p>
      <script>print()<\/script></body></html>`);
    w.document.close();
  }
  function shareInvoice(i) {
    const text = `YOUR BUSINESS\nTransaction: ${i.id}\nCustomer: ${i.customer}\n${i.product} × ${i.qty}\nTotal: ₹${i.total}\nPayment: ${(i.paymentMethod || 'upi').toUpperCase()} (${i.paymentStatus || 'paid'})\nDate: ${i.date}\nThank you for your business!`;
    const phone = (i.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  /* ---------- dashboard ---------- */
  function renderDashboard() {
    const revenue = state.invoices.reduce((a, b) => a + b.total, 0);
    const expenses = state.expenses.reduce((a, b) => a + b.amount, 0);
    const cogs = state.invoices.reduce((a, b) => a + (Number(b.cost || 0) * Number(b.qty || 0)), 0);
    if ($('#revenue')) $('#revenue').textContent = money(revenue);
    if ($('#profit')) $('#profit').textContent = money(revenue - cogs - expenses);
    if ($('#invoiceCount')) $('#invoiceCount').textContent = state.invoices.length;
    if ($('#lowStock')) $('#lowStock').textContent = state.products.filter(p => !isService(p) && p.stock <= p.reorder).length;
    if ($('#alerts')) {
      $('#alerts').innerHTML = state.products.filter(p => !isService(p)).slice()
        .sort((a, b) => (a.stock / Math.max(a.reorder, 1)) - (b.stock / Math.max(b.reorder, 1))).slice(0, 5)
        .map(p => `<div class="alert"><div><b>${esc(p.name)}</b><div class="muted">${p.stock} units available</div></div><span class="status ${p.stock <= p.reorder ? 'low' : ''}">${p.stock <= p.reorder ? 'Restock' : 'Healthy'}</span></div>`).join('')
        || '<p class="muted" style="color:rgba(255,255,255,.8)">No inventory alerts.</p>';
    }
    const range = Number($('#rangeSel')?.value || 7);
    const now = new Date();
    const cutoff = range >= 30 ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : Date.now() - range * 864e5;
    const daily = {};
    state.invoices.forEach(i => { if (i.ts && i.ts < cutoff) return; daily[i.date] = (daily[i.date] || 0) + i.total; });
    const vals = Object.keys(daily).sort().slice(-range).map(k => [k, daily[k]]);
    const max = Math.max(...vals.map(v => v[1]), 1);
    if ($('#bars')) {
      $('#bars').innerHTML = vals.length
        ? vals.map(([d, v]) => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(12, v / max * 150)}px" title="${money(v)}"></div><span>${esc(d.slice(0, 6))}</span></div>`).join('')
        : '<p class="muted" style="padding:28px 22px">Sales chart appears once transactions are created.</p>';
    }
  }

  /* ---------- reports ---------- */
  function renderReports() {
    const revenue = state.invoices.reduce((a, b) => a + b.total, 0);
    const expenses = state.expenses.reduce((a, b) => a + b.amount, 0);
    if ($('#avgOrder')) $('#avgOrder').textContent = money(state.invoices.length ? revenue / state.invoices.length : 0);
    if ($('#inventoryValue')) $('#inventoryValue').textContent = money(state.products.filter(p => !isService(p)).reduce((a, p) => a + (Number(p.cost || 0) * Number(p.stock || 0)), 0));
    if ($('#customerCount')) $('#customerCount').textContent = customers().length;
    if ($('#reportExpenses')) $('#reportExpenses').textContent = money(expenses);
    const prod = {};
    state.invoices.forEach(i => {
      prod[i.product] = prod[i.product] || { qty: 0, revenue: 0 };
      prod[i.product].qty += Number(i.qty); prod[i.product].revenue += Number(i.total);
    });
    if ($('#productPerformance')) {
      $('#productPerformance').innerHTML = Object.entries(prod).sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([name, v]) => `<div class="report-row"><div><b>${esc(name)}</b><small>${v.qty} sold / delivered</small></div><strong>${money(v.revenue)}</strong></div>`).join('')
        || '<p class="muted">No sales data yet.</p>';
    }
    const pay = {};
    state.invoices.forEach(i => pay[i.paymentMethod || 'upi'] = (pay[i.paymentMethod || 'upi'] || 0) + i.total);
    if ($('#paymentMix')) {
      $('#paymentMix').innerHTML = Object.entries(pay).sort((a, b) => b[1] - a[1])
        .map(([name, v]) => `<div class="report-row"><div><b>${esc(name.toUpperCase())}</b><small>${revenue ? Math.round(v / revenue * 100) : 0}% of sales</small></div><strong>${money(v)}</strong></div>`).join('')
        || '<p class="muted" style="color:rgba(255,255,255,.8)">No payment data yet.</p>';
    }
  }

  /* ---------- export ---------- */
  function bindExport() {
    $('#exportData').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({
        product: 'SalesDesk', exportedAt: new Date().toISOString(),
        mode: state.mode, businessId: state.businessId,
        products: state.products, invoices: state.invoices, expenses: state.expenses
      }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'salesdesk-business-backup.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Business data exported');
    });
    $('#rangeSel')?.addEventListener('change', renderDashboard);
  }

  /* ---------- render all ---------- */
  function renderAll() {
    productOptions(); renderInventory(); renderCustomers(); renderExpenses(); renderInvoices(); renderDashboard(); renderReports(); updatePreview();
  }

  /* ---------- boot ---------- */
  function boot() {
    $$('.nav[data-view]').forEach(b => b.addEventListener('click', () => gotoView(b.dataset.view)));
    $$('.goto-billing').forEach(b => b.addEventListener('click', () => gotoView('billing')));
    $$('[data-go]').forEach(b => b.addEventListener('click', () => gotoView(b.dataset.go)));
    bindAuth();
    bindSale();
    bindInventory();
    bindExpenses();
    bindInvoices();
    bindExport();
    initAuth();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();