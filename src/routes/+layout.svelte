<script lang="ts">
  import { page } from '$app/stores';
  import Footer from '$lib/components/layout/Footer.svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import '../app.css';

  let { children } = $props();
</script>

<Header activePath={$page.url.pathname} />

<main>
  {@render children()}
</main>

<Footer />
