# Final Demo Script

Use this as the **recording script**.

One person **speaks**.
One person **clicks**.

Keep the tone calm and direct. Do not explain every screen. Only say what helps the audience understand:

1. the problem
2. the solution
3. why this is better
4. what the app is proving live

If a page is already open and another account changed the pass, refresh before narrating the new state.

---

## Demo setup

Use three separate browser profiles or computers if possible:

- **Browser 1:** Demo issuer
- **Browser 2:** Demo user A
- **Browser 3:** Demo user B

If you only have one browser profile, do the same flow with sign-out / sign-in, but the cleanest recording uses separate sessions.

Recommended role split:

- **Speaker:** reads the script
- **Operator:** clicks through the product

---

## Opening

### Speaker

Today, small and medium-sized businesses lose money and time to cancellations, no-shows, and messy booking changes.

When a customer cannot make an appointment, the fallback is usually manual coordination, a lost slot, or an informal handoff the business cannot really control.

YourTurn turns that booking into a controlled, transferable pass.

That means the customer keeps flexibility, the business keeps visibility and control, and the slot does not have to die unused.

For this demo, we will show that with a therapy-style appointment. But the same engine also works for classes, coaching, and premium experiences where resale and issuer royalties matter even more.

### Operator

Start on:

- `/`

Pause briefly on the homepage hero.

Do not click yet.

---

## Framing the product

### Speaker

The important shift is this:

A booking is no longer just a calendar row.

It becomes a live pass that can move to another customer under provider rules.

The business still controls the rules, still controls final check-in, and can even earn when that slot changes hands.

That is the core story.

### Operator

Click:

- `Browse sessions` only after the speaker finishes the framing

Then go to:

- `/login`

---

## Step 1: Issuer prepares inventory

### Speaker

First, we sign in as the business. This is the provider dashboard where the business controls the live session inventory and the operating rules behind the scenes.

### Operator

In the issuer browser:

1. Sign in as **Demo issuer**
2. Open `/issuer`
3. Click **Start over**
4. Complete the typed confirmation

Optional if you want to show setup:

5. Briefly show the business name and the planned session cards

Then leave the page on the live inventory area.

### Speaker

This gives the business a clean live schedule to work from.

The important point is that this is not an uncontrolled resale marketplace. The provider still owns the inventory, the policy, and the final redemption step.

---

## Step 2: Person A books

### Speaker

Now we switch to the customer side.

Person A is booking a real session. In this case, think of it like a therapy appointment or a limited class slot.

### Operator

In the User A browser:

1. Sign in as **Demo user A**
2. Open `/slots`
3. Pick one **AVAILABLE** session
4. Click **Book**
5. Confirm the booking in the review dialog

After booking:

6. Note the serial / ref number
7. Open `/my-bookings`

### Speaker

At this point, Person A is the current holder of that pass.

So the booking is no longer just “an entry on a calendar.” It is now a live booked right the customer can track and act on.

---

## Step 3: Show provider visibility

### Speaker

And the business can immediately see who holds that pass now.

### Operator

Back in the issuer browser:

1. Refresh if needed
2. Find the same serial
3. Show that the current holder is **Person A**

### Speaker

That is important because the provider never loses visibility when the booking moves through the system.

---

## Step 4: Person A lists the pass

### Speaker

Now the real problem appears.

Person A cannot make the session anymore.

In most businesses, this is where the process becomes manual, messy, or revenue-destructive.

With YourTurn, the customer can relist the slot safely under provider rules instead of letting it go unused.

### Operator

In the User A browser:

1. Open `/resale/[serial]` for the same pass
2. Enter the resale ask if needed
3. Click **List this pass**
4. Confirm the review dialog
5. Open `/my-bookings` again if useful

### Speaker

Now the customer has listed the pass for resale.

And the business can still govern that process.

That is the difference between a controlled transfer and an informal swap.

---

## Step 5: Person B buys

### Speaker

Now Person B takes over the slot.

This is where the flexibility becomes obvious for the customer, and the revenue protection becomes obvious for the business.

### Operator

In the User B browser:

1. Sign in as **Demo user B**
2. Open the same `/resale/[serial]`
3. Show the listing
4. Click **Buy this pass**
5. Confirm the purchase dialog
6. Open `/my-bookings`

### Speaker

The pass now belongs to Person B.

So the slot stays alive, the business keeps control, and the customer handoff happens inside the product instead of outside it.

If this were a premium slot, like a boat-day or other high-demand experience, this is also where the secondary economics become much more valuable.

---

## Step 6: Show holder changed

### Speaker

And importantly, the provider can see that change immediately.

### Operator

Back in the issuer browser:

1. Refresh if needed
2. Show the same serial
3. Show that the current holder is now **Person B**

### Speaker

So the handoff is not invisible to the business.

The system still knows exactly who the valid holder is.

---

## Step 7: Issuer checks in and closes the lifecycle

### Speaker

Now the provider performs the final redemption step.

This is what closes the lifecycle and prevents the same pass from being used twice.

### Operator

In the issuer browser:

1. Use **Check in / mark used** for that same serial
2. Type the confirmation value
3. Submit
4. Refresh `/issuer` once if you want the counts to catch up before the next line

### Speaker

This is one of the most important parts of the demo.

Even though the pass could move between customers, the business still controls final check-in.

That means flexibility for the customer does not come at the expense of business control.

---

## Step 8: Show final closed state

### Speaker

And now we show the final state from the customer side.

### Operator

Sign out of issuer if needed.

In the User B browser:

1. Open `/slots/[serial]`
2. Show that the pass is now closed / used
3. Briefly show the lifecycle history
4. Open `/resale/[serial]`
5. Show that the page is read-only and the pass cannot be resold anymore

### Speaker

That is the full lifecycle:

booked,
resold,
transferred to the new holder,
then checked in and closed by the provider.

And once it is closed, it cannot move again.

---

## Hedera line

### Speaker

Why does Hedera matter here?

Because it gives us a transferable asset with a visible lifecycle, resale economics, and a verifiable audit trail, while still keeping the product flow simple enough for a real service business.

So this is not “blockchain for its own sake.”

It is infrastructure that lets the booking behave like a controlled pass.

---

## Closing

### Speaker

So the value of YourTurn is simple:

it helps small and medium-sized businesses recover lost value from cancellations and no-shows,
it gives customers more flexibility,
and it lets the business keep control, visibility, and new revenue opportunities when bookings change hands.

### Operator

End on either:

- `/slots/[serial]` closed state
- or `/issuer`

Choose whichever looks cleaner in the recording.

---

## Short version

If you need the compressed version for a tighter video:

### Speaker

Small businesses lose revenue when customers cancel or no-show. YourTurn turns a booking into a controlled, transferable pass. In this demo, Person A books a session, relists it, Person B buys it, and the provider still controls final check-in and closure. That protects revenue, improves flexibility, and opens new secondary fee opportunities.

### Operator

Do:

1. issuer reset
2. User A book
3. User A list
4. User B buy
5. issuer show holder changed
6. issuer mark used
7. User B show closed slot detail and closed resale

---

## Recording notes

- Keep one serial throughout the whole recording.
- Do not narrate every button.
- Refresh pages quietly before speaking if another role just changed the pass.
- If issuer counts lag after check-in, refresh `/issuer` before describing the totals.
- Do not try to open `/slots/[serial]` while still signed in as issuer.
- If the audience is less technical, show lifecycle history only briefly.
- If the audience is more technical, mention that resale and final closure are verifiable and auditable.
