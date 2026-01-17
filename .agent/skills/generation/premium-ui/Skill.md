---
name: premium-ui-generation
description: Generation skill for creating high-end, themed React components with Glassmorphism, animations, and responsive layouts for VillageLink.
---

# Premium UI Generation Skill ✨

This skill guides the generation of "Wow-factor" UI components using the VillageLink design system (Tailwind CSS, Lucide Icons, Framer Motion style).

## Design Principles
- **Aesthetics**: Glassmorphism (bg-white/10 backdrop-blur), vibrant gradients (green-600 to emerald-600).
- **Typography**: Clear hierarchy, uppercase tracking-widest for labels.
- **Interactivity**: Hover scales, pulse animations for active states, smooth transitions.
- **Micro-interactions**: Subtle shadows, rounded corners (rounded-3xl or rounded-xl).

## UI Prompt Templates

### 1. Dashboard Stat Card
"Create a premium stat card for [CATEGORY] with a [COLOR] Lucide icon, glassy background, and a subtle entrance animation. Include a trend indicator."

### 2. Transaction List
"Design a clean, mobile-first transaction list for [TYPE] using a vertical timeline or card-stack layout. Ensure icons represent the status (DONE/PENDING)."

### 3. Hero Section
"Generate a hero section for [FEATURE] with a large [IMAGE_TYPE] placeholder, a bold heading in emerald-600, and a dual-button set (primary emerald, secondary outline)."

## Common Component Patterns

### Glass Button
```tsx
<button className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-xl transition-all">
  {label}
</button>
```

### Whisk-Inspired Ticket Stub
```tsx
<div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-whisk-float rounded-3xl">
  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-green-600"></div>
  {/* Content */}
</div>
```
