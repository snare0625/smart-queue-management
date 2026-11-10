# Paste-in prompt: Paper Calm design system

Copy the block below into any AI design or coding tool, then add your product brief after it.

---

```
Use the "Paper Calm" design system exactly. Borrow its look only — do not add features it implies.

FEEL: warm, soft, calm, information-dense. Warm off-white paper, frosted cards with a 1px white rim and a soft shadow, near-black ink, ONE accent used sparingly, every control fully rounded.

COLOUR
- Canvas #F3F1EF (app bg) · Surface #F9F7F5 (cards, sidebar) · Raised #FFFFFF (inputs, inset rows, table header, popovers) · Track #EBE9E7 (dividers, progress tracks, skeletons)
- Ink #161618 (text, numbers) · Ink-2 #4A4A4F (secondary) · Label #6B6B70 (labels, meta) · Hint #8A8A90 (placeholders only) · Dark #1A1A1C (primary buttons, active states, tooltip, toast)
- Accent --brand (default #FF6E3E, tint #FAE6E2) — themable token. Use for logo dot, focus ring, progress, selected highlight, link underline. Never body text.
- Status pills (text on bg), always with a word: positive #167A45/#DDF3E6 · warning #9A5B00/#F8ECDC · negative #C2362F/#FBE3E1 · neutral #4A4A4F/#EBE9E7
- Categories (colour/tint): green #24C462/#E0EDE6 · blue #3C82F4/#E0EAF6 · purple #8C5DF5/#ECE5F7 · amber #F29E08/#F8ECDC. Same colour per category everywhere.

TYPE: DM Sans only, weights 400 and 500 (no bold), tabular numbers.
Page title 28/34 · hero number 36/40 · KPI 26 · card title 15/500 · body 14/20 (minimum) · control 13 · label 12 Label colour · pill 12/500 · micro 11. Tracking -0.01em on large numbers/titles.

SHAPE & DEPTH
- Radius: card 20 · popover 16 · inset row/table container 12 · kbd 6 · ALL controls 999 (buttons, inputs, selects, pills, tabs, nav, avatars, icon chips).
- Card: Surface bg, 1px rgba(255,255,255,.9) rim, shadow 0 1px 2px rgba(20,20,20,.04), 0 8px 24px -12px rgba(20,20,20,.08). Hover deepens slightly. No heavy shadows.
- Spacing 4/8/12/16/20/24/32; card padding 20; grid gap 16; page padding 32.
- Focus ring: 2px accent outline, 2px offset, everywhere.

COMPONENTS
- Primary button: Dark pill, white 14/500, 40h. Secondary: white pill, ink text, 1px hairline.
- Segmented control/tabs: white pill track; active item = Dark pill with white text that slides between items.
- Inputs/filters/search: white pills; search has a soft shadow and a ⌘K kbd chip.
- KPI tile: label + tinted circular icon chip top row, big value, small sub-line; whole tile clickable.
- Table: inside a card; white rounded header row with 12px label sort buttons; 48px rows, track dividers, hover white, money right-aligned.
- Inset rows (white, radius 12) for lists inside cards.
- Toast: dark pill bottom-centre with a status chip and optional white action pill.
- Empty / loading / error: centred tinted chip + one-line title + one-line hint (+ button); skeleton bars in Track with a moving sheen; error uses negative colours + "Try again".
- Charts: smooth monotone curves, 2px round strokes, vertical gradient fills (colour 32% → 0%), dashed light gridlines, dark rounded tooltip.

MOTION: calm and quick. Ease cubic-bezier(.22,1,.36,1). Cards rise 14px + fade (staggered), rows rise 6px, numbers count up, bars grow from the left, charts wipe in, selection pills spring. Respect prefers-reduced-motion.

ACCESSIBILITY: WCAG AA. Never put information in Hint or Accent text. Never use colour alone for meaning.

DON'T: bold weights, gradient surfaces, left-border accent cards, square controls, heavy shadows, emoji, accent-coloured body text.
```
