# YourTurn — before ETHOnline / after ETHOnline

## Before

YourTurn was already a working Hedera-native booking product: tokenized booking rights on HTS, booking, resale and recovery flows, provider-controlled rules, and proof surfaces through HCS, Mirror and Schedule Service.

It worked. But recovery was something **you** did. Every write was executed by trusted backend code on server-managed accounts. There was no end-user delegation, no replay protection on agent confirmation, and no identity or hardware layer.

## The question ETHOnline introduced

What if the customer doesn't want to run the recovery themselves — but also shouldn't have to surrender control to an autonomous agent to avoid it?

Answering that safely is the whole event's work.

## What we added

**Ledger — a bounded mandate.** A structured Recovery Mandate binding owner, exact agent, booking, permitted action, minimum recovery, settlement asset, expiry, cancellation policy and a nonce. Re-checked on every request.

**World AgentKit — verified requester.** AgentKit signature verification bound to the exact resource, statement, operation and intent, AgentBook resolution, and nonce-backed replay rejection — kept deliberately separate from booking authority.

**Hedera — a bounded settlement lifecycle.** Current provider policy, holder authority, buyer eligibility and payment authorization re-read at request time; minimums enforced on seller net; one begin-effect boundary; exact retained unsigned transaction bytes; external-signing validation; dispatch fencing; receipt reconciliation.

## Before vs after

| Capability | Before ETHOnline | After ETHOnline |
| --- | --- | --- |
| Who runs recovery | The customer, manually | A delegated agent, inside a narrow mandate |
| Human authorization | Implicit, server-side | Structured mandate with scope, floor, expiry and nonce |
| Agent identity | None | Verified human-backed requester via AgentKit + AgentBook |
| Replay protection on agent confirm | None | Nonce store and authority-version checks |
| Who executes writes | Trusted backend on managed accounts | Bounded operation re-reading current state first |
| Price floor semantics | Not enforced for delegation | Enforced on seller **net** proceeds |
| Settlement boundary | Implicit | Single begin-effect, exact retained unsigned bytes |
| Outcome verification | Application state | Indexed receipt reconciliation against chain evidence |

## Why this is substantive work

The delegation layer is new, not a refinement. It required an authorization model that didn't exist, an identity check that didn't exist, and a settlement lifecycle that re-reads current truth instead of trusting what was true when the request started. The event delta is 231 files and roughly 29,500 net-new lines.

It also isn't three separate integrations. Each layer answers a question the other two can't: what the human allowed, who is asking, and what actually happened. Remove any one and the other two stop being sufficient.

## Provenance

Pre-event baseline: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`
Application code reviewed at: `60a51fe09e735409a1c0b35593bc4413a49016e1`
