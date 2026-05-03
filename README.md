# Design Handoff: PowerWatch Nigeria — Redesign Inspiration

## Overview

This package is a **design inspiration reference** for the PowerWatch Nigeria website redesign. The HTML prototype included here demonstrates a bold, dark civic-tech visual direction for a Nigerian electricity outage tracking platform.

> ⚠️ **Important:** This is NOT a pixel-perfect spec to replicate. Use it as creative inspiration — adopt the visual language, color palette, typography, and interaction patterns that make sense for the actual live site's features. Where the prototype's features differ from the real site, adapt the design language to fit what actually exists.

---

## About the Design Files

`PowerWatch Nigeria.html` is an **interactive HTML prototype** built as a design exploration. Open it in a browser to experience the intended look and feel. It contains mock data and simplified versions of features — the real site will have richer functionality, real API data, and different page structures.

**Your job:** Use this as a mood board and design system reference. Extract the visual DNA — colors, type, spacing, card styles, glow effects — and apply them thoughtfully to the real codebase's actual pages and features.

---

## Visual DNA — What to Carry Over

These are the design decisions worth adopting wholesale:

### 1. Color System

```css
/* Backgrounds — layered depth */
--bg:    #0B0F1A   /* Page base */
--bg2:   #111827   /* Cards, panels */
--bg3:   #1a2235   /* Elevated surfaces */

/* Text */
--text:  #F0F4FF   /* Primary */
--text2: #8B95B0   /* Secondary / muted */
--text3: #4A5470   /* Tertiary / disabled */

/* Borders */
--border: rgba(255,255,255,0.07)

/* Primary accent — Nigerian Green */
--green: #00A651
--green-glow: rgba(0,166,81,0.25)

/* Status indicators */
--power-on:      #00A651   /* Green */
--power-partial: #F5A623   /* Amber */
--power-off:     #E53935   /* Red */
```

### 2. Typography

```css
/* Import */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

--font-display: 'Syne', sans-serif;   /* All headings, stat numbers, labels */
--font-body:    'DM Sans', sans-serif; /* All body text, UI controls */

/* Key sizes */
Hero headline:   clamp(40px, 10vw, 88px)  Syne 800  tracking -0.04em
Page title:      clamp(24px, 4vw, 40px)   Syne 800  tracking -0.03em
Section heading: clamp(28px, 5vw, 48px)   Syne 800  tracking -0.03em
Stat value:      32px                     Syne 800
Eyebrow label:   11px                     Syne 700  uppercase tracking 0.15em
Body:            14–17px                  DM Sans 300–500  line-height 1.6
```

### 3. Background Texture

Apply this subtle grid to the page body — it adds depth without being distracting:

```css
body::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### 4. Glow Effects

Used sparingly on CTAs, icons, and status indicators:

```css
/* Primary CTA button */
box-shadow: 0 0 32px rgba(0,166,81,0.3);

/* Logo / icon */
box-shadow: 0 0 16px rgba(0,166,81,0.25);

/* Status dot glow (swap color per status) */
box-shadow: 0 0 12px rgba(0,166,81,0.5);
```

### 5. Card Style

```css
.card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 18px–28px;
}

/* Hover state */
.card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(0,166,81,0.25);
}
```

### 6. Status Badge (Pill)

```css
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: <statusColor> + 18;   /* e.g. #00A65118 */
  border: 1px solid <statusColor> + 40;
  border-radius: 100px;
  padding: 3px 9px;
  font-size: 11px; font-weight: 600;
  color: <statusColor>;
}
/* Animated dot inside badge */
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: <statusColor>;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
```

### 7. Navbar

```css
nav {
  position: fixed; top: 0; left: 0; right: 0;
  height: 60px;
  background: rgba(11,15,26,0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
/* Active nav link */
.nav-link.active {
  background: rgba(0,166,81,0.1);
  border: 1px solid rgba(0,166,81,0.3);
  color: #00A651;
  border-radius: 8px;
}
```

### 8. Animations

```css
/* Page-load stagger (apply to hero children) */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Stagger each child: delay 0ms, 100ms, 200ms, 300ms, 400ms */

/* Map location ping */
@keyframes mapPing {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(3); opacity: 0; }
}

/* Panel slide-in */
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

---

## Page-by-Page Inspiration Notes

### Home / Landing Page

The prototype shows a **centered full-bleed hero** (Variant A) with:
- A radial glow orb behind the headline
- Concentric decorative rings
- Gradient headline text (green → amber)
- Staggered fade-up entrance animations
- A horizontal status ticker scrolling state-by-state uptime

**Adapt for the real site:** Keep the hero structure and visual energy. Replace mock stats with real data. If the real home page has different sections or CTAs, apply the same card/type/color treatment.

---

### Dashboard / Map Page

The prototype shows a **KPI card row + tabbed map/list view**. Key patterns:
- KPI cards with a colored top border accent matching the metric's status
- An interactive dot map with pulsing location pins
- A side panel that slides in with state details on click
- Tabs: Map / State List / Live Reports

**Adapt for the real site:** If the real site uses Mapbox, Leaflet, or another map library, apply the dot/ping/glow visual treatment to real markers. Use the KPI card style for whatever metrics the real dashboard exposes. The tab pattern works for any grouped content.

---

### Report Outage Form

The prototype shows a **3-step wizard**:
1. Issue type selector (large tap-target option cards)
2. Location + DISCO text inputs
3. Review + submit

**Adapt for the real site:** If the real form has different fields or steps, apply the same card treatment, progress bar, and button styles. The large option-card pattern for step 1 is particularly worth keeping — it's mobile-friendly and clear.

---

## Prompt for Claude Code

Paste this into Claude Code:

```
I have a design inspiration package for a redesign of powerwatch-ng.vercel.app.
The README.md describes a visual design language — colors, typography, card styles,
glow effects, animations — that I want to apply to the live site.

The HTML file (PowerWatch Nigeria.html) is an interactive prototype showing the
intended look and feel. Open it in a browser as a visual reference.

IMPORTANT: This is inspiration, not an exact spec. The prototype uses mock data and
may have different features than the live site. Your job is to:

1. Explore the existing codebase — understand the framework, routing, and component structure
2. Extract the visual DNA from the README (colors, fonts, card styles, glow effects, animations)
3. Apply that visual language to the ACTUAL pages and features of the live site
4. Where the prototype's features don't match the real site, adapt the design language
   to fit what actually exists — don't add fake features or mock data
5. Prioritize: dark background system, Syne + DM Sans fonts, #00A651 green accent,
   glow effects on CTAs, status badge pills, subtle grid texture on body,
   frosted-glass navbar, and the card hover style

Start with the homepage, then the main dashboard/map page, then any forms.
Use the README tokens for exact hex values, font sizes, and spacing.
```

---

## Files in This Package

| File | Purpose |
|---|---|
| `PowerWatch Nigeria.html` | Interactive prototype — open in browser as visual reference |
| `tweaks-panel.jsx` | Prototype helper — ignore for production |
| `README.md` | This document — design language spec and inspiration notes |
