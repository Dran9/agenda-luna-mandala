export function ControlRoute() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <img className="sidebar-logo" src="/brand/luna-mandala-logo.svg" alt="Luna Mandala" />
        <nav aria-label="Admin">
          <a className="nav-item nav-item-active" href="/control">Control</a>
        </nav>
      </aside>
      <section className="workspace">
        <header className="page-header">
          <h1>Control</h1>
        </header>
      </section>
    </main>
  );
}
