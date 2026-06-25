<script lang="ts">
  export let compact = false;
</script>

<section class:panel={!compact} class={compact ? 'text-sm leading-6 text-[#5e5a54]' : 'p-5 text-sm leading-6 text-[#5e5a54]'}>
  <p>
    Estimacion basada en outputs ya calculados del pipeline a partir de microdatos del CIS.
    Los intervalos muestran incertidumbre del modelo y las simulaciones agregan escenarios posibles
    de reparto de escaños; no son una prediccion determinista.
  </p>
</section>
