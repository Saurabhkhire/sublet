# 4) UI Pages and Workflows

Plain language only — no technical API detail here (see [§7](07-api-flows.md)). The app is
branded **SUBLET**. After login you land on the **Hackathons** list and step into one hackathon's
workspace (Overview, Team Matching, Submit Project, Judging, Admin). The top bar has a
**light/dark mode toggle** (☾ / ☀) available on every page; the choice is remembered.

---

## UI Page: `Register`
- **Where to find it:** `/register`, linked from Login.
- **Purpose:** Create a participant account.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Email | Text field | Mandatory |
| Password | Password field | Mandatory |
| LinkedIn URL | Text field | Mandatory |
| Create account | Button | — |

- **Validation:** valid email; password ≥ 6; **LinkedIn URL required**; email unused.
- **When something goes wrong:** inline messages (invalid email / short password / LinkedIn
  required / already exists).

### Workflow 1: Create account
- **What starts it:** User submits the form.

**What the user sees** 1. Enter email/password/LinkedIn. 2. On success, land on Hackathons.
3. On failure, inline error.

**What the system does** 1. Email valid? **NO:** stop. **YES:** continue. 2. Password ≥ 6?
**NO:** stop. **YES:** continue. 3. LinkedIn provided? **NO:** stop. **YES:** continue.
4. Email taken? **YES:** stop. **NO:** create + log in.

**Simple logic summary** IF invalid/duplicate THEN stop; ELSE create and sign in.

**Flow picture** `[Fill] -> {valid & unique?} --NO--> [Error]; --YES--> [Create] -> [Hackathons]`

---

## UI Page: `Login`
- **Where to find it:** `/login` (default when logged out).
- **Purpose:** Authenticate.
- **What is on the screen:** Email (mandatory), Password (mandatory), Log in (button).
- **Validation:** both required; pair must match. **When wrong:** "Invalid email or password".

### Workflow 1: Log in
**What the user sees** Enter credentials → Hackathons; wrong → error.
**What the system does** Match credentials? **NO:** stop. **YES:** issue token, go to Hackathons.
**Simple logic summary** IF match THEN sign in; ELSE stop.
**Flow picture** `[Enter] -> {match?} --NO--> [Error]; --YES--> [Hackathons]`

### Workflow 2: Stay logged in
**What the user sees** Refresh keeps the session. **What the system does** Valid saved session?
**YES:** restore. **NO:** show Login. **Flow picture** `[Load] -> {valid session?} -> restore/login`

---

## UI Page: `Hackathons` (home)
- **Where to find it:** `/` after login.
- **Purpose:** Browse hackathons; admins create new ones; pick one to enter.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Hackathon cards (name, description, counts, Judge badge) | List | — |
| + New hackathon (admin only) | Button | — |
| Create form: Name | Text field | Mandatory |
| Create form: Description | Text area | Optional |
| Create form: Date (day of the hackathon) | Date picker | Optional |
| Create form: Start time | Time picker | Optional |
| Create form: End time | Time picker | Optional |
| Create form: Location (venue or online link) | Text field | Optional |
| Create form: Community & Support (Discord/channel) | Text area | Optional |
| Create form: Schedule | Text area | Optional |

- **Validation:** create requires a non-empty name (admin only). Tracks, sponsors and judges are
  added on the next screen (Admin).
- **When something goes wrong:** "Hackathon name is required"; non-admins don't see create.

### Workflow 1: Browse & open a hackathon
**What the user sees** Cards for each hackathon; clicking one opens its Overview.
**What the system does** Load all hackathons with per-user judge flag and counts.
**Simple logic summary** Show every hackathon; entering one scopes all later screens to it.
**Flow picture** `[Open home] -> [Load hackathons] -> [Click card] -> [Hackathon workspace]`

### Workflow 2: Create a hackathon (admin)
**What the user sees** Admin clicks **+ New hackathon**, fills name/details and the event
**date**, **start time**, **end time** and **location**, creates, and is taken to that hackathon's
Admin page. A note explains projects can only be submitted on the date chosen.
**What the system does** Name present? **NO:** stop. **YES:** save the hackathon (including date,
start/end time and location) and open its Admin. The date becomes the only day projects may be
submitted.
**Simple logic summary** IF name empty THEN stop; ELSE create with date/start–end time/location
and configure. The chosen date controls when project submission is allowed.
**Flow picture** `[+ New] -> {name?} --NO--> [Error]; --YES--> [Save date/time/location] -> [Admin]`

