<script setup lang="ts">
import { BUDGET_LABELS, type BudgetRange } from '#shared/constants'

defineProps<{
  name: string
  email: string
  companyName: string
  budgetRange: BudgetRange
  targetDate: string
  needs: string
}>()
</script>

<template>
  <section
    aria-labelledby="form-h"
    class="flex flex-col gap-4 rounded-2xl border border-line bg-white px-[22px] py-[18px]"
  >
    <h2
      id="form-h"
      class="flex items-center gap-2 text-base font-semibold"
    >
      <AppIcon
        name="file-text"
        :size="18"
        class="text-muted"
      />
      Data dari form
    </h2>
    <dl class="flex flex-col gap-3.5">
      <div class="flex flex-col gap-0.5">
        <dt class="flex items-center gap-1.5 text-[13px] text-muted">
          <AppIcon
            name="user"
            :size="14"
          />
          Nama
        </dt>
        <dd class="text-[15px] font-medium">
          {{ name }}
        </dd>
      </div>
      <div class="flex flex-col gap-0.5">
        <dt class="flex items-center gap-1.5 text-[13px] text-muted">
          <AppIcon
            name="mail"
            :size="14"
          />
          Email
        </dt>
        <dd class="text-[15px] font-medium break-all">
          <a
            :href="`mailto:${email}`"
            class="text-brand hover:text-brand-ink"
          >{{ email }}</a>
        </dd>
      </div>
      <div class="flex flex-col gap-0.5">
        <dt class="flex items-center gap-1.5 text-[13px] text-muted">
          <AppIcon
            name="building"
            :size="14"
          />
          Perusahaan
        </dt>
        <dd class="text-[15px] font-medium">
          {{ companyName }}
        </dd>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-0.5">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted">
            <AppIcon
              name="banknote"
              :size="14"
            />
            Budget
          </dt>
          <dd class="text-[15px] font-medium">
            {{ BUDGET_LABELS[budgetRange] }}
          </dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted">
            <AppIcon
              name="calendar"
              :size="14"
            />
            Target timeline
          </dt>
          <dd class="text-[15px] font-medium">
            {{ formatDate(targetDate) }}
          </dd>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <dt class="flex items-center gap-1.5 text-[13px] text-muted">
          <AppIcon
            name="message"
            :size="14"
          />
          Jenis kebutuhan
        </dt>
        <dd class="rounded-[10px] border border-line-soft bg-subtle px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line">
          {{ needs }}
        </dd>
      </div>
    </dl>
  </section>
</template>
