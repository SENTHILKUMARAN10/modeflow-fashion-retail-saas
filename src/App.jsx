import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, ReceiptText, Boxes, Users, WalletCards, BarChart3, Settings,
  Search, Bell, Plus, TrendingUp, PackageCheck, AlertTriangle, ArrowUpRight,
  IndianRupee, ShoppingCart, Download, MoreHorizontal, Trash2, Printer,
  UserPlus, Save, X, CheckCircle2
} from 'lucide-react';

const nav = [
  ['Dashboard', LayoutDashboard], ['Billing', ReceiptText], ['Inventory', Boxes],
  ['Customers', Users], ['Expenses', WalletCards], ['Reports', BarChart3], ['Settings', Settings]
];

const seedInventory = [
  { id: 1, name: 'Chicken', available: 35, initial: 35, unit: 'kg', price: 290 },
  { id: 2, name: 'Mutton', available: 18, initial: 18, unit: 'kg', price: 900 },
];

const seedInvoices = [
  { id: 'INV-1048', customer: 'Arun Kumar', phone: '9876543210', date: '2026-09-05', status: 'Paid', items: [{ productId: 1, name: 'Chicken', qty: 3.5, price: 290 }] },
  { id: 'INV-1047', customer: 'Priya', phone: '9876500011', date: '2026-09-05', status: 'Paid', items: [{ productId: 2, name: 'Mutton', qty: 1.2, price: 900 }] },
];

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const invoiceTotal = invoice => invoice.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

function App() {
  const [active, setActive] = useState('Dashboard');
  const [query, setQuery] = useState('');
  const [inventory, setInventory] = useState(() => load('tk_inventory', seedInventory));
  const [invoices, setInvoices] = useState(() => load('tk_invoices', seedInvoices));
  const [customers, setCustomers] = useState(() => load('tk_customers', [
    { id: 1, name: 'Arun Kumar', phone: '9876543210', orders: 4 },
    { id: 2, name: 'Priya', phone: '9876500011', orders: 2 },
  ]));
  const [showInvoice, setShowInvoice] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => localStorage.setItem('tk_inventory', JSON.stringify(inventory)), [inventory]);
  useEffect(() => localStorage.setItem('tk_invoices', JSON.stringify(invoices)), [invoices]);
  useEffect(() => localStorage.setItem('tk_customers', JSON.stringify(customers)), [customers]);

  const revenue = useMemo(() => invoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0), [invoices]);
  const filteredInvoices = useMemo(() => invoices.filter(inv => `${inv.id} ${inv.customer} ${inv.phone}`.toLowerCase().includes(query.toLowerCase())), [invoices, query]);

  const notify = msg => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const saveInvoice = ({ customer, phone, status, items }) => {
    const validItems = items.filter(item => Number(item.qty) > 0);
    if (!customer.trim() || !phone.trim() || !validItems.length) return notify('Add customer details and at least one item.');
    const insufficient = validItems.find(item => {
      const stockItem = inventory.find(p => p.id === item.productId);
      return stockItem && Number(item.qty) > stockItem.available;
    });
    if (insufficient) return notify(`Not enough ${insufficient.name} stock.`);

    const nextNumber = 1049 + invoices.length;
    const invoice = { id: `INV-${nextNumber}`, customer: customer.trim(), phone: phone.trim(), date: new Date().toISOString().slice(0, 10), status, items: validItems };
    setInvoices(prev => [invoice, ...prev]);
    setInventory(prev => prev.map(product => {
      const sold = validItems.find(i => i.productId === product.id);
      return sold ? { ...product, available: Math.max(0, Number((product.available - Number(sold.qty)).toFixed(2))) } : product;
    }));
    setCustomers(prev => {
      const found = prev.find(c => c.phone === phone.trim());
      return found
        ? prev.map(c => c.phone === phone.trim() ? { ...c, name: customer.trim(), orders: c.orders + 1 } : c)
        : [{ id: Date.now(), name: customer.trim(), phone: phone.trim(), orders: 1 }, ...prev];
    });
    setShowInvoice(false);
    setPreview(invoice);
    notify('Invoice created and stock updated.');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">TK</div><div><strong>Thatha Kadai</strong><span>Business OS</span></div></div>
        <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => setActive(label)}><Icon size={19}/><span>{label}</span></button>)}</nav>
        <div className="sidebar-card"><span>PORTFOLIO PROJECT</span><strong>Billing & Inventory SaaS</strong><p>Real-world sales, stock and customer workflow built with React.</p></div>
        <div className="profile"><div className="avatar">SK</div><div><strong>Senthil Kumaran</strong><span>Administrator</span></div><MoreHorizontal size={18}/></div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand">Thatha Kadai</div>
          <div className="search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoices, customers..." /></div>
          <div className="top-actions"><button className="icon-btn"><Bell size={19}/><i/></button><button className="primary" onClick={() => setShowInvoice(true)}><Plus size={18}/> New Invoice</button></div>
        </header>

        <section className="content">
          {active === 'Dashboard' && <Dashboard revenue={revenue} invoices={invoices} customers={customers} inventory={inventory} filteredInvoices={filteredInvoices} setPreview={setPreview} />}
          {active === 'Billing' && <Billing invoices={filteredInvoices} setPreview={setPreview} onNew={() => setShowInvoice(true)} />}
          {active === 'Inventory' && <Inventory inventory={inventory} setInventory={setInventory} notify={notify} />}
          {active === 'Customers' && <Customers customers={customers} invoices={invoices} />}
          {active === 'Expenses' && <Placeholder title="Expenses" text="Expense recording and profit calculation are planned for the next milestone." />}
          {active === 'Reports' && <Placeholder title="Reports" text="Advanced date filters, category analytics and exportable reports are planned for the next milestone." />}
          {active === 'Settings' && <Placeholder title="Settings" text="Business profile, invoice branding and authentication settings are planned for the next milestone." />}
        </section>
      </main>

      {showInvoice && <InvoiceModal inventory={inventory} onClose={() => setShowInvoice(false)} onSave={saveInvoice} />}
      {preview && <InvoicePreview invoice={preview} onClose={() => setPreview(null)} />}
      {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    </div>
  );
}

