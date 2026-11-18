---
title: Predicting failures before they interrupt the user
description: An internally deployed on-device model for Windows performance and memory failures, with scheduler interventions and a separate distributed evaluation program.
status: published
date: 2026-11-18
topic: On-device ML
role: Implementation and internal deployment
scope: Windows performance and memory failures
projectStatus: Internal builds only
featured: false
---

## Prediction and intervention

I built and internally deployed an on-device small language model to predict imminent Windows performance and memory failures. Predictions were connected to scheduler mitigation so the system could act before a targeted failure began.

The deployment covered approximately 3,000 internal Windows devices. It predicted 71% of targeted failures at least 20 seconds ahead and 92% at least five seconds ahead. Scheduler interventions mitigated approximately 16% of targeted failures before onset.

The prediction figures describe coverage of targeted failures at two lead-time thresholds. The intervention result measures targeted failures mitigated before they began.

## Evaluating an intervention

Lead time matters because the system needs time to take a useful action. A prediction that arrives too late can identify the right failure without preventing its effect on the user.

Prediction coverage, false-positive rate, intervention benefit, and intervention cost answer different evaluation questions. Together, they determine whether the system gives the scheduler a useful opportunity to act.

The model ran on internal Windows builds.

## Distributed evaluation of Windows AI features

In a separate project, I owned a distributed evaluation platform for eight AI-powered Windows features. Evaluation ran across approximately 11,000 internal devices and hundreds of lab machines, catching three critical regressions before retail release.

These projects required different kinds of evidence: prediction lead time and successful intervention for the on-device system, and regression detection before release for the distributed evaluation program.
