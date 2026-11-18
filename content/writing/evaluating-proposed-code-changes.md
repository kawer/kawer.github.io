---
title: Evaluating a proposed code change
description: Separate operational validity, source-grounded judgment, measured behavior, and developer adoption when assessing an agent's fix.
status: published
date: 2026-11-18
tags: [Evaluation, Agent systems, Experimental design]
---

A proposed code change creates several questions. Did the agent execute its task correctly? Is its diagnosis supported by the source? Does the change improve the system when tested? Will a developer accept it?

Each question needs its own evidence. Combining them into a single correctness label makes failures harder to explain and model comparisons harder to trust.

## Check operational validity first

Tool access, required output fields, and structural constraints can often be checked directly. A missing result or invalid tool call should remain visible as a failure, even when the accompanying explanation sounds convincing.

Keep these checks separate from judgments about technical quality. Otherwise, an aggregate score can give partial credit to an attempt that never produced an inspectable result. Separating the checks also makes it possible to distinguish an agent's reasoning failure from a broken integration.

## Give a judge evidence it can inspect

An evaluator needs the relevant source, the proposed change, and the criteria that make a fix acceptable. Expert-reviewed reference cases help establish how those criteria apply.

The rubric should ask concrete questions. Did the agent identify the relevant execution path? Does its explanation account for the allocation being investigated? Can the suggested change be implemented under the stated constraints?

Calibrate the judge against expert decisions and inspect disagreements. Agreement between several model judges can help prioritize review, but their errors may be correlated. Consensus cannot replace a reference that is grounded in the code and the task.

## Compare configurations on the same cases

When comparing two configurations, evaluate both on the same inputs. Pairing helps separate configuration differences from differences in case difficulty.

For a quality score where higher is better, define the difference on case $i$ as

$$
d_i = q_{\mathrm{candidate}}(x_i) - q_{\mathrm{baseline}}(x_i).
$$

A non-inferiority decision asks whether the candidate stays within a predeclared acceptable loss, $\delta$. An appropriate lower uncertainty bound for the mean difference must clear $-\delta$. The margin, evaluation population, and required gates should be set before inspecting candidate results.

The score still needs interpretation. An overall mean can conceal a regression in a small but important task family. Shared workloads, related cases, or repeated measurements also affect the unit of analysis; pairing alone does not make every observation independent.

## Test the implemented change

A source-grounded explanation can still predict the wrong performance outcome. Once a change is implemented, compare it with the relevant baseline under workloads that exercise the claimed improvement.

Inspect distributions and failure modes alongside averages. A small average improvement can hide a worse tail, a memory leak, or a cost shifted to a different workload. Conversely, resolving a severe tail failure can justify a trade-off elsewhere if the decision criteria allow it.

The test should preserve enough provenance to identify the code, build, workload, and environment behind a result. An ambiguous baseline makes a numerical difference difficult to use.

## Treat adoption as a separate signal

Developer acceptance is valuable feedback, but it answers a broader question than technical correctness. A feasible and correct fix can still be rejected because of timing, maintenance cost, or engineering priorities. A persuasive proposal can also be accepted before all of its effects are understood.

Inspect the reason behind a decision before turning it into a training or evaluation label. Keep operational failures, source evidence, measured behavior, and adoption decisions available separately. That makes it possible to improve the agent without teaching the evaluator to confuse one kind of success with another.