---

## UI Page: `Users` (admin only)
- **Where to find it:** `/users` (top nav, admin only).
- **Purpose:** Manage **global** accounts (add/remove). Per-hackathon view/judge access is set
  inside each hackathon's Admin page.
- **What is on the screen:** Add-user form (Email, Password, LinkedIn optional); a table of all
  users with role and a remove action.
- **Validation:** email + password required; unique email; admin account can't be removed.

### Workflow 1: Add a user
**What the user sees** New user appears in the table; errors inline.
**What the system does** Valid + unique email? **NO:** stop. **YES:** create the account.
**Flow picture** `[Fill] -> {valid & unique?} --NO--> [Error]; --YES--> [Added]`

### Workflow 2: Remove a user
**What the user sees** User disappears after confirm; removing admin is blocked.
**What the system does** Target is admin? **YES:** refuse. **NO:** detach references + delete.
**Flow picture** `[Remove] -> {admin?} --YES--> [Refuse]; --NO--> [Delete]`

### Workflow 3: Delete all users
- **What starts it:** Admin clicks **Delete all users** and confirms.

**What the user sees** All non-admin users vanish; a note reports how many users (and orphaned
projects) were removed. The admin account stays.
**What the system does** Delete every non-admin account and their participations/matching
profiles/judge roles/scores, then delete any project left with no participants.
**Simple logic summary** Confirm → wipe all non-admin users and any now-empty projects.
**Flow picture** `[Delete all users] -> {confirm?} --YES--> [Remove non-admins + orphan projects]`

---

## UI Page: `Account settings`
- **Where to find it:** `/profile` — click your email or avatar in the top bar. Available to
  every signed-in user.
- **Purpose:** Update your own LinkedIn URL and/or password.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| LinkedIn URL | Text field | Mandatory (when saving LinkedIn) |
| Save LinkedIn | Button | — |
| New password | Password field | — |
| Confirm new password | Password field | — |
| Change password | Button | — |

- **Validation:** LinkedIn must be non-empty; new password ≥ 6 and must match its confirmation.
- **When something goes wrong:** "LinkedIn URL is required", "Password must be at least 6
  characters", "Passwords do not match".

### Workflow 1: Update LinkedIn
**What the user sees** Edit the URL, Save → "LinkedIn updated."
**What the system does** LinkedIn non-empty? **NO:** stop. **YES:** save it on the account.
**Flow picture** `[Edit URL] -> {non-empty?} --NO--> [Error]; --YES--> [Saved]`

### Workflow 2: Change password
**What the user sees** Enter a new password twice, Change → "Password changed." (the session stays
valid).
**What the system does** ≥ 6 chars and both entries match? **NO:** stop. **YES:** hash and store it.
**Flow picture** `[Enter twice] -> {valid & match?} --NO--> [Error]; --YES--> [Password changed]`

---

## UI Page: `Hackathon · Overview`
- **Where to find it:** `/h/:id` (the hackathon workspace landing, via the sidebar).
- **Purpose:** Show the full public hackathon information to everyone, plus your personal status.
- **What is on the screen (read-only for all users), in order:**
  - Hero with **name** and **description**, and a **Join the community** button if the support
    info contains a link.
  - **When & Where** — the event date (shown with weekday), start–end time and location, with a
    note that projects can only be submitted on that day (only when any of these is set).
  - **Community & Support** — how to join the Discord/channel and get help.
  - **Schedule**.
  - **Tracks & Themes** — each track name with its description.
  - **Sponsors** — each sponsor name with its description.
  - **Tool Access & Credits** — each sponsor with its access/credits instructions.
  - **Prizes** — each sponsor with the prizes it offers.
  - **Judges** — each judge's name with a **LinkedIn** link.
  - **Personal cards at the very bottom**: Team Matching status, My Project, Judging shortcut
    (judges only) — placed below all the hackathon info, not directly under the title/description.

