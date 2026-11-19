---
title: Validating a metric of experienced performance
description: A detector, a composite score, and a person's experience need different kinds of validation.
status: draft
date: 2026-11-18
tags: [Measurement, Performance, Validation]
---

A system counter describes something the machine did. A person's report describes an experience. Building a useful performance metric means establishing the connection between them.

That connection has several layers. The instrumentation has to observe the intended behavior. The score has to represent the phenomenon being investigated. The result has to remain useful when engineers use it to make decisions.

## Start with a behavior people can recognize

An investigation needs a concrete experience to explain. A delayed response to input is different from an operation that takes a long time but leaves the interface responsive. Both can involve expensive work; their consequences for the person using the system differ.

Define the behavior before choosing convenient counters. Otherwise, the availability of a signal starts determining what the project calls performance.

## Validate extraction separately from meaning

A detector can reliably recognize a system condition without establishing that the condition explains a poor experience. These are separate questions:

- Does the instrumentation extract the event or state it is intended to observe?
- Does that observation have a supported relationship to the experience under investigation?

Controlled scenarios help test the first question. Observations of people using the system help test the second. Neither result should silently substitute for the other.

## Combining signals creates another model

A composite score expresses assumptions about which behaviors matter and how they relate. It needs validation beyond the correctness of its individual inputs.

Consider overlapping signals. Two indicators can reflect the same underlying event, so adding them can count that event twice. A frequent mild interruption and an infrequent severe interruption can also have very different effects despite similar averages.

The useful question is whether movement in the composite corresponds to the behavior it is supposed to represent. A score that moves predictably with a technical counter has established a relationship to that counter. Its relationship to experience still needs evidence.

## Use controlled and field evidence for different purposes

Controlled observations make it easier to examine a particular behavior and connect measurements with what a person reports. Field evidence exposes the metric to a wider range of devices, workloads, and operating conditions.

Neither setting removes the need to understand the sample. A population drawn from internal devices, for example, does not automatically represent every hardware configuration or usage pattern. More devices expand the evidence; they do not erase selection effects.

Look for counterexamples as well as agreement. Cases where the score looks healthy but the experience is poor can reveal missing signals. Cases where the score is poor but the experience is acceptable can reveal a condition being interpreted too broadly.

## Keep the metric useful after adoption

Once a metric guides engineering priorities, improvements to the score need to remain connected to improvements in the underlying behavior. Better detection can initially increase measured problems without making the system worse. A change in collection or population can also move the score without any change in software quality.

Preserve the definitions and collection context needed to explain those changes. Keep enough detail behind the composite to investigate why it moved.

A performance metric covers the behaviors supported by its signals and validation evidence. Its limits belong in engineering decisions, especially when a convenient single number starts being used for questions it was never tested to answer.
