# Hackathon OS

Status: reusable operating guide for future human + agent hackathon runs.

This file exists to stop us from relearning the same lessons every event.

Use it before, during, and after each hackathon.

## Core Principle

Pick one proof chain.

Everything else is secondary.

A hackathon project is strong when:

- the product story is simple
- the proof chain is real
- the repo is legible
- the live demo works under time pressure

## The Four Truths

Track these explicitly in every run:

1. **Local truth**
   - what is in the active working tree
2. **Verification truth**
   - what is in the clean worktree or verified branch
3. **Deployment truth**
   - what is actually live on preview or production
4. **Public repo truth**
   - what judges see on the GitHub default branch

If these diverge, say so immediately.

## Day-1 Deliverables

By the end of day 1, create and keep current:

1. **Product thesis**
   - one line
   - one target user
   - one pain
   - one why-now

2. **Proof chain**
   - exact steps that must work
   - exact roles involved
   - exact success evidence

3. **Branch policy**
   - which branch is public
   - which branch is exploratory
   - whether `main` must stay submission-ready

4. **Proof ledger**
   - tx ids
   - screenshots
   - schedule ids
   - explorer links
   - what each proves

5. **Demo truth table**
   - route
   - role
   - expected state
   - expected CTA

## Scope Rules

### What gets built

Only build work that does one of these:

- makes the proof chain real
- makes the proof chain more reliable
- makes the proof chain easier to explain
- makes qualification for a target prize more defensible

### What gets deferred

Defer anything that:

- broadens scope without improving proof
- creates a second major user story
- adds polish without clarity
- introduces a new dependency that is not prize-critical

## Naming Policy

Decide early:

- public product name
- internal codename
- package/repo naming policy

Document:

- what must be renamed publicly
- what can remain internal safely

Do not leave public naming unresolved into the final stretch.

## Branch Policy

Recommended default:

- one exploratory branch
- one clean verification worktree
- one public submission branch

Do not assume those are the same thing.

### Non-negotiables

- verify what GitHub default branch shows
- verify what the deployed app is running
- verify what branch the README improvements were pushed to

## Verification Policy

Every serious hackathon run should have:

1. **local happy-path verification**
2. **deployed happy-path verification**
3. **proof ledger validation**
4. **role/route truth validation**

### Browser rule

Do not trust code-only confidence on demo-critical paths.

The following must be verified in a real browser:

- auth
- role switching
- route gating
- primary CTA behavior
- final proof state

## Demo Policy

### Required assets

- spoken script
- operator runbook
- shortened backup script
- route/role truth table
- final video checklist

### Freeze rule

Once the happy path works:

- freeze runtime behavior
- prefer docs, copy, and presentation polish only
- allow product logic changes only for reproducible blockers

## Proof Policy

Every external claim should have one of:

- tx id
- explorer link
- schedule id
- screenshot
- test output
- route/API proof

If a claim does not have proof, downgrade the claim or mark it future work.

## Docs Policy

Keep the following current as the build evolves:

- README
- submission worksheet
- architecture doc
- demo runbook
- UI map / route map
- proof ledger

When routes or role behavior change, update the docs in the same slice.

## Submission Policy

Before submission, verify:

- video compliance
- public repo correctness
- default branch correctness
- README first screen clarity
- prize-selection justification
- AI usage disclosure
- new vs reused work disclosure
- live links and proof links

## Agent Ops Policy

### Agents must always surface:

- current branch
- deployed environment under discussion
- whether work is happening in a clean worktree
- whether public/default branch matches the intended submission state

### Agents should prefer:

- clean worktrees for final pushes
- explicit facts/inferences/assumptions on non-trivial reviews
- browser verification over speculative confidence
- docs updates in the same change as public-surface behavior changes

### Agents should avoid:

- risky late merges in demo-critical files
- claiming production health from local-only success
- deferring public repo hygiene until the end

## Human Ops Policy

### One owner must always know:

- current target prize tracks
- current proof status
- current demo status
- current public repo status
- what is intentionally not being claimed

### One owner must always protect:

- branch sanity
- default branch correctness
- deployment sanity
- demo freeze

## Post-Hackathon Ritual

Within 48 hours of submission:

1. write the postmortem
2. record what should become standard process
3. record what should never happen again
4. clean branch strategy if it was compromised during the event
5. preserve proof and reviewer materials

## Minimum Templates To Keep Reusing

For future events, keep reusable templates for:

- README submission layout
- proof ledger
- demo truth table
- browser verification prompts
- submission worksheet
- postmortem

## Bottom Line

The goal is not just to build fast.

The goal is to build one real thing, prove it, present it cleanly, and avoid creating end-of-hackathon chaos that we already know how to prevent.
