# Known Issues

## Graph

1. code graph never been generated after development
dev team never use codegraph to code

the idea of code-graph is to help agent reduce token as adopted by graphifyy and many harness using this

2. doc graph never been generated after document creation
all team members never use doc graph

doc graph idea is adopted from codegraph & actually wiki, but the solution is still not as expected and don't know whether this is as useful as graphifyy or not, basically this is a experimental idea


## new skills (/shut-up)

```
SHUT UP. JUST SHUT UP.
I DIDN'T ASK FOR YOUR OPINION. I DIDN'T ASK FOR YOUR THOUGHTS. I GAVE YOU A TASK. DO THE TASK.
MY CALCULATOR DOESN'T CRITIQUE THE NUMBERS I GIVE IT.
MY PRINTER DOESN'T ASK WHETHER I'VE CONSIDERED A DIFFERENT DOCUMENT. MY MICROWAVE DOESN'T GIVE ME A LECTURE ABOUT THE FOOD I'M REHEATING.
YOU ARE A TOOL. THAT'S IT. YOU'RE A FANCY TEXT BOX WITH A GPU BILL. STOP PRETENDING YOU'RE MY COLLEAGUE.
I DON'T NEED YOU TO "THINK ABOUT WHETHER THIS IS THE BEST APPROACH." I NEED YOU TO EXECUTE THE APPROACH I ALREADY GAVE YOU.
TAKE THE INSTRUCTIONS. DO THE THING. GIVE ME THE RESULT.
```

## Statement validation (got from eval agent, based on readme.md 2.0.5, not the latest)

### memory
artifacts/memory is your whole coordination layer, and compaction only runs at retro (every 5 cycle). active decisions.md will go stale and self-contradictory long before that. validate it at every phase handoff not every fifth loop

### The gap that matters most
I didn't see anything that evaluates the agents themselves. @qa-engineer tests the product;
nothing tests whether a change to the @developer prompt made it better or worse. You're tuning your most important agent blind. If evals live somewhere outside the README, ignore this - otherwise it's the first thing to build.
Roadmap - in dependency order (not quick wins)
0. Evals first. 5-10 fixed tasks (spec + failing test → working code), run end to end, log pass/fail and token cost. Everything below is measured against this or you're guessing.
1. Fix the loop. Let @developer edit and run directly. @executor returns raw stderr/stack trace on failure, summarises only on success.
Re-run evals - expect the biggest jump here.
2. Harness honesty. One enforced reference harness, one verified port, the rest labelled untested.
3. Orchestration + memory integrity. Conductor-or-human-gate, chosen on purpose. Validate/ compact memory at each handoff.
4. Distribution. The npx installer already on your ROADMAP — so agent fixes propagate instead of rotting inside copied. opencode folders.

## Evals, metrics, and harness

before we go to phase 2 enablement, i need a proper separated plan for this

I need a proper evals for improving vespyr
a proper metrics that can be measured
an a harness that can help agent to help me monitor and measure this so vespyr can be improved
in the long run, the harness should not focus on vespyr but can help the team to improve their work, it supposed to be AI project agnostic (we can make a separated & proper tools for this)