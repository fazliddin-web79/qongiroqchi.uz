import { useEffect, useState, type MouseEvent } from 'react'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Headphones,
  LogOut,
  Menu,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { activities, campaigns, metrics, navGroups } from './data'

const stopLink = (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault()

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <button className={`sidebar-backdrop ${open ? 'open' : ''}`} aria-label="Menyuni yopish" onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <a className="brand" href="#" onClick={stopLink}>
          <span className="brand-mark"><Phone /></span>
          <span>Qong'iroqchi<span>.uz</span></span>
        </a>
        <nav className="nav-list">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map(({ label, icon: Icon, badge, active }) => (
                <a className={`nav-item ${active ? 'active' : ''}`} href="#" onClick={stopLink} key={label}>
                  <Icon /><span>{label}</span>{badge && <b>{badge}</b>}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-help">
          <span><Headphones /></span><strong>Yordam kerakmi?</strong>
          <p>Mutaxassis bilan bog'laning</p><button>Yordam olish</button>
        </div>
        <div className="sidebar-user">
          <div className="avatar">FS</div>
          <div><strong>Fazliddin S.</strong><span>Administrator</span></div>
          <button aria-label="Chiqish"><LogOut /></button>
        </div>
      </aside>
    </>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu} aria-label="Menyuni ochish"><Menu /></button>
      <label className="search"><Search /><input type="search" placeholder="Qidirish..." /><kbd>⌘ K</kbd></label>
      <div className="top-actions">
        <div className="status-pill"><i /><span>Tizim ishlamoqda</span></div>
        <button className="icon-button" aria-label="Bildirishnomalar"><Bell /><i /></button>
        <button className="create-button"><Plus /><span>Yangi kampaniya</span></button>
      </div>
    </header>
  )
}

function MetricCards() {
  return (
    <section className="metrics">
      {metrics.map(({ label, value, change, detail, progress, tone, icon: Icon, down }) => (
        <article className={`metric-card ${tone}`} key={label}>
          <div className="metric-head">
            <span><Icon /></span>
            <small className={down ? 'down' : ''}>{down ? <TrendingDown /> : <TrendingUp />}{change}</small>
          </div>
          <p>{label}</p><h2>{value}</h2>
          <footer><span><i style={{ width: `${progress}%` }} /></span>{detail}</footer>
        </article>
      ))}
    </section>
  )
}

function StatsChart() {
  return (
    <article className="card chart-card">
      <div className="card-header">
        <div><h3>Qo'ng'iroqlar statistikasi</h3><p>Oxirgi 7 kunlik natijalar</p></div>
        <div className="legend"><span><i className="answered" />Javob berildi</span><span><i className="missed" />Javobsiz</span><button><MoreHorizontal /></button></div>
      </div>
      <div className="chart">
        <div className="y-axis">{['3K', '2K', '1K', '0'].map((item) => <span key={item}>{item}</span>)}</div>
        <div className="chart-area">
          <div className="grid-lines"><i /><i /><i /><i /></div>
          <svg viewBox="0 0 700 230" preserveAspectRatio="none" aria-label="Qo'ng'iroqlar grafigi">
            <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#52d6a3" stopOpacity=".25" /><stop offset="100%" stopColor="#52d6a3" stopOpacity="0" /></linearGradient></defs>
            <path className="area" d="M0 172 C70 145 80 155 120 137 S200 110 240 118 S320 98 360 82 S430 105 480 69 S560 74 600 48 S660 35 700 15 L700 230 L0 230Z" />
            <path className="line-main" d="M0 172 C70 145 80 155 120 137 S200 110 240 118 S320 98 360 82 S430 105 480 69 S560 74 600 48 S660 35 700 15" />
            <path className="line-second" d="M0 204 C65 194 85 200 120 188 S195 185 240 174 S310 180 360 160 S430 168 480 146 S555 153 600 137 S665 142 700 122" />
          </svg>
          <div className="x-axis">{['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'].map((day) => <span key={day}>{day}</span>)}</div>
        </div>
      </div>
    </article>
  )
}

function BalanceCard() {
  return (
    <article className="card balance-card">
      <div className="card-header"><div><h3>Hisob balansi</h3><p>Joriy tarif va mablag'</p></div><button><MoreHorizontal /></button></div>
      <div className="balance-ring"><div><span>Balans</span><strong>1,850,000</strong><small>so'm</small></div></div>
      <div className="tariff"><div><span>Faol tarif</span><strong>Biznes</strong></div><div><span>Qolgan limit</span><strong>18,500 daq.</strong></div></div>
      <button className="fill-button"><WalletCards /> Hisobni to'ldirish</button>
    </article>
  )
}

function CampaignsCard() {
  return (
    <article className="card campaigns">
      <div className="card-header"><div><h3>Faol kampaniyalar</h3><p>Jarayondagi qo'ng'iroqlar</p></div><a href="#" onClick={stopLink}>Barchasini ko'rish <ChevronRight /></a></div>
      <div className="campaign-list">
        {campaigns.map(({ name, date, current, total, progress, tone, icon: Icon }) => (
          <div className="campaign-row" key={name}>
            <span className={`campaign-icon ${tone}`}><Icon /></span>
            <div className="campaign-name"><strong>{name}</strong><span>{date}</span></div>
            <div className="campaign-progress"><span><i style={{ width: `${progress}%` }} /></span><b>{progress}%</b></div>
            <div className="campaign-count"><strong>{current} / {total}</strong><span>Qo'ng'iroqlar</span></div>
            <em>Faol</em><button><MoreHorizontal /></button>
          </div>
        ))}
      </div>
    </article>
  )
}

function ActivityCard() {
  return (
    <article className="card activity">
      <div className="card-header"><div><h3>So'nggi faollik</h3><p>Real-time yangilanishlar</p></div><span className="live"><i /> Jonli</span></div>
      <div className="activity-list">
        {activities.map(({ phone, detail, time, tone, icon: Icon }) => (
          <div key={`${phone}-${time}`}><span className={tone}><Icon /></span><p><strong>{phone}</strong><small>{detail}</small></p><time>{time}</time></div>
        ))}
      </div>
    </article>
  )
}

function Dashboard() {
  return (
    <div className="content">
      <section className="welcome">
        <div><p>JUMA, 12-IYUN</p><h1>Xayrli kun, Fazliddin!</h1><span>Bugungi qo'ng'iroqlar qanday ketayotganini kuzating.</span></div>
        <button className="date-button"><CalendarDays /> Bu hafta <ChevronDown /></button>
      </section>
      <MetricCards />
      <section className="dashboard-grid"><StatsChart /><BalanceCard /></section>
      <section className="dashboard-grid lower"><CampaignsCard /><ActivityCard /></section>
    </div>
  )
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const closeOnDesktop = () => window.innerWidth > 760 && setSidebarOpen(false)
    window.addEventListener('resize', closeOnDesktop)
    return () => window.removeEventListener('resize', closeOnDesktop)
  }, [])

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main"><Topbar onMenu={() => setSidebarOpen(true)} /><Dashboard /></main>
    </div>
  )
}
