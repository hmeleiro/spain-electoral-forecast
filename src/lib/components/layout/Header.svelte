<script lang="ts">
  export let activePath = '/';
</script>

<header class="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
  <div class="editorial-shell flex h-16 items-center justify-between gap-4">
    <a href="/" class="flex items-center gap-2 text-[var(--color-text)] no-underline">
      <span class="text-xl text-[var(--color-accent)]">◆</span>
      <div class="text-lg font-bold leading-none">
        Spain Electoral Forecast
      </div>
    </a>

    <nav class="flex flex-wrap gap-1 text-sm font-medium">
      <a class:active={activePath === '/'} href="/">Inicio</a>
      <a class:active={activePath.startsWith('/provincias')} href="/provincias">Provincias</a>
      <a class:active={activePath.startsWith('/metodologia')} href="/metodologia">Metodologia</a>
    </nav>
  </div>
</header>

<style>
  nav a {
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    padding: 0.5rem 0.75rem;
    transition: all var(--transition);
  }

  nav a.active,
  nav a:hover {
    background: var(--color-accent-soft);
    color: var(--color-accent);
  }
</style>
