# The Assessment

**Live:** https://vishnuvsdevtech.github.io/people-analytics-poc/

A simulation of what an Indian IT services company actually holds on its people,
and what a "workforce assessment" looks like when it is assembled from those
records. **48 fictional employees. No real person, project or client.**

## The dataset

One row per person, with the fields a real stack produces:

| Source | Fields |
|---|---|
| Attendance terminals (ZKTeco / Matrix COSEC class) | late arrivals per 30 days, average in-time, missed punches, WFH days, leave |
| HRMS (Orbit / Darwinbox / Keka class) | department, band, project, manager, location, tenure, CTC, compa-ratio |
| Timesheets | days logged out of 30, hours/day, **auto-populated entries left unedited**, misassigned project codes, log-quality score |
| Delivery telemetry | utilisation %, billable flag, tickets closed, PRs merged, incidents, client rating |
| Appraisal | last rating, potential band, promotion in 24 months, engagement score, manager changes |

## The argument the page makes

A risk score is a weighted sum:

```
risk = w1·attendance + w2·worklogs + w3·performance + w4·utilisation + w5·engagement
```

Move the weights and **a different set of people gets cut, from identical data.**
The Risk register tab lets you do exactly that: three presets, five sliders, a
cut-size slider. The Overview tab shows the consequence directly — how many
people rated 4.3 or above land in the cut under a compliance-led model versus a
performance-led one.

That is the honest finding. The tool is not the decision; the weights are, and
the weights are set by whoever configures the dashboard, usually without an
employee in the room.

The dataset is seeded so this is visible rather than merely claimed: three people
are rated 4.6 with a 4.8 client rating and 94% utilisation, and also have 11–16
late arrivals, 18/30 days logged and log quality of 41–52. Two others have
flawless records and ratings near 2.1. A compliance model cuts the first group; a
performance model cuts the second.

## Modelled on what these tools actually ship

- **Darwinbox Atlas** — report builder over suite transactions, natural-language
  queries, attrition forecasting as the headline predictive feature.
- **Keka** — attendance dashboard (trends, exceptions), time tracking tied to
  project setup and client billing.
- **Visier** — predictive attrition ("respond to risk before it becomes rate"),
  workforce planning on a consolidated employee record.
- **SAP SuccessFactors** — Matrix Grid (the nine-box) and calibration sessions,
  where ratings are compared and adjusted across a population.
- **ZKTeco / Matrix COSEC** — biometric and face terminals pushing punches to a
  server, with the usual proxy-punch signals.
- **Jira / Git telemetry** — the activity counters that make "what did they
  actually do" look measurable.

## What this is not

- Not an accusation about any specific company. The dataset is generated.
- Not a working HR system: no auth, no persistence, everything client-side.
- Not a validated model. The scoring is deliberately simple and transparent so
  the *weights* are the visible thing, not the maths.

## Why it is worth looking at

Because the failure mode is quiet. Nobody is fired by an algorithm; a person is
fired after reading a table the algorithm sorted. Everything upstream of that
table — which fields exist, which are weighted, which are ignored — is a policy
decision that never gets written down as one.
