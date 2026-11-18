---
title: Measuring Windows sluggishness
description: Building and validating a metric for experienced Windows sluggishness.
status: published
date: 2026-11-18
project: Glitchiness
featured: true
topic: "Measurement"
role: "Created the metric and foundational system; technical lead"
scope: "Windows responsiveness measurement and reduction"
projectStatus: "Metric in organizational use; reduction work ongoing"
outcome: "A perceptual metric, sampled telemetry, and validation in controlled and field studies."
---

Windows performance has many technical measurements. The harder question is whether those measurements describe what a person experiences while using the machine. A system can look acceptable through an individual counter and still feel sluggish.

I created Glitchiness to give Windows engineering a measurement of that experience. The work began with identifying observable manifestations of sluggishness and ended with an OS-wide telemetry and validation system used to set performance priorities. I now lead the ongoing program to expand its signals and reduce the behaviors it measures.

## Starting with the experience

There was no ready-made specification to implement. I had to connect a subjective experience to behavior that the operating system could observe.

I identified candidate system-level indicators, designed telemetry to collect them, and built on-device combinatorial state models to detect the relevant behaviors. Those models provided a way to check whether we were extracting the intended signals from OS activity before using them in the larger metric.

The distinction matters. Detecting a system condition and establishing its relationship to human experience are separate validation problems. A detector can behave consistently while measuring something that people do not experience as sluggishness.

## The measurement pipeline

The pipeline connects observations at several levels:

1. Define the user-experienced behavior to investigate.
2. Identify candidate OS signals and instrument their collection.
3. Use on-device state models to detect combinations of behavior and validate signal extraction.
4. Compare measured activity with reported and observed user experiences.
5. Combine supported signals into a composite perceptual metric.
6. Collect the metric through an OS-wide sampled telemetry pipeline.
7. Validate the result in controlled studies and in the field, then use it to guide performance work.

I built the foundational telemetry, state models, composite metric, and sampled collection pipeline. Combining the signals required a modeling process that accounted for their relationship to experience.

The score has to remain interpretable enough to guide engineering work. A composite that moves without helping engineers locate the underlying behavior would provide limited direction for a reduction program. The ongoing work therefore includes expanding the detected signals as well as reducing the measured problems.

A composite gives teams a shared measurement, but it also compresses different behaviors into one value. Investigating the underlying signals remains necessary when deciding what to fix. The measurement pipeline and the engineering investigation therefore have to work together.

## Validating against people and devices

Validation used both controlled and field studies. I worked alongside HCI and UX researchers in in-person sessions with users, correlating observed and reported experiences with the collected system activity. I also scaled experimental validation to thousands of internal Windows devices.

These settings answer different questions. In-person sessions connect the measurement to experiences that researchers can directly observe. Device-population experiments test its behavior in a broader operating environment. On-device state-model validation checks the extraction layer beneath both.

The metric covers the responsiveness behaviors its signals capture. Validation in controlled and field settings connects those signals to experience, while coverage remains a continuing engineering concern.

## From a metric to an engineering program

Glitchiness became an operational metric for Windows performance priorities. The work moved beyond calculating a score: teams could use the measurement to identify where to investigate and track the behavior they were trying to improve.

I created the original system before the team expanded. I now technically lead six engineers working on signal growth and the reduction program.

The production measurement system and the ongoing reduction effort have different statuses. The former is in organizational use. The latter continues. The current program expands the measurement and targets the underlying behaviors.

## Limits and lessons

Glitchiness measures a particular class of Windows experience. Its interpretation depends on the signals it captures and the evidence connecting those signals to people. It does not represent every aspect of user experience.

The central engineering lesson was to validate the links in the measurement chain separately: what the detector sees, what the composite expresses, and how both relate to observed experience. Operational adoption makes that discipline more consequential because the metric starts influencing which problems engineers work on.

The next phase is to expand coverage and reduce the underlying behaviors while preserving the connection between system activity and experience.
