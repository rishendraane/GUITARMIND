# GuitarMind AI — Design System Specification

This document defines the core visual language, layout structure, color tokens, and components of the **GuitarMind AI** application.

---

## 1. Core Visual Aesthetics

GuitarMind AI is designed to look extremely premium, futuristic, and responsive. It uses a **sleek dark mode** by default, accented by vibrant neon glowing elements, responsive transitions, and glassmorphic panels.

### Color Tokens
* **Background Main**: `#0a0a0f` (deep space background)
* **Card Panels**: `#111118` (opaque dark panels)
* **Card Panels Elevated**: `#1a1a25` (slightly lighter card layers)
* **Input Elements**: `#252532` (dark fields with border-radius)
* **Primary Color**: `#7c3aed` (vibrant purple)
* **Primary Light**: `#a78bfa` (light violet)
* **Accent Color**: `#f59e0b` (neon amber)
* **Success Green**: `#10b981` (emerald green)
* **Error Red**: `#ef4444` (coral red)
* **Warning Orange**: `#f97316` (warning orange)

### Typography
* **Heading Font**: `Outfit` (sans-serif, geometric, futuristic weights)
* **Body Font**: `Inter` (sans-serif, highly legible spacing)
* **Mono Font**: `Consolas`, monospace (used for frequency counts, BPMs, tabs, and timers)

---

## 2. Design Components

### Glassmorphism Card (`.glass-card`)
A semi-transparent card container layered on top of the deep dark background:
* **Background**: `rgba(255, 255, 255, 0.03)`
* **Backdrop Filter**: `blur(16px)`
* **Border**: `1px solid rgba(255, 255, 255, 0.08)`
* **Box Shadow**: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`
* **Glow overlay**: Radial gradients at the center to create neon backlight glows.

### Glowing Buttons (`.btn`)
* **Primary Button**: Uses linear gradients from purple to blue (`linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)`) with scale hover transitions.
* **Secondary Button**: Outlined glass element that scales up and shines white on hover.
* **Danger Button**: Uses flat coral red with thick dark shadow borders.

### Tuner Needle & Visualizers
* A circular cents deflection needle (`#tuner-needle`) that rotates from `-50` to `+50` cents depending on mic frequency.
* Dynamic audio visualizer canvas elements that render green frequency peak lines in real-time.

---

## 3. Responsive Layout Guidelines
* **SPA Sticky Navigation**: A bottom navigation bar (`.bottom-navigation-bar`) made of frosted glass containing quick-access icons (Home, Tuner, Coach, Settings).
* **Grid Layouts**: Two-column layout on desktop view (`grid-cols-2`), wrapping to a single vertical column on mobile screens for ease of practice.
