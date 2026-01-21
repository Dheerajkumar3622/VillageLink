# UI Design Skill (Enterprise)

## Purpose

Design mobile-first, scalable UI flows optimized for conversion, accessibility, and performance.

## Principles

- **Mobile-First**: Design for the smallest screen first and scale up.
- **Progressive Disclosure**: Show primary actions first, bury complex features in menus.
- **Micro-Animations**: Enhance UX with subtle feedback loops.
- **Glassmorphism & Rich Aesthetics**: Use premium gradients and surface transparency.

## Constraints

- **Low-Bandwidth Optimization**: Ensure assets are compressed and lazy-loaded.
- **WCAG AA Compliance**: Mandatory for all interactive elements.
- **Design System Fidelity**: Do not invent new design tokens (colors, spacing, typography).

## Outputs

- **Screen Flow Diagram**: Visual map of the user journey.
- **Component List**: Reusable React/TSX components required.
- **Stitch-Compatible Prompt**: High-fidelity prompt for UI generation.

## Forbidden

- Hardcoded hex colors (use CSS variables).
- Inline styles (use external CSS or styled-components).
- Removing accessibility labels (aria-label).
