---
step: N
name: Step Name
prerequisites:
  - step-NN completed
delegation:
  reads: "@reader when > 500 lines OR ≥4 files (per delegation-policy.md); direct otherwise"
  writes: "@writer when > 50 lines OR ≥2 files (per delegation-policy.md); direct otherwise"
  runs: "@executor for all bash (per delegation-policy.md)"
  memory: "@memory-controller for all memory operations"
  direct_justified: "[list step-specific exceptions, e.g. 'reading the <100-line spec-kernel directly']"
output_contract.citations: required | not-required
---

# Step N — Step Name

Step content here.

## Delegation
- **Reads:** delegate to @reader when files > 500 lines OR ≥4 files (per delegation-policy.md); direct otherwise
- **Writes:** delegate to @writer when > 50 lines OR ≥2 files (per delegation-policy.md); direct otherwise
- **Runs:** delegate to @executor for all bash commands (per delegation-policy.md)
- **Memory:** delegate to @memory-controller for all memory load/write/session operations
- **Direct I/O permitted for:** [list step-specific exceptions]
