import { useMemo, useState } from 'react';
import {
  LayoutDashboard, ReceiptText, Boxes, Users, WalletCards, BarChart3,
  Settings, Search, Bell, Plus, TrendingUp, PackageCheck, AlertTriangle,
  ArrowUpRight, IndianRupee, ShoppingCart, Download, MoreHorizontal
} from 'lucide-react';

const nav = [
  ['Dashboard', LayoutDashboard], ['Billing', ReceiptText], ['Inventory', Boxes],
  ['Customers', Users], ['Expenses', WalletCards], ['Reports', BarChart3], ['Settings', Settings]
];

const transactions = [
  { invoice: 'INV-1048', customer: 'Arun Kumar', items: 'Chicken · 3.5 kg', total: '₹1,015', status: 'Paid' },
  { invoice: 'INV-1047', customer: 'Priya', items: 'Mutton · 1.2 kg', total: '₹1,080', status: 'Paid' },
  { invoice: 'INV-1046', customer: 'Walk-in Customer', items: 'Chicken · 2 kg', total: '₹580', status: 'Paid' },
  { invoice: 'INV-1045', customer: 'Vignesh', items: 'Mutton · 2 kg', total: '₹1,800', status: 'Pending' },
];

const stock = [
  { name: 'Chicken', available: 18.5, initial: 35, unit: 'kg', tone: 'good' },
  { name: 'Mutton', available: 7.2, initial: 18, unit: 'kg', tone: 'warn' },
];

function App() {
  const [active, setActive] = useState('Dashboard');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => transactions.filter(x =>
    `${x.invoice} ${x.customer} ${x.items}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">TK</div><div><strong>Thatha Kadai</strong><span>Business OS</span></div></div>
        <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => setActive(label)}><Icon size={19}/><span>{label}</span></button>)}</nav>
        <div className="sidebar-card"><span>Portfolio Build</span><strong>Billing & Inventory SaaS</strong><p>Designed and developed as a real-world small-business management product.</p></div>
        <div className="profile"><div className="avatar">SK</div><div><strong>Senthil Kumaran</strong><span>Administrator</span></div><MoreHorizontal size={18}/></div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand">Thatha Kadai</div>
          <div className="search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoices, customers, items..." /></div>
          <div className="top-actions"><button className="icon-btn"><Bell size={19}/><i/></button><button className="primary"><Plus size={18}/> New Invoice</button></div>
        </header>

        <section className="content">
          <div className="page-head"><div><p className="eyebrow">BUSINESS OVERVIEW</p><h1>{active}</h1><p>Track sales, stock and customers from one clean workspace.</p></div><button className="secondary"><Download size={17}/> Export report</button></div>

          <div className="metrics">
            <Metric icon={IndianRupee} label="Today's Revenue" value="₹18,460" delta="+12.4%" detail="vs last Sunday"/>
            <Metric icon={ShoppingCart} label="Orders" value="42" delta="+8.1%" detail="6 more orders"/>
            <Metric icon={PackageCheck} label="Stock Value" value="₹21,840" delta="68%" detail="inventory remaining"/>
            <Metric icon={Users} label="Customers" value="128" delta="+14" detail="this month"/>
          </div>

          <div className="grid-main">
            <section className="panel sales-panel">
              <div className="panel-head"><div><span>Sales performance</span><h2>₹68,920</h2></div><select defaultValue="6 weeks"><option>6 weeks</option><option>3 months</option></select></div>
              <div className="chart" aria-label="Sales bar chart">{[38,54,45,66,59,82].map((v,i)=><div key={i} className="bar-wrap"><div className="bar" style={{height:`${v}%`}}></div><span>{['Aug 2','Aug 9','Aug 16','Aug 23','Aug 30','Sep 6'][i]}</span></div>)}</div>
            </section>

            <section className="panel stock-panel">
              <div className="panel-head"><div><span>Live inventory</span><h3>Stock health</h3></div><button className="link-btn">View all <ArrowUpRight size={15}/></button></div>
              {stock.map(item => {
                const pct = Math.round(item.available / item.initial * 100);
                return <div className="stock-row" key={item.name}><div className={`stock-icon ${item.tone}`}><Boxes size={20}/></div><div className="stock-copy"><div><strong>{item.name}</strong><span>{item.available} / {item.initial} {item.unit}</span></div><div className="progress"><i style={{width:`${pct}%`}}/></div></div><b>{pct}%</b></div>
              })}
              <div className="alert"><AlertTriangle size={18}/><div><strong>Low-stock forecast</strong><span>Mutton may fall below 5 kg after ~4 orders.</span></div></div>
            </section>
          </div>

          <section className="panel transactions">
            <div className="panel-head"><div><span>Recent activity</span><h3>Latest invoices</h3></div><button className="link-btn">View billing <ArrowUpRight size={15}/></button></div>
            <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{filtered.map(row => <tr key={row.invoice}><td><strong>{row.invoice}</strong></td><td>{row.customer}</td><td>{row.items}</td><td><strong>{row.total}</strong></td><td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td></tr>)}</tbody></table></div>
          </section>
        </section>
      </main>
    </div>
  );
}

function Metric({icon: Icon, label, value, delta, detail}) {
  return <article className="metric"><div className="metric-icon"><Icon size={20}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-foot"><span><TrendingUp size={14}/>{delta}</span> {detail}</div></article>
}

export default App;
