<script lang="ts">
  import ModelNotes from '$lib/components/layout/ModelNotes.svelte';
</script>

<svelte:head>
  <title>Metodologia · Spain Electoral Forecast</title>
</svelte:head>

<section class="editorial-shell py-10 md:py-14">
  <div class="max-w-3xl">
    <p class="eyebrow">Metodologia</p>
    <h1 class="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">
      Cómo leer estas estimaciones
    </h1>
    <p class="mt-5 text-lg leading-8 text-[#4d4944]">
      Esta pagina recoge notas sobre la metodología, la fuente, el tratamiento agregado y provincial,
      las simulaciones y los limites de interpretacion del modelo.
    </p>
  </div>

  <div class="mt-10 grid gap-5 md:grid-cols-2">
    <section class="panel p-5">
      <h2 class="text-xl font-black text-[#171717]">Fuente: microdatos CIS</h2>
      <p class="mt-3 text-sm leading-6 text-[#5e5a54]">
        Las estimaciones están basadas en los microdatos publicados por el CIS de sus barómetros mensuales. 
      </p>
    </section>

    <section class="panel p-5">
      <h2 class="text-xl font-black text-[#171717]">Estimacion agregada</h2>
      <p class="mt-3 text-sm leading-6 text-[#5e5a54]">
        Las estimaciones se realizan usando el método <a href = "https://vota.spainelectoralproject.com/">VOTA (Vote Outcome Transfer Algorithm)</a>. Este algoritmo permite realizar estimaciones de voto a nivel nacional mediante el tratamiento de las transferencias de voto registradas en una encuesta.
      </p>
    </section>

    <section class="panel p-5">
      <h2 class="text-xl font-black text-[#171717]">Estimacion provincial</h2>
      <p class="mt-3 text-sm leading-6 text-[#5e5a54]">
        Para llegar a estimaciones provinciales, se realiza una proyección de la estimación nacional a cada provincia basada en los patrones territoriales de voto histórico de cada partido.
      </p>
    </section>

    <section class="panel p-5">
      <h2 class="text-xl font-black text-[#171717]">Simulaciones e incertidumbre</h2>
      <p class="mt-3 text-sm leading-6 text-[#5e5a54]">
      El método VOTA introduce incertidumbre en varios pasos del proceso.
      Este acercamiento probabilístico permite generar un conjunto de escenarios posibles, facilitando 
      la estimación de la probabilidad de diferentes sucesos (por ejemplo: la probabilidad de que un partido o un bloque alcance la 
      mayoría absoluta).
      </p>
    </section>
  </div>
</section>
