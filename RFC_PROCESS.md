# Request for Comments (RFC) Process

This document describes how significant technical changes are proposed, discussed, and decided using the RFC (Request for Comments) process.

RFCs are intentionally higher-effort than informal ideas. They are required only when a change is ready for formal consideration and decision.

Early ideas, explorations, and feedback should be shared informally before committing to an RFC.

---

## **What Requires an RFC**

An RFC is required for changes that:

- Affect core behavior or public APIs
- Introduce new core concepts or abstractions
- Set long-term technical precedent
- Have broad impact across users, integrations, or deployments

Not all ideas require an RFC. See **How Work Flows** for guidance on early idea sharing and triage.

---

## **Who Can Propose an RFC**

Anyone may propose an RFC, including:

- Community contributors
- Maintainers
- Product
- Members of the TSC

---

## **RFC Champion**

An RFC is expected to have a **champion** once it is ready for formal consideration.

The champion may be the original author or another volunteer. Their responsibility is to:

- Drive the RFC forward
- Incorporate feedback
- Clarify trade-offs and open questions

Champions do not have decision-making authority. Maintainers and the TSC are expected to support first-time champions.

---

## **RFC Lifecycle**

### **Draft & Discussion**

- RFCs are created using the RFC template
- Discussion happens openly
- RFCs may evolve during discussion and early prototyping

---

### **Decision**

The Technical Steering Committee (TSC) is responsible for RFC decisions.

An RFC may be:

- **Accepted:** the proposed approach is technically acceptable
- **Rejected:** the approach should not proceed in its current form
- **Revision Requested:** further work or clarification is needed

Decisions are recorded publicly with a clear rationale.

---

## **From Accepted RFC to Implementation**

Once an RFC is accepted, responsibility transitions from governance to execution.

- The **TSC** confirms that the proposed approach is technically acceptable and records the decision.
- **Product** determines whether, when, and how the accepted RFC is translated into delivery work, based on priorities and available capacity.
- **Engineering** owns implementation details within the scope of the accepted RFC.
- **Maintainers** review implementation for correctness, quality, and alignment with the accepted decision.

Acceptance of an RFC does **not** imply prioritization, scheduling, or a delivery commitment.

---

## **Guiding Principles**

- RFCs exist to clarify decisions, not to block progress
- Escalate decision-making with impact
- Keep RFCs lightweight and focused
- Prefer early discussion over late surprises