# 1) Use Case

## 1.1 Project Summary
- **Project Name:** SUBLET
- **Version / Update Tag:** v2.0.0
- **Date:** 2026-06-15
- **Owner / Team:** Hackathon organizers
- **Short Description:** A **multi-hackathon** web app. An admin creates hackathons, each with
  its own details, tracks, sponsors, selected judges and team-matching run. Within a hackathon,
  participants optionally get matched into balanced teams, submit one project each, and
  admin-selected judges view and score projects. Admins can reset a hackathon (delete all
  projects + judging data) or delete it entirely.

## 1.2 Problem Statement
- **What problem does this project solve?** Running a hackathon needs four things in one
  place: people forming teams, submitting projects, restricting who can see/judge them, and
  scoring fairly. This app provides all four.
- **Who are the target users?**
  - **Participants** — register, pick a hackathon, find a team, submit a project.
  - **Judges** — people the admin selects **per hackathon** to view details and score projects.
  - **Admin** — organizer with full control: creates hackathons and manages their config, users,
    judges, matching, and reset/delete.
- **Why is this important?** Team formation is hard (people don't know who complements them),
  and judging needs controlled visibility and a consistent rubric. Automating matching and
  enforcing one-project-per-person and judge-only visibility removes manual coordination.

## 1.3 Goals and Success Criteria
- **Business Goals:**
  - Let participants self-organize into balanced teams without organizer effort.
  - Provide a single, fair, auditable judging process.
- **Technical Goals:**
  - One adapter that runs on SQLite locally and Neon/Postgres in the cloud, no code changes.
  - AI-assisted similarity for team matching, with an offline fallback so nothing blocks.
  - Positive **and** negative automated tests for every workflow.
- **Success Metrics (KPIs):**
  - 100% of workflows covered by passing tests (currently 40/40).
  - Each participant on exactly one project (DB-enforced).
  - Teams of ≤ 4 with a mix of role buckets after a matching run.
