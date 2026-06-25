<script lang="ts">
  import type { PartyEstimate } from '$lib/data/schema';

  export let parties: PartyEstimate[] = [];
  export let includeNonElectoral = false;

  $: visibleParties = parties.filter((party) => includeNonElectoral || party.isElectoral);
</script>

<div class="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#4d4944]">
  {#each visibleParties as party}
    <div class="flex items-center gap-2">
      <span class="h-2.5 w-2.5 rounded-full" style={`background:${party.color}`}></span>
      <span>{party.label}</span>
    </div>
  {/each}
</div>
