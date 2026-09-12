function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">PF</div>
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Personal Finance Copilot</h1>
        </div>
      </div>

      <nav className="header-nav" aria-label="Dashboard sections">
        <a className="active" href="#overview">Overview</a>
        <a href="#transactions">Transactions</a>
        <a href="#add-transaction">Add transaction</a>
      </nav>

      <div className="profile-chip">
        <span className="profile-avatar" aria-hidden="true">AM</span>
        <span>
          <strong>Aarav Mehta</strong>
          <small>INR account</small>
        </span>
      </div>
    </header>
  )
}

export default DashboardHeader
