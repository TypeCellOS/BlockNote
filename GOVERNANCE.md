# Governance

## Overview

BlockNote is an open-source project stewarded by the founding team with the goal of growing into a contributor-led ecosystem over time. Governance is designed to balance long-term technical integrity, transparency, and sustainability while remaining lightweight at the project’s current scale.

Governance is intentionally documented early to support trust with contributors, enterprises, and public-sector users.

---

## Core Project Roles

The project uses a simple three-role structure for **project governance and technical authority**. These roles define who makes technical decisions and how the project is stewarded over time. Individuals may hold multiple roles, but the authority exercised depends on the role relevant to the decision at hand.

The project uses a simple three-role structure designed to match its current size while supporting future growth. Individuals may hold multiple roles, but the authority exercised depends on the role relevant to the decision at hand.

### Technical Steering Committee (TSC)

*TSC members may also serve as maintainers. When doing so, they exercise only the authority of the role relevant to the decision at hand.*

The Technical Steering Committee (TSC) is responsible for the long-term technical direction and health of the project.

The TSC operates independently of Product Management. Product may facilitate processes and provide input, but does not exercise technical decision-making authority or override TSC decisions.

**Responsibilities**:

- Approving or rejecting significant technical changes (via the RFC process)
- Setting and maintaining long-term architectural direction
- Sanity-checking alignment with the project mission to prevent long-term drift
- Acting as stewards of the project’s technical integrity and sustainability

**Privileges**:

- Ability to curate and prioritize problem statements
- Ability to act as Product Owner (PO) for execution within accepted RFC scope
- Ability to establish and facilitate regular operational processes (such as bug triage) to support maintainers and contributors

Product management does not make technical decisions, does not override maintainer or TSC authority, and does not bypass the RFC or review process. Product management may facilitate processes such as bug triage, but technical classification and severity decisions remain the responsibility of maintainers. Individuals may hold multiple roles; decision authority depends on the role being exercised.

Product management may also act as Product Owner (PO) for execution. When acting as PO, product management operates strictly within accepted RFC scope and does not override technical or governance decisions.

---

### Contributors

Contributors are individuals who participate in the project by contributing code, documentation, issues, or discussions.

**Responsibilities**:

- Following project guidelines and the Code of Conduct
- Engaging constructively with maintainers and other contributors

**Privileges**:

- Open participation in discussions, issues, and pull requests
- Ability to propose changes, ideas, and RFCs

Contributors do not have merge rights or decision-making authority but are encouraged to grow into maintainer roles over time.

---

## Supporting & Operational Roles

Supporting and operational roles enable the project to function sustainably and transparently but do not exercise technical or governance authority over the project.

### Steward

The Steward is responsible for the legal, organizational, and operational continuity of the project.

**Responsibilities**:

- Holding and managing project assets (such as the GitHub organization, trademarks, domains, and release infrastructure) on behalf of the project
- Ensuring that documented governance processes are upheld and respected
- Providing long-term continuity and accountability for the project’s existence
- Acting as the primary legal and organizational point of contact for the project

**Privileges**:

- Administrative control over project assets and infrastructure
- Authority to act to protect the project’s continuity, security, or legal standing

The Steward does not make technical decisions, does not participate in RFC acceptance, does not set technical direction, and does not override the authority of maintainers or the TSC.

The project is currently stewarded by **XXX**, in their capacity as CEO of the stewarding company.

---

### Product Management

Product management gathers and synthesizes input from users, customers, and the community; maintains roadmap transparency; and facilitates the RFC process (for example by helping authors clarify motivation, scope, and impact).

**Responsibilities**:

- Aggregating and synthesizing input from users, customers, and contributors
- Framing problems and maintaining a transparent, indicative roadmap
- Facilitating the RFC process without exercising decision authority
- Preparing and facilitating operational processes such as regular bug triage

**Privileges**:

- Ability to curate and prioritize problem statements
- Ability to act as Product Owner (PO) for execution within accepted RFC scope
- Ability to establish and facilitate operational processes (such as bug triage) to support maintainers and contributors

Product management does not make technical decisions, does not override maintainer or TSC authority, and does not bypass the RFC or review process. Product management may facilitate processes such as bug triage, but technical classification and severity decisions remain the responsibility of maintainers.

Product management may also act as Product Owner (PO) for execution. When acting as PO, product management operates strictly within accepted RFC scope and does not override technical or governance decisions.

---

## Decision-Making

Decisions are handled through a risk-based escalation model: routine, low-impact work flows quickly, while high-impact or precedent-setting changes are explicitly reviewed.

- Minor changes (bug fixes, documentation, small improvements) are handled through the normal pull request process.
- Significant changes require an RFC and TSC approval.
- The TSC aims to make decisions by consensus. If consensus cannot be reached, a simple majority vote may be used.

Acceptance of an RFC indicates that a proposed technical approach is acceptable. Acceptance does not imply prioritization, scheduling, or a delivery commitment.

**One-Sentence Policy**:

> Product may facilitate processes and prioritize work, but technical correctness and severity decisions are owned by maintainers, and high-impact technical decisions are governed by the TSC.
> 

**Mental Model**:

> Product runs the process. Maintainers run tcorrectness. The TSC guards long-term direction.
> 

---

## Advisory Input

Enterprise and public-sector users may be invited to provide structured, non-binding feedback through advisory or consultation mechanisms. Advisory input does not grant decision-making authority and does not override governance processes.

---

## Code of Conduct

This project follows a Code of Conduct to ensure a welcoming and respectful community. All participants are expected to uphold these standards.

---

## Governance Evolution

As the contributor base grows, governance will evolve to include additional community maintainers and potentially expand the TSC. Any governance changes will be documented and discussed publicly.