function Dashboard({ revenue, invoices, customers, inventory, filteredInvoices, setPreview }) {
  const stockValue = inventory.reduce((sum, p) => sum + p.available * p.price, 0);
  return <>
    <PageHead eyebrow="BUSINESS OVERVIEW" title="Dashboard" text="Track sales, stock and customers from one clean workspace." />
    <div className="metrics">
      <Metric icon={IndianRupee} label="Total Revenue" value={money(revenue)} delta="Live" detail="from saved invoices"/>
      <Metric icon={ShoppingCart} label="Orders" value={invoices.length} delta="Active" detail="invoice records"/>
      <Metric icon={PackageCheck} label="Stock Value" value={money(stockValue)} delta={`${inventory.length} items`} detail="inventory remaining"/>
      <Metric icon={Users} label="Customers" value={customers.length} delta="Saved" detail="customer profiles"/>
    </div>
    <div className="grid-main">
      <section className="panel sales-panel"><div className="panel-head"><div><span>Sales performance</span><h2>{money(revenue)}</h2></div><select defaultValue="6 weeks"><option>6 weeks</option></select></div><div className="chart">{[38,54,45,66,59,82].map((v,i)=><div key={i} className="bar-wrap"><div className="bar" style={{height:`${v}%`}}/><span>{['W1','W2','W3','W4','W5','W6'][i]}</span></div>)}</div></section>
      <section className="panel stock-panel"><div className="panel-head"><div><span>Live inventory</span><h3>Stock health</h3></div></div>{inventory.map(item => { const pct = Math.round(item.available / item.initial * 100); return <div className="stock-row" key={item.id}><div className={`stock-icon ${pct < 35 ? 'warn' : ''}`}><Boxes size={20}/></div><div className="stock-copy"><div><strong>{item.name}</strong><span>{item.available} / {item.initial} {item.unit}</span></div><div className="progress"><i style={{width:`${pct}%`}}/></div></div><b>{pct}%</b></div>})}<div className="alert"><AlertTriangle size={18}/><div><strong>Stock intelligence</strong><span>Products below 35% are highlighted automatically.</span></div></div></section>
    </div>
    <InvoiceTable invoices={filteredInvoices} setPreview={setPreview} title="Latest invoices" />
  </>;
}

