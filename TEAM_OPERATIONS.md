# Team Operations

This document describes how the core team collaborates day to day to plan, prioritize, and deliver work. It complements higher-level documents such as [How Work Flows](/HOW_WORK_FLOWS.md), [GOVERNANCE](/GOVERNANCE.md), and the [RFC process](/RFC_PROCESS.md) by focusing on practical execution rather than decision authority.

The goal is to provide clarity without bureaucracy, and to support a small, senior team working on an open-source library used by a diverse community.

---

## Operating Model

The project uses a **Kanban-style, continuous flow** model rather than time-boxed sprints.

This approach is chosen because:

- Work arrives unpredictably (bugs, community input, enterprise needs)
- The team is small and context switching is common
- The project values flexibility and transparency over fixed commitments

---

## Work Streams

All work falls into one of three streams. These streams share the same board and flow, and are distinguished by labels or swimlanes.

### 1. Maintenance

Includes:

- Bug fixes and regressions
- Stability, performance, and infrastructure work
- Small refactors and technical hygiene

Maintenance work is governed by the bug triage process and maintainer judgment.

---

### 2. Discovery

Discovery work focuses on reducing uncertainty before committing to delivery. It may or may not lead to implementation.

Includes:

- Early idea exploration
- Exploration to reduce technical, UX, or API uncertainty (for example research, prototypes, or throwaway code)
- RFC preparation and refinement

Discovery work is typically time-boxed and produces learning or clarity rather than shipped features.

---

### 3. Delivery

Includes:

- Implementation of accepted RFCs
- Small changes that do not require an RFC

Delivery work turns approved decisions into shipped code. Acceptance of an RFC enables delivery, but does not guarantee prioritization.

---

## The Board

The team uses a single shared board to track work.

### Columns

- **Inbox** – Untriaged ideas, bugs, and requests. No commitment.
- **Ready** – Work that is understood and allowed to be started.
- **In Progress** – Actively worked on items.
- **Review** – Work awaiting review or feedback.
- **Done** – Completed and merged work.

The board is an operational tool, not a roadmap.

---

## Ready Criteria

An item may move to **Ready** when:

- The scope and intent are clear
- It is appropriate to work on
    - Bugs are classified by severity
    - Features either have an accepted RFC or are explicitly deemed not to require one

The Ready column represents permission to start work, not a priority order.

---

## Prioritization of Ready Items

Prioritization determines what the team focuses on next from the Ready column. It does not affect what is allowed to be worked on.

### How Prioritization Works

- Prioritization happens collaboratively, typically during the weekly sync
- Product proposes a focus based on user needs, enterprise context, and strategic considerations
- Engineering provides input on technical risk, sequencing, and capacity

The outcome is a shared agreement on near-term focus, not a binding commitment or delivery promise.

### Roles and Responsibilities

- **Product** facilitates prioritization by surfacing context, trade-offs, and suggested focus areas
- **Maintainers** retain authority over technical feasibility and sequencing
- **No single role owns prioritization**; decisions are made through discussion and consensus

High-severity maintenance work (for example P0 or P1 bugs) may be prioritized immediately regardless of other Ready items.

---

## Roles in Day-to-Day Operations

### Maintainers

- Own technical decisions
- Triage and classify bugs
- Review and merge pull requests
- Decide how work is implemented

---

### Product Management / Product Owner

Product management supports execution by:

- Curating the Inbox
- Facilitating bug triage
- Helping prepare items for Ready
- Translating accepted RFCs into epics or work items
- Proposing focus and sequencing
- Communicating status externally

Product does not assign work or override maintainer or TSC authority. When acting as Product Owner, Product operates strictly within accepted scope.

---

### Technical Steering Committee (TSC)

The TSC is not involved in daily operations. Its role is to:

- Accept or reject RFCs
- Ensure alignment with the project mission
- Guard long-term technical direction

---

## Cadence

### Daily

The team uses a lightweight, daily check-in to share:

- What was worked on
- What is planned next
- What is blocking them

---

### Weekly Sync

A weekly sync (30–45 minutes) is held between engineering and product.

Typical agenda:

1. Review completed work
2. Review items in progress
3. Review Ready items
4. Time-boxed triage of Inbox items

The outcome is shared alignment on near-term focus, not delivery commitments.

---

### Reflections and Continuous Improvement

The team periodically reflects on how it works together and may adjust practices as needed.

Reflections are lightweight and focused on identifying friction, validating what works well, and experimenting with small improvements. They are not performance evaluations and do not produce formal action plans.

---

## Decision Recording

Synchronous discussions (for example chat or calls) are encouraged for speed and alignment. However, decisions that affect others or have lasting impact should be recorded in GitHub.

As a general rule:

- Decisions may be made synchronously
- Outcomes should be summarized asynchronously in GitHub issues, pull requests, or RFCs

This ensures transparency, long-term traceability, and shared understanding across the project.

---

## Guiding Principles

- Keep work visible
- Limit work in progress
- Prefer flow over fixed plans
- Optimize for trust and clarity
- Avoid process that does not clearly add value

---

## Relationship to Other Documents

- [How Work Flows](/HOW_WORK_FLOWS.md) describes the conceptual lifecycle from ideas to code
- [RFC Process](/RFC_PROCESS.md) governs significant technical decisions
- [GOVERNANCE](/GOVERNANCE.md) defines authority and decision rights
- [BUGS](/BUGS.md) defines bug reporting and triage

This document focuses exclusively on how the core team executes work within those constraints.