# Product Prioritization Frameworks

This reference document serves as the canonical guide for prioritizing product requirements, features, and user stories within the Vespyr agent swarm. The `@product-manager` agent loads these guidelines on demand.

---

## 1. MoSCoW Prioritization

The MoSCoW method categorizes requirements to manage scope discipline and ensure core viability of each release.

### Categories

#### Must-Have (M)
*   **Definition:** Non-negotiable requirements that are critical for the product or milestone to be viable. Without them, the release is a complete failure or is unsafe/illegal.
*   **Rules:**
    *   No workarounds can exist.
    *   Directly tied to the core value proposition.
    *   Examples: Basic user authentication, PCI-compliant payment processing on checkout, database persistence.

#### Should-Have (S)
*   **Definition:** Important but not vital requirements. They add significant value but the release can still succeed without them.
*   **Rules:**
    *   Workarounds can exist (even if painful or manual).
    *   If resources or timelines shrink, Should-haves are the first candidates to be deferred or cut.
    *   Examples: "Forgot password" self-service link (could temporarily be handled manually by support), email notifications, analytics tracking.

#### Could-Have (C)
*   **Definition:** Desirable requirements that are nice-to-have. They improve user experience but have lower impact than Should-haves.
*   **Rules:**
    *   Only implemented if surplus time/budget allows.
    *   First to be cut if any risk to Must/Should items arises.
    *   Examples: Dark mode, social sharing buttons, micro-animations, premium custom themes.

#### Won't-Have (W)
*   **Definition:** Requirements explicitly agreed to be out-of-scope for the current milestone or release.
*   **Rules:**
    *   Explicitly documented under the "Out of Scope" sections to prevent creep.
    *   Re-evaluated in future planning sessions.

---

## 2. RICE Scoring Matrix

RICE is a quantitative framework designed to remove subjective bias from prioritization by calculating a numerical score for each initiative.

$$\text{RICE Score} = \frac{\text{Reach} \times \text{Impact} \times \text{Confidence}}{\text{Effort}}$$

### Scoring Criteria

#### Reach
Estimated number of users affected within a specific time period (e.g., per quarter).
*   *Scale:* Exact number of active users or transactions expected.
*   *Example:* 10,000 monthly active users use the dashboard; a new dashboard widget has a Reach of 10,000.

#### Impact
The subjective/qualitative value this adds to each individual user.
*   *3.0* = Massive impact (high conversion rate shift, major retention driver)
*   *2.0* = High impact
*   *1.0* = Medium impact
*   *0.5* = Low impact
*   *0.25* = Minimal impact

#### Confidence
The level of data-backed certainty regarding Reach, Impact, and Effort estimates.
*   *100%* = High confidence (supported by user research, direct feedback, metrics, and technical prototypes)
*   *80%* = Medium confidence (supported by proxy data, general market trends, or minor design validations)
*   *50%* = Low confidence (pure assumption or intuition)
*   *<50%* = Unacceptable/Wild guess (requires exploratory research first)

#### Effort
The total engineering and product team time required to design, implement, test, and deploy the feature.
*   *Scale:* Person-months or story-point sizes.
*   *Examples:* 1 person-month = 1.0; 2 weeks = 0.5; 3 months = 3.0.

---

## 3. Kano Model

Categorizes features based on how users perceive them and how they relate to customer satisfaction.

### Feature Categories

1.  **Must-Be / Basic Expectations:** Features that users expect as standard. Their presence does not increase satisfaction, but their absence causes extreme dissatisfaction.
    *   *Example:* A messaging app that sends messages; a login form that works.
2.  **Performance / One-Dimensional:** Features that result in satisfaction when fulfilled and dissatisfaction when not. Satisfaction is directly proportional to how well they perform.
    *   *Example:* Page loading speed, battery life, search accuracy.
3.  **Attractive / Delighters:** Features that provide unexpected satisfaction. Users do not expect them, so their absence causes no dissatisfaction, but their presence creates absolute delight.
    *   *Example:* Beautiful micro-interactions, automatic categorization of expenses.
4.  **Indifferent:** Features that users do not care about. They add cost without adding perceived value. These should be removed.

---

## 4. Value vs. Effort Matrix

A qualitative 2x2 prioritization matrix used to classify initiatives for quick roadmap placement.

```
          High  |-----------------------|-----------------------|
                |     "Quick Wins"      |    "Major Projects"   |
                | (High Value, Low Eff) | (High Value, High Eff)|
                |                       |                       |
                |   Action: Do first    |   Action: Schedule    |
    V           |                       |   & break down        |
    A           |-----------------------|-----------------------|
    L           |     "Fill-ins"        |   "Thankless Tasks"   |
    U           | (Low Value, Low Eff)  | (Low Value, High Eff) |
    E           |                       |                       |
                |   Action: Defer/Drop  |   Action: Avoid/Kill  |
          Low   |-----------------------|-----------------------|
                Low                                           High
                                 E F F O R T
```

---

## 5. Dependency Analysis & Sequencing

Before prioritizing features, dependencies must be identified and mapped to ensure efficient sequencing:

1.  **Logical Dependencies:** Feature B cannot exist without Feature A (e.g., checking out requires a cart).
2.  **Resource Dependencies:** A feature requires specialized skills (e.g., an ML model requires the `@ml-engineer`).
3.  **External Dependencies:** Blocked by third-party APIs, compliance audits, or platform store approvals.
4.  **Sequencing Rules:**
    *   Always schedule foundation work (APIs, data schemas) one sprint prior to consumer UI development.
    *   Flag circular dependencies immediately for refactoring.
