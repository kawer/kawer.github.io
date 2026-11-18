---
title: Evaluating agents that propose OS fixes
description: Layered grading, source grounding, model selection, and empirical validation for code-optimization agents.
status: published
date: 2026-11-18
featured: true
topic: "AI evaluation"
role: "Architect, foundational implementation, and evaluation technical lead"
scope: "Evaluation within a broader OS agent engineering initiative"
projectStatus: "Operating infrastructure; model-training research ongoing"
outcome: "Developer fix acceptance rose from 54% to 78% after framework introduction."
---

An agent can explain a performance problem convincingly and still identify the wrong cause, propose an infeasible fix, or move a cost elsewhere in the system. Evaluating that output requires evidence about the code and operating environment, followed by evidence about what happens when a proposed change is tested.

At Microsoft, I designed and built the evaluation architecture for agents working on operating-system performance, power, reliability, and memory. I own the evaluation vertical within a broader engineering initiative. Other teams build and operate parts of the agent ecosystem and the lab infrastructure it uses.

I implemented the foundational system for more than six months before scaling the evaluation team. I now technically lead four engineers across evaluation architecture, orchestration, rubrics, judges, calibration, reward signals, experiment design, model comparison, and productionization.

## Several kinds of correctness

The agents investigate telemetry, CPU and GPU traces, stack traces, and available code context. Their output can fail at different levels. A tool call can be invalid. An answer can satisfy the expected schema but misread an allocation path. A correct diagnosis can lead to a change that fails to improve the target workload.

I built the evaluation around those distinctions.

**Deterministic validity checks** catch objectively invalid results: incorrect tool use or access, schema and format failures, syntactic problems, and violations of output constraints. These hard gates prevent invalid attempts from receiving credit through a persuasive explanation.

**Domain rubrics** assess the technical content. The criteria come from experts and reference cases in the relevant domain. They cover questions such as whether an agent found the critical path, traced allocation provenance, identified a memory leak, or proposed a feasible fix. Different domains need different criteria.

**Source-grounded judges** receive relevant code and known-good expert fixes. They compare the proposed diagnosis or change with supporting evidence and reference cases. I calibrated these judgments against expert-validated answers and analyzed failures and disagreements.

**Cross-model comparison** makes uncertain judgments visible. Agreement across models is useful evidence, but shared training and correlated errors mean it cannot establish correctness on its own.

Aggregate scoring combines structural failures, domain quality, disagreement, and judge signals to compare models, prompts, tools, context budgets, and harness changes.

## Calibration continues after an offline score

Developer outcomes provide another source of evidence. Filed bugs, acceptance decisions, rejection reasons, and review conversations help identify gaps in the rubric and judge calibration.

A rejected fix is not automatically a wrong fix. Feasibility, kernel constraints, and engineering priority can affect the decision. Treating every rejection as a correctness label would teach the evaluation system to collapse several different questions into one score.

## Revision with a regression check

The evaluation system also supplies feedback for revising agent workflows. A completed attempt receives a score and diagnostic feedback. Another model or interpreter examines what was missing, such as an omitted repository lookup or the original allocation point behind a recursive memory stack, and proposes changes to prompting, trace context, or tool use.

A completed agent session cannot be resumed in this workflow. The next attempt starts fresh with the original inputs and corrective context. We rerun the failing case and the prior reference corpus, then have a domain expert approve changes before adoption.

That wider rerun matters because a change that repairs a single failure can regress cases the harness already handled. The operating loop revises the harness or its inputs under human review.

## Comparing production model configurations

I led a comparison of six model configurations using paired non-inferiority gates, predeclared quality criteria, source-grounded judgments, and controls for model-family bias. Only one candidate passed every predeclared quality gate.

Developer fix acceptance improved by 18% with the production model change. In a separate comparison, acceptance rose from 54% to 78% after the evaluation framework was introduced. That before-and-after result measures a change in developer outcomes; it does not isolate evaluation as the sole cause.

The self-service harness also shortened prompt and evaluation iteration from more than two weeks to one to two days. Vertical owners could compare prompts, tool access, context, and workflows with the same grounded quality framework.

## Testing the proposed optimization

Diagnosis evaluation and empirical optimization validation answer different questions. I contributed to a separate loop that checks whether an implemented code change improves the system under test.

That loop retrieves the relevant code and branch, applies a candidate change, builds the branch, and runs controlled lab scenarios repeatedly. It uses existing branch-selection and heterogeneous lab capabilities operated by other teams.

Depending on the scenario, the tests run hundreds to thousands of trials across older and newer machines under simulated user load. Comparisons account for the trace's branch provenance and relevant branch, retail, or population baselines. The analysis inspects P50, P90, P99, tail behavior, memory leaks, and other targeted measures.

Confidence intervals, significance testing, minimum improvement thresholds, and workload-specific regression constraints inform the decision.

The decision remains multiobjective. A change that addresses severe P99 failures or closes a memory leak may justify a modest deterioration in another percentile. An isolated numerical improvement is insufficient if it violates a workload's regression constraints.

When a change fails empirical validation or produces an unexpected outcome, the observed results return to the optimization evaluation loop. A domain-specific judge and human experts examine them and guide the next iteration. Human experts remain part of the review process.

## What is operating, and what is still in progress

The evaluation infrastructure, self-service experiments, model-selection work, and reviewed revision loop are operating work. I am now working on fine-tuning agent models with evaluation and reward signals, and on a smaller specialized guidance model. Both are research in progress.

The broader lesson is that an evaluation stack needs several kinds of evidence. Structural gates, expert criteria, source context, developer decisions, and measured system behavior each reveal failures the others can miss. The engineering work is in making those differences inspectable and preserving the point at which measured behavior can veto a plausible answer.
