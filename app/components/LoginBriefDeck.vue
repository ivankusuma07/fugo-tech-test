<script setup lang="ts">
/**
 * Decorative deck of sample brief cards on the login page. The front card flies
 * off and goes to the back every few seconds (or on click); hovering pauses it.
 * No auto-advance under prefers-reduced-motion. Sample data only.
 */
type Priority = 'High' | 'Medium' | 'Low'

interface SampleBrief {
  number: string
  company: string
  priority: Priority
  category: string
  budget: string
  summary: string
  missing: number
  score: number
}

const briefs: SampleBrief[] = [
  { number: '#BR-0042', company: 'PT Sinar Kopi Nusantara', priority: 'High', category: 'Website', budget: 'Rp25–50 jt', summary: 'Website company profile + katalog produk kopi, live sebelum peluncuran produk baru.', missing: 2, score: 86 },
  { number: '#BR-0043', company: 'Klinik Gigi Senyum Sehat', priority: 'Medium', category: 'Mobile App', budget: 'Rp50–100 jt', summary: 'Aplikasi booking jadwal dokter dan pengingat kontrol untuk tiga cabang klinik.', missing: 3, score: 64 },
  { number: '#BR-0044', company: 'LogiTrans Ekspres', priority: 'High', category: 'AI Automation', budget: '> Rp100 jt', summary: 'Otomasi balasan WhatsApp dan pelacakan resi untuk sekitar 2.000 pesanan per hari.', missing: 1, score: 92 },
  { number: '#BR-0045', company: 'Batik Laras Asri', priority: 'Low', category: 'Branding', budget: '< Rp10 jt', summary: 'Refresh logo dan panduan warna untuk toko online batik tulis, tanpa tenggat jelas.', missing: 4, score: 31 },
  { number: '#BR-0046', company: 'Warung Rasa Senja', priority: 'Medium', category: 'Social Media', budget: 'Rp10–25 jt', summary: 'Konten Instagram dan TikTok bulanan untuk pembukaan cabang baru bulan depan.', missing: 2, score: 58 },
]

const tone: Record<Priority, { stamp: string, bar: string, edge: string }> = {
  High: { stamp: 'border-[#B42318] text-[#B42318] bg-[#FEF0EE]', bar: 'bg-[#D92D20]', edge: 'border-t-[#D92D20]' },
  Medium: { stamp: 'border-[#8A5300] text-[#8A5300] bg-[#FFF4DB]', bar: 'bg-[#E0A100]', edge: 'border-t-[#E0A100]' },
  Low: { stamp: 'border-[#3F4652] text-[#3F4652] bg-[#EEF0F3]', bar: 'bg-[#8A8D94]', edge: 'border-t-[#8A8D94]' },
}

// order[0] is the front card
const order = ref(briefs.map((_, i) => i))
const leaving = ref<number | null>(null)
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let busy = false

function positionOf(i: number) {
  return order.value.indexOf(i)
}

/** Fan the cards behind the front one: offset, tilt and shrink a little each. */
function cardStyle(i: number) {
  const p = positionOf(i)
  if (leaving.value === i) {
    return { transform: 'translate(-58%, -6%) rotate(-14deg)', zIndex: 50, opacity: 1 }
  }
  const visible = Math.min(p, 3)
  return {
    transform: `translate(${visible * 18}px, ${visible * -8}px) rotate(${visible * 3.5}deg) scale(${1 - visible * 0.04})`,
    zIndex: 40 - p,
    opacity: p > 3 ? 0 : 1,
  }
}

function next() {
  if (busy) return
  busy = true
  const front = order.value[0]!
  leaving.value = front // fly out to the side, still on top
  setTimeout(() => {
    order.value = [...order.value.slice(1), front] // then tuck it in at the back
    leaving.value = null
    setTimeout(() => (busy = false), 450)
  }, 380)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!paused.value && !document.hidden) next()
  }, 3200)
})
onBeforeUnmount(() => clearInterval(timer))

const frontIndex = computed(() => order.value[0]!)
</script>

<template>
  <div
    aria-hidden="true"
    class="flex flex-col items-start gap-4"
  >
    <div
      class="relative h-[236px] w-full max-w-[400px] cursor-pointer select-none"
      @click="next"
      @mouseenter="paused = true"
      @mouseleave="paused = false"
    >
      <div
        v-for="(b, i) in briefs"
        :key="b.number"
        class="absolute inset-x-0 top-6 flex origin-bottom-left flex-col gap-3 rounded-2xl border border-t-4 border-[#E4E2DC] bg-[#FBFAF7] p-[18px] text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.65)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
        :class="tone[b.priority].edge"
        :style="cardStyle(i)"
      >
        <div class="flex items-center justify-between gap-3 font-mono text-[11px] tracking-[0.04em] text-muted">
          <span>{{ b.number }}</span>
          <span class="inline-flex items-center gap-1 text-ok">
            <AppIcon
              name="sparkle"
              :size="12"
            />
            DIRINGKAS AI
          </span>
        </div>

        <div class="flex items-start justify-between gap-3">
          <span class="font-display text-[19px] leading-tight font-bold tracking-[-0.01em]">{{ b.company }}</span>
          <!-- Stamp re-pops each time this card reaches the front -->
          <span
            :key="frontIndex === i ? 'front' : 'back'"
            class="flex-none -rotate-6 rounded-md border-2 px-2 py-0.5 text-[13px] font-extrabold tracking-[0.06em] uppercase"
            :class="[tone[b.priority].stamp, frontIndex === i ? 'anim-stamp' : '']"
          >{{ b.priority }}</span>
        </div>

        <p class="text-[13px] leading-normal text-ink-2">
          {{ b.summary }}
        </p>

        <div class="flex flex-wrap gap-1.5">
          <span class="rounded-full border border-[#D6D3CC] px-2.5 py-0.5 text-xs">{{ b.category }}</span>
          <span class="rounded-full border border-[#D6D3CC] px-2.5 py-0.5 text-xs">{{ b.budget }}</span>
          <span class="rounded-full bg-[#FFF4DB] px-2.5 py-0.5 text-xs text-[#8A5300]">{{ b.missing }} info kurang</span>
        </div>

        <div class="flex items-center gap-2.5">
          <span class="font-mono text-[11px] text-muted">SKOR</span>
          <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEECE7]">
            <span
              class="block h-full rounded-full transition-[width] delay-200 duration-700 ease-out"
              :class="tone[b.priority].bar"
              :style="{ width: frontIndex === i ? `${b.score}%` : '0%' }"
            />
          </span>
          <span class="w-7 text-right font-mono text-[11px] font-semibold tabular-nums">{{ b.score }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3 text-xs text-[#8A8D94]">
      <span class="flex gap-1.5">
        <span
          v-for="(b, i) in briefs"
          :key="b.number"
          class="h-1.5 rounded-full transition-all duration-500"
          :class="frontIndex === i ? 'w-5 bg-white' : 'w-1.5 bg-[#4A4D55]'"
        />
      </span>
      Ketuk kartu untuk brief berikutnya
    </div>
  </div>
</template>