function Billing({ invoices, setPreview, onNew }) {
  return <><PageHead eyebrow="SALES WORKFLOW" title="Billing" text="Create, review and print customer invoices." action={<button className="primary" onClick={onNew}><Plus size={17}/> Create invoice</button>} /><InvoiceTable invoices={invoices} setPreview={setPreview} title="All invoices" /></>;
}

function Inventory({ inventory, setInventory, notify }) {
  const [name, setName] = useState(''); const [stock, setStock] = useState(''); const [price, setPrice] = useState('');
  const add = e => { e.preventDefault(); if (!name || !stock || !price) return notify('Complete all inventory fields.'); setInventory(prev => [...prev, { id: Date.now(), name, available: Number(stock), initial: Number(stock), unit:'kg', price:Number(price) }]); setName(''); setStock(''); setPrice(''); notify('Inventory item added.'); };
  const remove = id => setInventory(prev => prev.filter(p => p.id !== id));
  return <><PageHead eyebrow="STOCK CONTROL" title="Inventory" text="Manage products, stock quantities and selling prices." />
    <section className="panel form-panel"><form className="inline-form" onSubmit={add}><Field label="Product" value={name} setValue={setName} placeholder="e.g. Fish"/><Field label="Opening stock (kg)" value={stock} setValue={setStock} type="number"/><Field label="Price / kg" value={price} setValue={setPrice} type="number"/><button className="primary" type="submit"><Plus size={17}/> Add product</button></form></section>
    <section className="panel data-panel"><div className="panel-head"><div><span>Current inventory</span><h3>{inventory.length} products</h3></div></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Available</th><th>Price/kg</th><th>Stock value</th><th></th></tr></thead><tbody>{inventory.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.available} {p.unit}</td><td>{money(p.price)}</td><td>{money(p.available*p.price)}</td><td><button className="danger-icon" onClick={()=>remove(p.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></section>
  </>;
}

function Customers({ customers, invoices }) {
  return <><PageHead eyebrow="CRM" title="Customers" text="Automatically built from completed billing activity." />
    <section className="customer-grid">{customers.map(c => { const spent = invoices.filter(i=>i.phone===c.phone).reduce((s,i)=>s+invoiceTotal(i),0); return <article className="customer-card" key={c.id}><div className="avatar large">{c.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div><strong>{c.name}</strong><span>{c.phone}</span></div><div className="customer-stats"><span><b>{c.orders}</b> orders</span><span><b>{money(spent)}</b> spent</span></div></article> })}</section>
  </>;
}

function InvoiceModal({ inventory, onClose, onSave }) {
  const [customer,setCustomer]=useState(''); const [phone,setPhone]=useState(''); const [status,setStatus]=useState('Paid');
  const [items,setItems]=useState([{ productId: inventory[0]?.id || '', name: inventory[0]?.name || '', qty:1, price:inventory[0]?.price || 0 }]);
  const updateItem=(index,key,value)=>setItems(prev=>prev.map((item,i)=>{ if(i!==index)return item; if(key==='productId'){const product=inventory.find(p=>p.id===Number(value));return {...item,productId:product.id,name:product.name,price:product.price};} return {...item,[key]:value};}));
  const addItem=()=>{const p=inventory[0]; if(p)setItems(prev=>[...prev,{productId:p.id,name:p.name,qty:1,price:p.price}]);};
  const total=items.reduce((s,i)=>s+Number(i.qty)*Number(i.price),0);
  return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><p className="eyebrow">NEW SALE</p><h2>Create Invoice</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="modal-body"><div className="form-grid"><Field label="Customer name" value={customer} setValue={setCustomer} placeholder="Customer name"/><Field label="Phone number" value={phone} setValue={setPhone} placeholder="10-digit number"/><label className="field"><span>Payment status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option>Paid</option><option>Pending</option></select></label></div><div className="item-editor"><div className="panel-head"><div><span>Invoice items</span><h3>Products</h3></div><button className="secondary" onClick={addItem}><Plus size={15}/> Add item</button></div>{items.map((item,index)=><div className="item-row" key={index}><select value={item.productId} onChange={e=>updateItem(index,'productId',e.target.value)}>{inventory.map(p=><option value={p.id} key={p.id}>{p.name} · {p.available} kg available</option>)}</select><input type="number" min="0.1" step="0.1" value={item.qty} onChange={e=>updateItem(index,'qty',e.target.value)}/><div className="line-total">{money(item.qty*item.price)}</div><button className="danger-icon" onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div>)}</div><div className="invoice-total"><span>Total</span><strong>{money(total)}</strong></div></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={()=>onSave({customer,phone,status,items})}><Save size={16}/> Save invoice</button></div></div></div>;
}

function InvoicePreview({ invoice, onClose }) {
  return <div className="modal-backdrop"><div className="modal invoice-preview"><div className="modal-head no-print"><div><p className="eyebrow">INVOICE PREVIEW</p><h2>{invoice.id}</h2></div><div className="preview-actions"><button className="secondary" onClick={()=>window.print()}><Printer size={16}/> Print / Save PDF</button><button className="icon-btn" onClick={onClose}><X size={18}/></button></div></div><div className="print-sheet"><div className="invoice-brand"><div className="brand-mark">TK</div><div><h2>Thatha Kadai</h2><p>Fresh meat billing & inventory</p></div></div><div className="invoice-meta"><div><span>Invoice</span><strong>{invoice.id}</strong></div><div><span>Date</span><strong>{invoice.date}</strong></div><div><span>Status</span><strong>{invoice.status}</strong></div></div><div className="bill-to"><span>Bill to</span><h3>{invoice.customer}</h3><p>{invoice.phone}</p></div><table className="invoice-table"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{invoice.items.map((i,idx)=><tr key={idx}><td>{i.name}</td><td>{i.qty} kg</td><td>{money(i.price)}</td><td>{money(i.qty*i.price)}</td></tr>)}</tbody></table><div className="invoice-grand"><span>Grand Total</span><strong>{money(invoiceTotal(invoice))}</strong></div><p className="invoice-note">Thank you for your purchase.</p></div></div></div>;
}

function InvoiceTable({ invoices, setPreview, title }) {
  return <section className="panel transactions"><div className="panel-head"><div><span>Sales records</span><h3>{title}</h3></div><span className="record-count">{invoices.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{invoices.map(inv=><tr key={inv.id}><td><strong>{inv.id}</strong></td><td>{inv.customer}<small>{inv.phone}</small></td><td>{inv.items.map(i=>`${i.name} · ${i.qty}kg`).join(', ')}</td><td><strong>{money(invoiceTotal(inv))}</strong></td><td><span className={`badge ${inv.status.toLowerCase()}`}>{inv.status}</span></td><td><button className="link-btn" onClick={()=>setPreview(inv)}>View <ArrowUpRight size={14}/></button></td></tr>)}</tbody></table>{!invoices.length&&<div className="empty-state">No invoices match your search.</div>}</div></section>;
}

function PageHead({ eyebrow, title, text, action }) { return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action || <button className="secondary" onClick={()=>window.print()}><Download size={17}/> Export / Print</button>}</div>; }
function Metric({icon:Icon,label,value,delta,detail}) { return <article className="metric"><div className="metric-icon"><Icon size={20}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-foot"><span><TrendingUp size={14}/>{delta}</span> {detail}</div></article>; }
function Field({label,value,setValue,placeholder='',type='text'}) { return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/></label>; }
function Placeholder({title,text}) { return <><PageHead eyebrow="COMING NEXT" title={title} text={text}/><section className="panel placeholder"><div className="metric-icon"><BarChart3 size={22}/></div><h2>{title} module</h2><p>{text}</p></section></>; }

export default App;
