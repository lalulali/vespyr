# Product Specification Instructions & Guidelines

This reference document defines the complete structural specifications, requirements, component design patterns, and edge-case protocols for generating a product design specification within the Vespyr agent swarm. The `@product-designer` agent reads this when creating specs.

---

## 1. Output Format Rules

When generating the product design specification:
*   **Machine-Readable (Markdown):** Populate and save the markdown spec to `artifacts/output/02-strategy/product-spec.md` using the compressed skeleton template.
*   **Human-Readable (HTML):** Write the same structural content into `.opencode/templates/product-spec-template.html` and output the HTML version. Both files must match exactly in content and hierarchy.

---

## 2. Structural Requirements

### 2.1 Traceability Guidelines
Every section of the product specification must explicitly trace back to a business-level PRD feature and a developer-level User Story to ensure bi-directional alignment:
*   Use a traceability table mapping spec sections to PRD features and story IDs in Section 1.5.
*   In Section 3 (Screen-by-Screen Specifications), explicitly document the **Associated User Stories** (e.g., `Associated User Stories: [US-XXX], [US-YYY]`) directly under each screen title.
*   In Section 6 (Edge Cases & Error Handling), ensure all system-level edge case scenarios trace to a specific developer `Story Ref`.
*   If a spec section does not map to an existing story, halt and notify `@product-manager` to generate it first.

### 2.2 Machine Learning Integration
For products incorporating ML:
*   Define the exact entry point in the user flow where the ML prediction is displayed.
*   Clearly define graceful fallback behaviors if the ML system times out or experiences service failure.
*   Define how different confidence levels are presented to the user.

---

## 3. User Flows and Diagramming

### 3.1 Flow Layout
*   Define three categories of flows: **Primary Happy Path**, **Alternative Flows**, and **Error Flows**.
*   All flows must be represented visually using Mermaid diagram syntax.
*   Every flow diagram must have a distinct start screen and end screen, with all branches/decisions fully labeled.
*   All error flows must show recovery paths; never leave the user in a dead end.

---

## 4. Screen-by-Screen Specifications

For every screen specified in the flows, document the following elements in exact detail:

### 4.1 Contents and Layout
*   **Purpose:** State the singular action the user is trying to accomplish.
*   **Content Inventory Table:** Document every UI element, its type, data source, and validation limits (e.g., character counts, required vs. optional).
*   **ASCII Wireframe:** Provide a structured visual block representation of the screen hierarchy.

### 4.2 UI/UX States
Define the exact behavior and visual treatment for:
*   **Default State:** Empty input fields, placeholder text, and enabled actions.
*   **Loading State:** Disabled fields, spinner visual on submission buttons, and 10s maximum timeout behaviors.
*   **Success State:** Toast alerts, micro-animations, database persistence confirmation, and downstream navigation redirects.
*   **Validation Errors:** Inline red alert text, red input borders, and focus placement rules.
*   **Server Errors:** Page-level red banner warnings, form-retention rules, and Retry/Cancel action recovery mechanisms.
*   **Empty State:** Informative text, illustrations, and clear call-to-actions (CTAs).
*   **ML State:** Skeletons during inference, confidence-based suggest badges, and "AI unavailable" fallback notices.

### 4.3 Accessibility Standards (WCAG 2.1 AA)
*   **Keyboard Navigation:** Document the tab focus order of every interactive input.
*   **Screen Reader Integration:** Ensure every visual element has associated `<label>` or `aria-label` definitions.
*   **Contrast & Motion:** Maintain a 4.5:1 minimum color contrast ratio. Disable animations when the user's OS has `prefers-reduced-motion` enabled.

---

## 5. Interaction Details

### 5.1 Global Interactions
*   **Pull to Refresh:** Action to swipe down to trigger reload; handle offline by showing cached data.
*   **Offline Banners:** Top-mounted red banner when connection drops, disappearing automatically upon reconnection.
*   **Session Expiry:** Expired authentication tokens must display a modal dialogue and preserve form state in local storage before redirecting.

### 5.2 Component Interactions
*   **Infinite Scrolling:** Trigger loader when scrolled near bottom, append next 20 items, show error retry if network fails, show "No more items" text when exhaustively loaded.
*   **AI Streaming:** Show progressive typing reveals or indicators; allow the user to cancel operations.
*   **Confidence Badges:** Display predictions >80% directly, 50-80% as "Suggested", and <50% only as suggestions requiring manual user confirmation.

---

## 6. Design System Tokens

### 6.1 Typography Scale
*   **H1 (Page Title):** Inter Font, 24px Size, 600 Weight, 1.3 Line Height.
*   **H2 (Section Header):** Inter Font, 18px Size, 600 Weight, 1.4 Line Height.
*   **Body (Primary text):** Inter Font, 14px Size, 400 Weight, 1.5 Line Height.
*   **Caption (Helper text):** Inter Font, 12px Size, 400 Weight, 1.4 Line Height.

### 6.2 Color Palette Tokens
*   `--color-primary`: `#3B82F6` (Action triggers, links, active rings)
*   `--color-success`: `#10B981` (Valid states, success notices)
*   `--color-error`: `#EF4444` (Validation warnings, system errors)
*   `--color-warning`: `#F59E0B` (Non-blocking notifications)
*   `--color-text-primary`: `#1F2937` (Titles, body text)
*   `--color-text-secondary`: `#6B7280` (Placeholders, disabled text)
*   `--color-background`: `#FFFFFF` (Canvas backdrop)
*   `--color-surface`: `#F3F4F6` (Cards, panels)

### 6.3 Spacing Scale
*   `--space-xs`: 4px (tight gaps, micro padding)
*   `--space-sm`: 8px (inline element spacing)
*   `--space-md`: 16px (standard content padding)
*   `--space-lg`: 24px (large section separations)
*   `--space-xl`: 32px (page margin margins)

### 6.4 Component State Dressings
*   **Hover:** 10% darker surface overlay.
*   **Active/Pressed:** 20% darker overlay with a 1px inner shadow.
*   **Focus:** 2px solid `--color-primary` outline ring.
*   **Disabled:** 50% opacity, `not-allowed` pointer behavior.

---

## 7. Edge Cases & Error Handling Matrix

### 7.1 System-Level Edge Cases
*   **Submission Interruption:** Save input to localStorage, display a reload option.
*   **Double Clicks:** Disable primary action button immediately upon first click.
*   **Extreme Scale:** Handle lists of 10,000+ items using a paginated 50-item system.
*   **Text Formatting:** Strip rich-text formatting silently when pasting into plain text areas.
*   **Oversized Uploads:** Reject files above 50MB with user-facing warnings.

### 7.2 Content Edge Cases
*   **Long Strings:** Truncate with ellipsis and show full text in tooltips.
*   **Zero States:** Show custom empty graphics and CTAs.
*   **Special Characters:** Prevent script injection, but safely render all emojis and unicode characters.
