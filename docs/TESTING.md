# Manual acceptance tests

The automated suite (`npm test`, 69 tests, run by CI on every push) checks the engine's logic. This checklist checks the **product**:
a person using the real app on the [live site](https://smart-queue-management-pi.vercel.app/), feature by feature.

**Setup:** open the live site → **Explore the demo — no account needed** (sections A–D, F–H). Sections marked *(Supabase)* need a staff sign-in.
Tick a box only after you've seen the expected result yourself.

## A. Ranking and explanations

- [ ] **A1** Look at the queue → rows are ordered by the **Score** column, highest first; #1 has the highest score.
- [ ] **A2** Read **Why this customer?** → the reasons (e.g. "Waiting 24 min (+24)") add up to that customer's score.
- [ ] **A3** Click **Skip 10 min** → every *Waiting* time grows by 10 and every score rises; someone past 30 min shows a "past the 30-min target" reason.
- [ ] **A4** Find **Luca P.** (appointment later than now) → low score at first; after **Skip 10 min** he jumps up with an "Appointment at …" (+30) reason.
- [ ] **A5** Click **Add customer** → a toast says who joined; the new row is placed by its score, not at the bottom.
- [ ] **A6** Fairness: skip time until someone has waited 50+ min, then click **Rush +8** a few times → no new arrival (even *Urgent*) ranks above them.

## B. Staff assignment and wait forecasts

- [ ] **B1** **Staff** column → every customer is assigned someone qualified (Blood Test → a nurse; Full Assessment → Dr. Patel only).
- [ ] **B2** When **Up next** is not the #1 row → the explanation says why (e.g. "#1 needs Consultation — Dr. Kim free in 4 min").
- [ ] **B3** **Est. wait** grows down each staff member's list (their jobs stack up).

## C. Visit lifecycle

- [ ] **C1** **Call now** → the customer moves to **Now serving**, the staff member shows *Busy*, a toast confirms.
- [ ] **C2** Row **⋯ → Serve now with …** works; it is greyed out when no qualified staff member is free.
- [ ] **C3** **Done** → the visit leaves *Now serving*; *Served today* +1; toast shows how long it took.
- [ ] **C4** **⋯ → Mark no-show** on a waiting customer → removed; *no-shows* count +1.
- [ ] **C5** **No-show** on a visit in *Now serving* → that staff member becomes *Available* straight away.
- [ ] **C6** **⋯ → Cancel visit** → removed; *cancelled* count +1.
- [ ] **C7** Skip time past a visit's expected end → "Over by X min" pill; the staff member stays *Busy* until **Done**.

## D. Learning real service times

- [ ] **D1** **Services** page → each service shows configured vs learned time with a *slower/faster* pill.
- [ ] **D2** Call a Blood Test, **Skip 10 min**, click **Done** → back on Services, Blood Test's learned estimate and *visits learned from* changed.

## E. Public waiting-room screen and sync

- [ ] **E1** Open **Waiting-room screen** (same browser, demo mode) → only ticket numbers, positions and waits; **no names, services or urgency**.
- [ ] **E2** Call someone on the dashboard → their ticket appears under *Now serving* on the screen and pulses.
- [ ] **E3** Close the dashboard tab, wait ~45 s → the screen shows **Reconnecting to the front desk…**.
- [ ] **E4** *(Supabase)* Sign in, open `/display` **on your phone using mobile data** → calling someone on the laptop updates the phone within ~1 s.
- [ ] **E5** *(Supabase)* Signed in on two browsers → an action in one appears in the other.
- [ ] **E6** *(Supabase)* Both browsers: click **Call now** for the same customer at the same time → one succeeds, the other shows "already called by another desk".
- [ ] **E7** *(Supabase)* CI's **Database security (RLS) check** is green (or `npm run check:rls` prints all PASS).

## F. Simulation

- [ ] **F1** **Play the day** → the clock runs from 08:00 with live waiting/served/walked-out counts; Pause and Reset work.
- [ ] **F2** Change **Customers** or **Day** → the chart redraws (wipes in) and both tables update.
- [ ] **F3** Customers **50** → the three algorithms give almost the same results (quiet day).
- [ ] **F4** Predict, then check: drag **urgent boost** to 150 → urgent waits fall, longest wait rises. Drag it to 0 → the opposite.
- [ ] **F5** **Run 20 days** → an averaged table appears.

## G. Overload and staffing

- [ ] **G1** **Rush +8** two or three times → **Overloaded** card lists the worst services and suggests a kind of extra staff member.
- [ ] **G2** Simulation, 100 customers, day 1 → the staffing strip marks afternoon hours *Busy*; **Find the best extra shift** recommends a doctor-type shift with before/after numbers.
- [ ] **G3** Customers 60 → **Find the best extra shift** says no extra shift is needed.

## H. Interface and accessibility

- [ ] **H1** Switching pages → old page fades out, new one fades in with cards rising; the sidebar pill slides.
- [ ] **H2** Keyboard only (Tab / Enter / Esc) → every control is reachable with a visible orange focus ring; Esc closes the ⋯ menu.
- [ ] **H3** DevTools → Rendering → *Emulate prefers-reduced-motion: reduce* → no movement, nothing missing.
- [ ] **H4** Filter to a category nobody is waiting for → an empty state with an *Add customer* button.
- [ ] **H5** Sign-in page in a private window → **Explore the demo** works without an account.
