<footer class="site-footer">
  <div class="editorial-shell">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="brand-row">
          <span class="logo-icon" aria-hidden="true">&#9670;</span>
          <span class="footer-title">Spain Electoral Forecast</span>
        </div>
        <p class="footer-desc">
          Proyeccion electoral para el Congreso de los Diputados basada en datos del Spain Electoral Project.
        </p>
      </div>

      <div class="footer-links">
        <div class="footer-col">
          <h4>Secciones</h4>
          <ul>
            <li><a href="/">Inicio</a></li>
            <li><a href="/provincias">Provincias</a></li>
            <li><a href="/metodologia">Metodologia</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Proyecto</h4>
          <ul>
            <li>
              <a href="https://spainelectoralproject.com/" target="_blank" rel="noopener">
                Spain Electoral Project
              </a>
            </li>
            <li>
              <a href="https://github.com/hmeleiro/spain-electoral-forecast" target="_blank" rel="noopener">
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>
        &copy; 2026
        <a href="https://spainelectoralproject.com/" target="_blank" rel="noopener">
          Spain Electoral Project
        </a>.
        Contenido disponible bajo licencia abierta.
      </p>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    background: var(--color-text);
    color: #d1d5db;
    margin-top: auto;
    padding: 4rem 0 2rem;
  }

  .footer-inner {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: grid;
    gap: 3rem;
    grid-template-columns: 1fr auto;
    padding-bottom: 2.5rem;
  }

  .brand-row {
    align-items: center;
    display: flex;
    gap: 0.5rem;
  }

  .logo-icon {
    color: var(--color-accent);
    font-size: 1.25rem;
    line-height: 1;
  }

  .footer-title {
    color: #ffffff;
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1;
  }

  .footer-desc {
    font-size: 0.875rem;
    line-height: 1.6;
    margin-top: 0.75rem;
    max-width: 24rem;
  }

  .footer-links {
    display: flex;
    gap: 3rem;
  }

  .footer-col h4 {
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 0 0 1rem;
    text-transform: uppercase;
  }

  .footer-col ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .footer-col li {
    margin-bottom: 0.5rem;
  }

  .footer-col a {
    color: #9ca3af;
    font-size: 0.875rem;
    text-decoration: none;
    transition: color var(--transition);
  }

  .footer-col a:hover {
    color: #ffffff;
  }

  .footer-bottom {
    padding-top: 1.5rem;
  }

  .footer-bottom p {
    color: #6b7280;
    font-size: 0.75rem;
    margin: 0;
  }

  .footer-bottom a {
    color: #6b7280;
    text-decoration: none;
    transition: color var(--transition);
  }

  .footer-bottom a:hover {
    color: #9ca3af;
  }

  @media (max-width: 48rem) {
    .footer-inner {
      grid-template-columns: 1fr;
    }

    .footer-links {
      flex-direction: column;
      gap: 1.5rem;
    }
  }
</style>
