# Paper Calm — Motion spec (Framer Motion handoff)

Implement with `motion` / `framer-motion`. Everything respects `useReducedMotion()`: no movement, only instant state changes.

## Tokens
```ts
export const ease = [0.22, 1, 0.36, 1];                               // "out-expo" for reveals
export const spring = { type: "spring", stiffness: 420, damping: 32 }; // pills, popovers, toast
export const dur = { row: 0.36, card: 0.56, bar: 0.9, count: 0.95 };
```

## Where motion lives
| Moment | Behaviour | Framer Motion |
|---|---|---|
| Screen load | Skeleton for ~0.5 s, then the real content replaces it | `AnimatePresence mode="wait"`; skeleton → content |
| Cards / KPI tiles | Rise 14 px + fade, 55 ms stagger | `variants` + `staggerChildren: 0.055` |
| Table rows | Rise 6 px + fade, 22 ms stagger (max 18), replayed on filter/sort | `motion.div` rows; `key` = filter hash on the table body |
| KPI numbers | Count up from 0 over 0.95 s, ease-out | `useMotionValue` + `animate()` + `useTransform` formatter |
| Progress bars | Grow `scaleX` 0 → 1 from the left | `initial={{scaleX:0}} animate={{scaleX:1}} style={{originX:0}}` |
| Active nav / segmented tabs | Dark pill slides to the new item | Shared `layoutId="nav-pill"` / `"seg-pill"` |
| Row expand | Height auto + fade | `AnimatePresence` + `animate={{height:"auto"}}` |
| Popover | Scale 0.95 → 1 from the top-right, spring | `initial={{opacity:0,scale:.95,y:-6}}` with `spring` |
| Toast | Springs up from 10 px; fades down on exit | `AnimatePresence` + `exit={{opacity:0,y:14}}` |
| Highlight | Row pulses the accent 3× | `animate={{backgroundColor:[…]}} transition={{repeat:2}}` |
| Hover | Card shadow deepens; rows turn white | `whileHover` (or CSS) |
