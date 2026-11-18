---
title: Forecasting and software for Windows engineering decisions
description: Fleet quality tracking, device-population forecasting, and performance decision software for release and hardware planning.
status: published
date: 2026-11-18
topic: Statistical systems
role: Design and implementation
scope: Forecasting, regression attribution, and decision software
projectStatus: Built and used for engineering decisions
featured: false
---

## Different questions need different models

I built forecasting and regression-attribution systems used for Windows quality tracking. The work covered population-scale regression attribution and separate device-population and sales forecasting, in partnership with sales and marketing.

Those tasks ask different questions. A population forecast estimates the future shape of the device population. Regression attribution investigates where a quality change came from. Each needs an evaluation matched to the question it answers.

Device-population forecasts backtested at R² = 0.90 across active silicon.

## Making performance evidence usable

I also built a performance decision platform for release decisions and next-generation hardware and component planning. It normalized internal and partner data feeds and ranked regressions, improvements, and release blockers in a Next.js interface.

The platform replaced weeks of status reviews with automated analysis. Normalization and ranked results gave the decision workflow a shared representation of the evidence it needed to inspect.

The engineering work included the platform's own reliability. Failures caused by the decision software fell from approximately two per day to effectively none.

## Interpreting the results

A forecasting statistic, an attribution result, and a ranked release blocker serve different decisions. Their scope needs to survive the trip from a model or data pipeline into a user interface.

## Earlier systems work

At Apple, I worked as an AI/ML engineering intern on Siri Search in summer 2019. I built recommender and data systems for Siri Knowledge Cards, including a Hive/Impala refresh pipeline, and validated outcomes through production A/B tests. The work increased entity coverage by 214%, positive abandonment by 35%, and engagement by 7%.

During software engineering internships at Google in summers 2017 and 2018, I built Spanner-backed feedback infrastructure and real-time quality dashboards for Search. For Cloud, I built a multithreaded gRPC load generator and scheduler, increasing network performance by 31%.