### Workflow 1: View overview
**What the user sees** The hackathon's full info (description, community/support, schedule, tracks
with descriptions, sponsors with descriptions, tool access & credits per sponsor, prizes per
sponsor, judges with LinkedIn) plus cards reflecting your own status.
**What the system does** Load this hackathon's info (already provided with the workspace meta) and
your matching/project status; show the Judging card only if you're a judge/admin here. Sections
with no content are hidden.
**Flow picture** `[Open] -> [Render hackathon info + personal status]`

---

## UI Page: `Hackathon · Team Matching`
- **Where to find it:** `/h/:id/matching`. Optional.
- **Purpose:** Opt into team matching for this hackathon.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Your role | Dropdown (~28) | Mandatory |
| What do you plan to build? | Text area | Mandatory |
| Tracks of interest | Multi-select chips | Optional |
| Sponsors of interest | Multi-select chips | Optional |
| Opt in / Update profile | Button | — |
| Participants looking for a team (cards) | List | — |

- **Validation:** role + plan required; locked once matched.

### Workflow 1: Opt into / update profile
**What the user sees** Fill and save; success note; if matched, the form is locked and your team
is shown.
**What the system does** Role & plan present? **NO:** stop. Already matched? **YES:** refuse.
First time? **YES:** create; **NO:** update.
**Simple logic summary** IF missing THEN stop; IF matched THEN stop; ELSE save (waiting for run).
**Flow picture** `[Fill] -> {valid?} --NO--> [Error]; -> {matched?} --YES--> [Locked]; --NO--> [Save]`

### Workflow 2: Browse other participants looking for a team
- **What starts it:** The page loads (or you just opted in).

