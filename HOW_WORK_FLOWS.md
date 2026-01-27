# How Work Flows

This document describes how work moves through the project from an initial idea or user need to code being written, reviewed, and shipped.

Its purpose is to provide a shared mental model for contributors, maintainers, Product, and the TSC, without prescribing heavy process.

---

## The Mental Model (Overview)

```
Idea / Need
   ↓
Triage (what kind of thing is this?)
   ↓
Outcome
   ├─ Bug → Bug process
   ├─ Docs / Enablement → Docs or example PR
   ├─ Small feature → Feature issue
   └─ Significant change → RFC
             ↓
      Accepted RFC (design allowed)
             ↓
      Product translates into delivery work
             ↓
      Engineering implements
             ↓
      Maintainers review & merge

```

This pipeline is risk-based: the higher the impact or precedent, the more explicit the decision-making.

---

## Step 1: Idea or Need

Ideas and needs can originate from many places:

- Community contributors
- Enterprise or public-sector users
- Maintainers
- Product observations

At this stage, ideas should be expressed as problems or needs, not solutions. Ideas may be shared informally to gather early feedback. Writing an RFC is not required at this stage.

---

## Step 2: Triage

The goal of triage is to decide what kind of work this is, not whether it will be done.

Typical questions:

- Is this a bug or broken behavior?
- Is this already possible and just poorly documented?
- Is this a small, local change?
- Does this affect core behavior, APIs, or long-term direction?

Triage is usually facilitated by Product, with technical input from maintainers when needed.

---

## Step 3: Outcome Paths

### Does this need an RFC?

Before choosing an outcome path, ask the following questions:

- Does this change affect core behavior or public APIs?
- Does this introduce a new core concept or abstraction?
- Does this set a long-term technical precedent?
- Does this have broad impact across users, integrations, or deployments?

If **YES** to any of the above → an RFC is required.

If **NO** → proceed via the appropriate non-RFC path (bug, docs, or small feature).

This decision is intentionally conservative: when in doubt, proposing an RFC is preferred over bypassing the process.

---

### Bugs

- Owned and triaged by maintainers
- Classified by technical severity (P0–P3)
- Fixed via the normal pull request process

Product may help provide user impact context and communicate status, but does not decide technical severity.

---

### Docs & Enablement

If the need can be addressed through documentation, examples, or guidance:

- A documentation or example pull request is created
- No RFC is required

---

### Small Features

If the change is:

- Local in scope
- Low-risk
- Does not introduce new core concepts or public APIs

Then:

- A feature issue is created
- Product prioritizes the problem
- Engineering proposes and implements a solution
- Maintainers review and merge

---

### Significant Changes (RFC)

If the change:

- Affects core behavior or public APIs
- Introduces new core concepts
- Sets long-term precedent
- Has broad user impact

Then an RFC is required.

RFCs are discussed openly and decided by the TSC. An RFC may be **accepted**, **rejected**, or **returned for revision**.

Acceptance indicates that the proposed approach is technically acceptable. Rejection indicates that the approach should not proceed in its current form.

Acceptance of an RFC does not imply prioritization, scheduling, or delivery commitment.

---

## Step 4: RFC Decision Outcome

If an RFC is:

- **Accepted**: the design is allowed to move forward
- **Rejected**: the change does not proceed in its current form
- **Returned for revision**: the author may iterate and resubmit

Detailed mechanics of RFC discussion and decision-making are documented separately in [RFC_PROCESS.md](/RFC_PROCESS.md).

---

## Step 5: From Decision to Work

Once a path is chosen:

- **Accepted RFCs** are translated by Product into features or epics
- **Feature issues** are broken down by engineering into executable work
- Product schedules work based on capacity and priorities

Engineering owns implementation details. Product owns sequencing and communication.

---

## Step 5: Code, Review, and Shipping

- Code is implemented via pull requests
- Maintainers review for correctness, quality, and alignment
- High-risk or precedent-setting changes follow the RFC decisions
- Approved changes are merged and released

---

## Guiding Principles

- Not all ideas need RFCs
- Not all accepted ideas are immediately implemented
- Authority escalates with impact
- Process exists to reduce confusion, not to slow work

---

## Relationship to Other Documents

- [GOVERNANCE.md](/GOVERNANCE.md) defines **who decides**
- [HOW_WORK_FLOWS.md](/HOW_WORK_FLOWS.md) defines **how work flows**
- [RFC_PROCESS.md](/RFC_PROCESS.md) (separate document) defines **how significant decisions are made**

This document intentionally stays high-level and may evolve as the project grows.