<script setup lang="ts">
/**
 * App icon set, backed by Lucide (https://lucide.dev). Only the icons listed here
 * are bundled; add a name to `icons` to use a new one.
 */
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bot,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flame,
  History,
  Inbox,
  ListChecks,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  MailPlus,
  MessageSquareText,
  PhoneOff,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  TriangleAlert,
  User,
  Workflow,
} from '@lucide/vue'

const icons = {
  'arrow-right': ArrowRight,
  'badge-check': BadgeCheck,
  'banknote': Banknote,
  'bot': Bot,
  'building': Building2,
  'calendar': CalendarDays,
  'calendar-clock': CalendarClock,
  'check': Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'alert-circle': CircleAlert,
  'alert-triangle': TriangleAlert,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  'clock': Clock,
  'copy': Copy,
  'external': ExternalLink,
  'eye': Eye,
  'eye-off': EyeOff,
  'file-text': FileText,
  'filter': Filter,
  'flame': Flame,
  'history': History,
  'inbox': Inbox,
  'list-checks': ListChecks,
  'lock': Lock,
  'logout': LogOut,
  'mail': Mail,
  'mail-plus': MailPlus,
  'message': MessageSquareText,
  'phone-off': PhoneOff,
  'refresh': RefreshCw,
  'send': Send,
  'sparkle': Sparkles,
  'spinner': LoaderCircle,
  'tag': Tag,
  'user': User,
  'workflow': Workflow,
} as const

export type IconName = keyof typeof icons

const props = withDefaults(defineProps<{ name: IconName, size?: number, strokeWidth?: number }>(), {
  size: 16,
  strokeWidth: 2,
})
</script>

<template>
  <component
    :is="icons[props.name]"
    :size="props.size"
    :stroke-width="props.strokeWidth"
    aria-hidden="true"
    :class="{ 'animate-spin': props.name === 'spinner' }"
  />
</template>
