# 17 — UI Design System

> Principles and tokens for the consoles and parent web app. Implemented for the prototype in `prototype/assets/ui.css`; production should lift the tokens directly into the design system / Tailwind theme ([12](12-tech-stack-infra.md)).

## 1. Direction

The first prototype leaned on saturated green fills and heavy shadows. The revised look is **quiet, crisp and professional**, closer to a finance/operations tool than a consumer app:

1. **Content first.** Neutral surfaces; colour is used sparingly so that status and key numbers stand out.
2. **One accent.** Deep green (brand) for primary actions and active navigation. Everything else is grey.
3. **Colour means state.** Green/amber/red are reserved for status (healthy/degraded/down, paid/due/overdue). Never decoration.
4. **Hairlines over shadows.** 1px borders and very soft shadows; flat cards on a light grey canvas.
5. **Numbers are the hero.** Tabular numerals, right-aligned amounts, large KPI values, muted labels.
6. **Dense but calm.** Operations users scan tables all day; generous padding on cards, compact rows in tables.

## 2. Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#f5f6f8` | App canvas |
| `--surface` | `#ffffff` | Cards, tables, inputs |
| `--line` / `--line-2` | `#e6e8ec` / `#eef0f3` | Borders / row separators |
| `--ink` / `--ink-2` | `#0f172a` / `#334155` | Primary / secondary text |
| `--muted` / `--faint` | `#64748b` / `#94a3b8` | Labels, captions, axes |
| `--brand` | `#0b6b53` | Primary buttons, active nav, focus |
| `--side` | `#0b1512` | Sidebar background |
| Status | ok `#22a45d` · warn `#e0a100` · bad `#d92d20` · info `#3b6fe0` | Each with `-bg` and `-line` tints for banners/chips |
| Radius | 10 px cards, 8 px controls, 99 px chips | |
| Shadow | `0 1px 2px rgba(16,24,40,.05)` | Cards only |

**Typography:** Inter (system fallback), 13.5 px base; 22 px KPI numerals at 650 weight with −0.02em tracking; 11 px uppercase eyebrow labels at +0.1em; `font-variant-numeric: tabular-nums` on all money and counts.

## 3. Layout

- **Top bar:** role switcher (segmented), command palette trigger (⌘K), cross-app link, user.
- **Sidebar:** dark, grouped navigation (Monitor / Finance / Manage), line icons, count badges (amber = needs attention, red = incident).
- **Page header:** title + one-line subtitle on the left; primary actions on the right.
- **Content:** KPI row → primary visual → supporting cards; a 12-column-like grid with 14 px gaps.

## 4. Components

KPI card · card · table (sticky header, zebra off, hover row) · chip (ok/warn/bad/info/neutral) · status dot (with pulse for live) · segmented control · banner (info/ok/warn/bad with left accent) · drawer · modal · toast · command palette · stepper · progress bar · inline SVG charts (bar, stacked bar, donut, waterfall, sparkline). Charts use the stream colours from [15](15-platform-revenue.md) and status colours only for status.

## 5. Accessibility and low-data

- Contrast ≥ 4.5:1 for text; status is never colour-only (always paired with a label or icon).
- Visible focus rings; full keyboard operation including the command palette.
- Respect `prefers-reduced-motion`: the service map's moving dots pause and static link states remain readable.
- Parent app stays light: no web fonts beyond system fallback in low-data mode; charts are inline SVG, no chart library payload.

## 6. Applying it

Platform, school and teacher consoles share one shell and component set. The parent app and USSD simulator (`prototype/index.html`) load the same `assets/ui.css` for tokens, top bar, chips, buttons and form controls; only device-frame styling is local and scoped to the frame. Production should implement the tokens as a theme (Tailwind config or CSS variables) and the components in the shared UI package.

## 7. Parent app (mobile PWA)

Same language as the consoles, scaled for a 360 px screen and thumb use:

| Element | Rule |
|---------|------|
| Canvas / cards | `--bg` canvas, white cards, 1px hairline, 12 px radius, no gradients |
| Fee summary | Name + class, status chip (paid / part paid / unpaid), **balance as the hero numeral** (30 px), thin progress bar, one primary button |
| Progress insight (AI) | White card with a 3 px left accent: amber = needs attention, green = good news; always shows "Reviewed by [teacher]" and a *Why am I seeing this?* evidence toggle ([09](09-ai-study-engine.md)) |
| Results | Three KPI cards (average, grade, position); subject rows with a 6 px bar and a dark tick for the class average; grade chip uses status colour |
| Attendance | Calendar cells tinted by state (present / absent / late / upcoming) with a dot legend, not emoji |
| Navigation | 4 tabs, 21 px line icons, brand colour + top indicator on the active tab |
| Avatar | Neutral ink circle with initials; brand colour is reserved for actions and active state |
| Inputs | 42 px tall, 10 px radius, brand focus ring; large tap targets (≥ 42 px) |
| Toast | Ink background, bottom of the device screen |

## 8. USSD simulator and "Parent's phone"

- **Feature phone:** graphite body with a flat 1px edge, soft shadow, and the LCD kept green and monospace for authenticity. Controls use tokens: brand for *Send*, status green and red for *Dial* and *End*. The 160-character counter and the 120 s idle timer stay visible because they shape the real menu copy ([06](06-ussd-spec.md)).
- **MoMo prompt:** shown as an amber state card (a pending action awaiting the user) with *Approve* (brand), *Decline* (outline) and a red *Simulate: insufficient funds* demo control.
- **SMS inbox:** neutral bubbles with a muted sender/time label; these are the exact strings the alert service sends ([08](08-alerts.md)).

Deep links for screenshots: `index.html#scene=home|results|fees|pay|payform|attendance|more|settings|ussd|ussd-menu`.
