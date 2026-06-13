# Web2 market vocabulary vs YourTurn

**Purpose:** Map **how mainstream booking / class / ticket products talk** so product copy can align with language users already know. This is **research synthesis**, not legal advice.

**Product fit:** SMB **classes and appointments** (yoga, physio, coaching) + **transferable right** — closest parallels are **studio schedulers**, **scheduling SaaS**, and **ticket/pass** flows (transfer vs resale).

---

## How major categories speak

### Scheduling SaaS (1:1 meetings, appointments)

**Examples:** [Calendly](https://help.calendly.com/hc/en-us/articles/14079031268375-How-to-cancel-reschedule-and-make-changes-to-an-event), [Acuity Scheduling](https://help.acuityscheduling.com/hc/en-us/articles/16676898629133-Using-the-confirmation-page), [Cal.com](https://cal.com/help/event-types/disable-canceling-rescheduling)

| Term | Typical use |
|------|-------------|
| **Booking** | The confirmed time hold (Cal.com / many products). |
| **Appointment** | Same idea, especially 1:1 services (Acuity). |
| **Cancel** / **Reschedule** | Standard pair post-booking; “make changes to this event”. |
| **Guest** / **attendee** / **invitee** | Person who booked (wording varies). |
| **Host** / **organizer** | Person who owns the calendar. |

**Implication for us:** **Cancel** and **reschedule** are universal expectations for *changing* a booking; we **defer F7** — say so plainly if copy might imply full cancel/refund like Calendly.

---

### Classes & studio software (group sessions)

**Examples:** [Mindbody support](https://support.mindbody.io/s/article/How-can-I-cancel-my-class-or-appointment-How-do-I-reschedule), [ClassPass help](https://help.classpass.com/hc/en-us/sections/360009374072-Managing-reservations)

| Term | Typical use |
|------|-------------|
| **Reservation** | Very common for a **held spot in a class** (ClassPass, Mindbody). |
| **Class** / **session** | The scheduled offering. |
| **Waitlist** | When full (we do not ship this). |
| **Late cancel** / **no-show** | Policy language (we do not ship full policy UI). |
| **Client** / **member** | Logged-in end user. |

**Implication for us:** **Reservation** or **booking** reads more “market” than **slot** alone for consumers; **slot** is fine internally or for inventory. **Class** / **session** match the hero verticals.

---

### Tickets, passes, secondary movement

**Examples:** [Ticketmaster — transfer vs resale](https://help.ticketmaster.com/hc/en-us/articles/9786975926673-Ticket-Transfer-Everything-you-need-to-know), [Eventbrite — changing holder](https://www.eventbrite.com/help/en-us/articles/431834/how-to-transfer-tickets-to-someone-else/), [Apple Wallet — event ticket pass](https://developer.apple.com/documentation/walletpasses)

| Term | Typical use |
|------|-------------|
| **Ticket** | Single right of entry; often **transfer** (give to friend) vs **resale** (sell on marketplace). |
| **Transfer** | Often **non-commercial** handoff to another person; new barcode / new holder. |
| **Resale** | **Secondary sale**; price may exceed face value (Ticketmaster distinguishes clearly). |
| **Pass** | Wallet object (**event ticket pass** in Apple Wallet); also “gym pass” colloquially. |
| **Face value** / **fees** | Price breakdown language for resale. |

**Implication for us:** Market **separates transfer and resale**. Our shipped path is **resale (list + buy)**. Marketing that says **“transfer or resell”** without qualification can **over-promise** vs Web2 expectations (free/simple **transfer**). Prefer **“resell”** or **“sell to someone else”** where accurate, or add **“under provider rules”** and avoid implying fee-free transfer unless true.

---

## Alignment table (current product language)

| YourTurn / docs term | Web2 analogue | Alignment | Suggestion |
|---------------------|---------------|-----------|------------|
| **Slot** | Inventory row, “spot”, sometimes “session” | OK for ops; colder for consumers | Consumer UI: prefer **session**, **class**, or **booking** where it fits. |
| **Pass** / **my passes** | Wallet pass, gym pass | **Strong** | Keep for hub/nav; matches “hold it like a pass”. |
| **Booking right** | Technical; market says **booking** / **reservation** / **ticket** | Jargon | Use in technical/issuer copy; consumer: **your booking** or **your reservation**. |
| **Issuer** | **Host**, **organizer**, **business**, **provider** | Blockchain-native | Consumer-facing: **provider** / **studio**; operator docs can keep **issuer**. |
| **Provider tools** | Admin, **business dashboard**, **back office** | Good | Clear separation from consumer path. |
| **Guest** (guestA/B) | **Member**, **client**, **attendee** | Demo-only label | UI helper text: “acting as Person A” or **member** if you rename later. |
| **Resale** | **Resale**, **sell your ticket**, **list** | **Strong** | Keep; optional: “**Sell to someone else**” for clarity. |
| **Transfer** (marketing) | Usually **free handoff** | **Risk** if no transfer flow | Pair with **resell** only if both exist; else narrow copy. |
| **Redeem** / **mark used** | **Check in**, **attended**, **scanned** | Partial | **Check-in** or **Mark as used** matches studios; **Redeem** fits **pass** metaphor. |
| **Freeze** | Rare in consumer Web2; **hold**, **account lock** | Explain always | Keep but one-line **plain English** (“movement paused by provider”). |
| **Royalty** | **Fee to organizer**, **platform fee** (varies) | Jargon | Consumer: **“Provider fee on resale”** or **“included fee”**; keep % visible. |
| **Serial** | Internal id | Too technical | Consumer: **booking #**, **reference**, or hide behind title + time. |

---

## Recommended vocabulary tiers

1. **Consumer marketing & hub:** **Booking**, **reservation**, **pass**, **session** / **class**, **provider**, **resell** (or **sell to someone else**), **check-in** / **mark used**, **fee on resale** (not “royalty” alone).  
2. **Consumer detail / edge states:** Short gloss for **freeze**; avoid **serial** in headings.  
3. **Provider console:** May keep **issuer**, **token**, **Mirror** for technical operators; pair with **plain labels** in rules bullets.  
4. **Judge / chain narrative:** **HTS**, **NFT**, **issuer** as needed — separate from consumer tier.

## Surface split

The app should read as **three surfaces**, not one shared admin portal:

1. **Customer surfaces** — `/slots`, `/my-bookings`, `/resale/[serial]`, much more like a booking app or pass wallet.
2. **Shared truth surface** — `/slots/[serial]`, where both sides can verify status, next step, and proof.
3. **Provider dashboard** — `/issuer`, clearly back-office and operational.

If a customer route needs repeated explanations about issuer actions or demo roles, the copy is drifting toward the dashboard voice.

---

## Sources (starting set)

- Calendly — cancel / reschedule: https://help.calendly.com/hc/en-us/articles/14079031268375-How-to-cancel-reschedule-and-make-changes-to-an-event  
- ClassPass — reservations / cancellation: https://help.classpass.com/hc/en-us/articles/207942743-What-is-the-reservation-cancellation-policy  
- Ticketmaster — transfer vs resale: https://help.ticketmaster.com/hc/en-us/articles/9786975926673-Ticket-Transfer-Everything-you-need-to-know  
- Apple Developer — event ticket pass: https://developer.apple.com/documentation/walletpasses  
- Acuity — confirmation / cancel / reschedule: https://help.acuityscheduling.com/hc/en-us/articles/16676898629133-Using-the-confirmation-page  
- Cal.com — disable cancel/reschedule: https://cal.com/help/event-types/disable-canceling-rescheduling  

---

## Maintenance

When **ship scope** changes (e.g. real **transfer** without payment), update the **transfer vs resale** row and re-audit home / resale copy (keep `docs/DEMO.md` and `docs/UI-MAP.md` aligned).

**Copy pass (consumer tier):** 2026-04-05 — `components/home/*`, `SlotsClient`, slot detail, resale page + `ResaleClient`, `MyBookingsClient`, `IssuerPanel` (ref #, session links, provider fee, success labels match buttons).
