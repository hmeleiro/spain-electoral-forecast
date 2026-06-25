<script lang="ts">
  export let title = 'No se pudieron cargar los datos';
  export let message = 'La web usara datos mock si DuckDB-WASM o los Parquet no estan disponibles.';
</script>

<div class="panel border-[#c98172] bg-[#fff6f2] p-5">
  <p class="text-sm font-bold text-[#8c2d24]">{title}</p>
  <p class="mt-2 text-sm leading-6 text-[#5e5a54]">{message}</p>
</div>
