# Bug Reporting & Triage

This document explains how bugs are reported, triaged, and resolved in the project.

The goal is to:

- Make it easy for users to report issues
- Ensure bugs are handled consistently and transparently
- Keep technical decision-making with maintainers while enabling support from Product and the community

---

## What Is a Bug?

A bug is behavior that:

- Is incorrect or broken compared to documented or intended behavior
- Regresses previously working functionality
- Causes crashes, data loss, or security issues

Requests for new features or behavior changes are NOT bugs and should be raised as ideas or proposals instead.

---

## Reporting a Bug

Anyone may report a bug.

Please open a GitHub Issue and select 'Bug Report'. The template provided will require:

- A clear description of the problem
- Steps to reproduce (if possible)
- Expected vs actual behavior
- Environment details (browser, OS, version, framework, etc.)

If you are unsure whether something is a bug, opening an issue is still fine — maintainers will help triage it.

---

## Bug Triage

Bug triage is the process of classifying and prioritizing reported bugs.

### Responsibility

- **Maintainers** are responsible for technical triage and classification
- **Product** may facilitate triage sessions, provide user-impact context, and help with communication
- **Contributors** may assist by reproducing issues or providing additional context

---

### Classification

Maintainers classify bugs based on technical severity.

Severity reflects technical correctness and safety impact, not business priority or operational uptime.

Severity levels:

- **P0 – Critical**: *Unsafe or invalid to use as-is.* Crashes, data loss, security issues, or violations of documented invariants. Users cannot safely rely on the library.
- **P1 – High**: *Safe but seriously impaired.* Core functionality is broken or severely degraded. The library can still be used with limitations or workarounds.
- **P2 – Medium**: *Correct but inconvenient.* Partial breakage or confusing behavior with reasonable workarounds available.
- **P3 – Low**: *Annoying but non-blocking.* Minor issues or cosmetic bugs that do not affect correctness or core functionality.

---

## Bug Lifecycle

Bugs typically move through the following stages. Not all bugs go through every stage, and the process may vary depending on severity and complexity.

1. **Reported**
    
    A bug is reported as a GitHub Issue by a user or contributor.
    
2. **Triaged**
    
    Maintainers review the issue to confirm it is a bug, request additional information if needed, and classify severity.
    
3. **Investigated**
    
    The issue is analyzed further. This may include reproducing the bug, identifying root causes, and discussing possible fixes or trade-offs.
    
4. **Resolved**
    
    A fix is implemented and reviewed via a pull request, or a decision is made not to change behavior (for example, if the behavior is working as intended).
    
5. **Closed**
    
    The issue is closed once resolved, deemed invalid, or no longer actionable. Closure should include a brief explanation whenever possible.
    

High-severity bugs (P0/P1) may skip stages or be addressed immediately.

---

## Fixing Bugs

- Bugs are fixed through the normal pull request process
- Anyone may submit a fix
- Maintainers review and approve fixes

High-severity bugs may be addressed immediately, regardless of roadmap priorities.

---

## Prioritization

While maintainers determine technical severity, Product may:

- Help prioritize bugs relative to other work
- Balance bug fixing with feature development
- Communicate expectations to users and stakeholders

Bug prioritization does not override maintainer judgment on severity or correctness.

---

## When a Bug Becomes an RFC

If fixing a bug:

- Requires changing core behavior
- Introduces breaking changes
- Sets new long-term precedent

Then the fix may require an RFC.

See [RFC_PROCESS.md](/RFC_PROCESS.md) and [How Work Flows](/HOW_WORK_FLOWS.md) for guidance.

---

## Stale or Invalid Bugs

Issues may be closed if:

- The issue cannot be reproduced
- Required information is missing and no response is received
- The behavior is working as intended


> Closure should include a brief explanation.
    

---

## Guiding Principles

- Bugs are treated seriously and respectfully
- Technical correctness comes before speed
- Transparency is preferred over silence
- When in doubt, discuss openly