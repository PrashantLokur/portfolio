---
title: "Presenting at AVEC'26 in Tsukuba"
date: "2026-09-03"
summary: "I'll be at the 17th International Symposium on Advanced Vehicle Control in Tsukuba next week, presenting Linear Quadratic Regulator Control for Integrated Thermal Energy Management in Battery Electric Vehicles."
---

Next week I'll be in Tsukuba, Japan, for the 17th International Symposium on
Advanced Vehicle Control — AVEC '26, running from 7 to 11 September at the
Tsukuba International Congress Center.

I'm presenting *Linear Quadratic Regulator Control for Integrated Thermal
Energy Management in Battery Electric Vehicles*.

## Why this problem

Thermal management is one of the quieter levers on electric vehicle range. The
battery wants a narrow temperature band, the cabin wants comfort immediately,
and the power electronics want to stay under their limits — and every one of
those demands draws from the same pack.

Model predictive control handles that coupling well, and most of my research so
far has gone that way. But it asks a lot of the hardware, and the question that
keeps coming back is not whether the optimum exists — it's how much you give up
by making it computable on a production ECU.

## The part I find interesting

This isn't a textbook LQR with weights picked by hand until the response looks
reasonable. The weights come from the Hessian of the power curve, so the
quadratic cost is a local second-order approximation of the actual energy
consumption rather than a tuning proxy for it.

That's the trade I care about: the controller stays cheap enough to evaluate at
every step on real hardware, but the thing it optimizes is tied to the physics
of what the system actually costs to run — instead of a set of gains that
happened to work on the test cases.

## If you'll be there

AVEC has been running since 1992 and is one of the better venues for vehicle
dynamics and control work, with a genuine mix of industry and academia. If
you're attending, I'd be glad to talk — about thermal management, predictive
energy optimization, or anything adjacent.

The AVEC proceedings are published by JSAE with open access on J-STAGE, so the
paper will be publicly readable.