**What the user sees** A grid of everyone who has opted in (role, what they plan to build,
tracks/sponsors, email, LinkedIn, and whether they're still looking or already on a team) — so
you can reach out and form a team yourself. Before you opt in, this area shows a prompt to opt in.
**What the system does** Has the viewer opted into matching (or is admin)? **NO:** show the
"opt in to see others" prompt. **YES:** list every opt-in's profile and contact details.
**Simple logic summary** IF you opted in THEN show all participants; ELSE prompt to opt in.
**Flow picture** `[Open] -> {opted in?} --NO--> [Prompt]; --YES--> [Show all participants]`

---

## UI Page: `Hackathon · Submit Project`
- **Where to find it:** `/h/:id/submit`.
- **Purpose:** Submit one project (per person, per hackathon).
- **What is on the screen:** A notice when it is **not** the hackathon day (submission closed);
  Project name (mandatory); Short description; Demo video link; Git link; Team members (multi);
  Tracks (multi); Sponsors used (multi); Submit (disabled off the event day); My Projects list.
- **Validation:** name required; no member already on another project **in this hackathon**; the
  current date must be the hackathon's event date (when one is set).

### Workflow 1: Submit a project
**What the user sees** If the hackathon has an event date and today is not that day, a banner says
submissions open only on that day and the Submit button is disabled. Otherwise fill and submit →
"Project submitted!"; appears under My Projects; on conflict, which people clash and nothing saved.
**What the system does** Is the event date set and today not that day? **YES:** reject (submission
window closed). **NO:** Name? **NO:** stop. Add creator. Anyone already on a project here?
**YES:** stop (no orphan). **NO:** save with team/tracks/sponsors.
**Simple logic summary** IF not the hackathon day THEN stop; ELSE IF name empty THEN stop; ELSE IF
a member clashes THEN stop; ELSE save.
**Flow picture** `[Fill] -> {today = event day?} --NO--> [Closed]; --YES--> {name?} --NO--> [Error]; -> {clash?} --YES--> [409]; --NO--> [Saved]`

### Workflow 2: View my projects
**What the user sees** Your project(s) in this hackathon. **What the system does** Load only your
own. **Flow picture** `[Open] -> [Load mine] -> [Show]`

---

## UI Page: `Hackathon · Judging`
- **Where to find it:** `/h/:id/judging` (judges/admins only).
- **Purpose:** Three tabs — **Score projects** (give your own scores + investment), **Results &
  averages** (leaderboard of average scores), and **Investments** (total money offered per project
  across judges).
- **What is on the screen:**
  - **Tabs:** "Score projects" | "Results & averages" | "Investments". A sponsor filter applies to all.
  - **Score projects tab:** a project list (each marked **✓ you: NN** if you've scored it, or
    "not scored"); on the right, the selected project's details — **Watch Demo Video** and **View
    Git Repository** as big clickable buttons, **Tracks** (with explanation) and **Sponsors used**
    (with explanation) — and your score form: five fields (Presentation, Execution, Innovation,
    Impact, Implementation, each 0–100), a live total (their average, /100), an **Investment**
    field (*"if you were an investor, how much would you invest?"*) — an amount plus a **unit**
    dropdown (Exact $, Thousand, Lakh, Million, Crore, Billion) with a live "= $…" preview —
    Comments, Save. Admins also see a per-judge breakdown table (including each judge's investment).
  - **Results & averages tab:** a ranked leaderboard — rank (🥇🥈🥉), project, **Tracks**,
    **Sponsors**, **average /100 across all judges**, judge count. **Clicking a row opens a details
    popup** with the demo video & GitHub links, tracks, sponsors, team, and per-category averages.
  - **Investments tab:** a ranked leaderboard — rank, project, **Tracks**, **Sponsors**, **total
    invested across all judges** (ordered high→low), investor count, plus the overall total.
    **Clicking a row opens the same details popup** (demo & GitHub links, tracks, sponsors, team).
  - On the **Score projects** list, each project also shows its tracks & sponsors, and selecting it
    shows the full detail panel (demo & GitHub links, tracks, sponsors, team) alongside the form.

| Name | Type | Mandatory |
|------|------|-----------|
| View tabs (Score projects / Results & averages) | Toggle | — |
| Sponsor filter (All + each sponsor) | Dropdown | Optional |
| Five score fields (each 0–100) | Number fields | Mandatory to save |
| Live total (= average of the five) | Read-only | — |
| Comments | Text area | Optional |
| Save score | Button | — |

- **Validation:** each category 0–100; non-judges are denied access.
- **When something goes wrong:** "<category> must be between 0 and 100".

### Workflow 1: Score a project & set an investment (Score projects tab)
**What the user sees** Pick a project (its row shows whether **you** have scored it). Review the
description, big **Demo** and **Git** links, **Tracks** and **Sponsors used**. Enter the five
categories (each 0–100); a live total shows their average. Enter how much you'd **invest** if you
were an investor — type an amount and choose a unit (Exact $, Thousand, Lakh, Million, Crore,
Billion); a live preview shows the resolved dollar value. Add comments; Save → "Score saved!".
**What the system does** Judge/admin? **NO:** deny. Every category 0–100 and investment ≥ 0?
**NO:** stop with the offending value. **YES:** total = average of the five; store your investment;
upsert (update if you already scored).
**Simple logic summary** IF judge AND all categories 0–100 AND investment ≥ 0 THEN save
(total = average, plus investment); ELSE stop.
**Flow picture** `[Pick project] -> [Enter 5 cats + investment] -> {valid?} --NO--> [Error]; --YES--> [upsert]`

### Workflow 2: View results & averages (Results tab)
**What the user sees** A leaderboard ranked by average score (highest first): rank with medals for
the top 3, each project's **average /100 across all judges**, how many judges scored it, and the
per-category averages. Optionally narrowed by sponsor.
**What the system does** For each project, compute the average of all judges' totals (and the
average per category), then sort descending.
**Simple logic summary** Show every project ranked by its average judge score.
**Flow picture** `[Open Results] -> [Average each project across judges] -> [Ranked leaderboard]`

### Workflow 3: View investments (Investments tab)
**What the user sees** A leaderboard ranked by **total investment** (highest first): each project's
Tracks, Sponsors, total money offered across all judges, how many judges invested, and the overall
total. Clicking a row opens its details popup.
**What the system does** For each project, sum every judge's investment, then sort descending.
**Simple logic summary** Show every project ranked by the total invested across judges.
**Flow picture** `[Open Investments] -> [Sum each project's investments across judges] -> [Ranked by total]`

### Workflow 4: Open project details (any tab)
- **What starts it:** Clicking a project row in the Results or Investments leaderboard.

**What the user sees** A popup with the project's description, big **Watch Demo Video** and **View
GitHub Repository** links, its Tracks and Sponsors (each explained), the team, and — for scored
projects — the average and per-category averages. Close to return to the leaderboard.
**What the system does** Show the selected project's full details (already loaded with the list).
**Simple logic summary** Open the details popup for the clicked project.
**Flow picture** `[Click row] -> [Details popup: demo + GitHub + tracks + sponsors + team] -> [Close]`

---

## UI Page: `Hackathon · Admin` (admin only)
- **Where to find it:** `/h/:id/admin`.
- **Purpose:** Configure this hackathon: details, tracks, sponsors, judges, matching; plus a
  danger zone to reset or delete.
- **What is on the screen:** Details form; Tracks editor; Sponsors editor; Judges (pick users to
  grant view+judge); Matching panel (counts, Run matching, opt-ins table, formed teams); Danger
  zone (Delete all projects & judge data; Delete hackathon).
- **Validation:** track/sponsor names non-empty; matching needs new opt-ins; destructive actions
  confirm first.

### Workflow 1: Edit details
**What the user sees** Edit **Name**, **Description**, event **Date**, **Start time**, **End
time**, **Location**, **Community & Support** (Discord/channel), and **Schedule**; Save → "Saved!".
**What the system
does** Store them; shown to everyone on the Overview. Changing the **Date** changes the only day on
which projects may be submitted.

### Workflow 2: Manage tracks (name + description)
**What the user sees** Each track has an editable **name** and **description**; add/save/delete.
**What the system does** Empty name? **YES:** reject. **NO:** apply. Descriptions appear on the
Overview under Tracks & Themes.
**Flow picture** `[Edit name + description] -> {name empty?} --YES--> [Reject]; --NO--> [Saved]`

### Workflow 3: Manage sponsors (name + description + access/credits + prizes)
**What the user sees** Each sponsor has editable **name**, **description**, **Tool Access &
Credits**, and **Prizes**; add/save/delete.
**What the system does** Empty name? **YES:** reject. **NO:** apply. Description, access
instructions and prizes appear on the Overview (Sponsors, Tool Access & Credits, Prizes).
**Flow picture** `[Edit sponsor fields] -> {name empty?} --YES--> [Reject]; --NO--> [Saved]`

### Workflow 4: Assign judges
**What the user sees** Pick a user from the dropdown → they appear as a judge chip; ✕ removes.
**What the system does** Grant/revoke that user's view+judge access **for this hackathon only**.
**Flow picture** `[Pick user] -> [Add judge]; [✕] -> [Revoke]`

### Workflow 5: Run team matching
**What the user sees** Counts (opted in / waiting / runs); Run forms teams of ≤4 and lists them.
**What the system does** Anyone new waiting? **NO:** "No new people…" stop. **YES:** group only
the new people (track/sponsor overlap + AI idea similarity + role mix), lock them, record the run.
**Flow picture** `[Run] -> {new?} --NO--> [Nothing]; --YES--> [Form ≤4 teams] -> [Lock + show]`

### Workflow 6: Reset projects & judging  ⟵ the "delete all projects and judge data" button
**What the user sees** Click **Delete all projects & judge data**, confirm → "Deleted N
project(s) and all judging data"; the hackathon's projects list is now empty.
**What the system does** Delete every project, its participants/tracks/sponsors links, and all
scores for this hackathon. Tracks, sponsors, judges and matching remain.
**Simple logic summary** Confirm → wipe this hackathon's projects + scores only.
**Flow picture** `[Delete all] -> {confirm?} --YES--> [Wipe projects + scores] -> [Empty]`

### Workflow 7: Delete hackathon
**What the user sees** Confirm → returns to the Hackathons list; the hackathon is gone.
**What the system does** Remove the hackathon and all of its data.
**Flow picture** `[Delete hackathon] -> {confirm?} --YES--> [Remove all] -> [Hackathons]`
