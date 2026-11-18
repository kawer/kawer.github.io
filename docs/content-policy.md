# Content provenance and publication policy

Reviewed against the public website and `docs/Lazaro_Kawer_Resume.pdf` on 13 November 2026. The PDF is retained unchanged. Its public availability is not treated as approval to republish internal employer detail.

## Public content

- `content/profile.json`: name, current public title, employment history, broad technical scope, education, and profile URLs come from the existing website and public résumé. Experience periods describe tenure; the Microsoft summary separately identifies the role progression.
- `content/work/production-ai-evaluation.md`: broad evaluation and agent-workflow scope only, sourced to the public résumé.
- `content/work/on-device-predictive-ml.md`: broad predictive-ML scope only; explicitly preserves the internal-only deployment boundary. Makes no claim about model training or a retail release.
- `content/work/statistical-decision-systems.md`: broad forecasting, attribution, and decision-system scope only, sourced to the public résumé.
- Work-page dates record preparation for this redesign, not project launch dates. These pages are short public overviews, not complete technical case studies.
- Apple and Google descriptions preserve internship status. Quantitative outcomes are not repeated.

## Unpublished material

Files with `status: draft` are editorial sources only. The build must exclude them from generated routes, listings, sitemap, copied assets, and feeds. A `noindex` page is insufficient: drafts must not exist in the output.

Three technical case-study outlines contain the requested sections and remain unpublished until supporting detail is approved. The writing section has an editorial outline and a review stub for the existing taxonomy essay; neither is a published article.

The original taxonomy essay contains production-system claims and an explicit confidentiality note. Retain its source in git history, but do not copy the old blog directory into the build output. Preserve the old URL with a safe notice pointing readers to Writing. Do not imply that the essay passed a new disclosure review.

## Publication gate

Before changing a draft to `published`:

1. Verify every technical and biographical claim against an identified source.
2. Confirm permission to disclose employer details independently of their appearance in the résumé or old website.
3. Distinguish individual contribution from team results.
4. Verify dates, metrics, units, baselines, and limitations; omit unsupported claims.
5. Complete placeholders and review the final generated page and metadata.
6. Confirm that code, figures, fixtures, and source files contain no internal information.

Do not invent publications, architectures, training experience, deployments, outcomes, team sizes, or ownership. Prefer omission to a plausible reconstruction.

Open factual and disclosure questions are recorded outside the repository in `/workspace/private-review.md`. Do not commit that document or copy it into generated assets or a public PR description.
