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
- **What is on the screen:** A notice when submissions are closed; Project name (mandatory);
  Short description; Demo video link; Git link; **Team members search** — type an email to find
  and add teammates one at a time (added as removable chips, no list of all users shown);
  Tracks (multi-select); Sponsors used (multi-select); Submit button (disabled when closed);
  My Projects list below.
- **Validation:** name required; no member already on another project **in this hackathon**;
  today (UTC) must be within the hackathon's 48-hour submission window (event date + next day).

### Workflow 1: Submit a project
**What the user sees** If the hackathon has an event date and the 48-hour window has not started
or has passed, a banner says submissions are closed and the Submit button is disabled. Otherwise:
fill in the form, search and add teammates by typing their email into the **Team members** search
box and clicking a result — they appear as chips with ✕ to remove. Choose tracks and sponsors,
then Submit → "Project submitted!"; the project appears under My Projects. On a participant
conflict the clashing emails are listed and nothing is saved.
**What the system does** Outside the 48-hour UTC window? **YES:** reject. **NO:** Name provided?
**NO:** stop. Creator auto-added. Anyone already on a project here? **YES:** stop (no orphan).
**NO:** save with team/tracks/sponsors.
**Simple logic summary** IF outside submission window THEN stop; ELSE IF name empty THEN stop;
ELSE IF a member clashes THEN stop; ELSE save.
**Flow picture**
```
[Fill form] -> {window open?} --NO--> [Closed banner]
            --YES--> [Search & add teammates] -> {name?} --NO--> [Error]
                                              --YES--> {clash?} --YES--> [409]
                                                                --NO-->  [Saved]
```

### Workflow 2: View my projects
**What the user sees** Your project(s) in this hackathon. **What the system does** Load only your
own. **Flow picture** `[Open] -> [Load mine] -> [Show]`

---

## UI Page: `Hackathon · Project Demo Groups`
- **Where to find it:** `/h/:id/judging-groups`, "Project Demo Groups" in the sidebar.
- **Purpose:** Show participants their project's demo group and schedule, show judges their group
  and time slot, and let judges check in.

| Name | Type | Mandatory |
|------|------|-----------|
| Your Project card (participants) | Card showing group, time window, slot | — |
| Your Judge Schedule card (judges) | Card with group, window, project list | — |
| Mark My Attendance button (un-checked-in judges) | Button | — |
| Demo Day Schedule | Grouped schedule by demo group | — |
| All Demo Groups | Grid of all groups with projects and judges | — |

### Workflow 1: Participant views their schedule
**What the user sees** A card at the top shows their **project name**, **demo group letter**, the
**group time window**, their **per-project slot time**, and their **demo day slot time**. If groups
haven't been assigned, the card shows "Groups not assigned yet."
**What the system does** Look up the viewer's project for this hackathon; find its judge_group;
compute the time slot from the judging config.

### Workflow 2: Judge checks in
**What the user sees** If not yet checked in, a "Mark My Attendance" button appears (always
enabled). After clicking: if groups exist, the judge is instantly placed in a group and the button
is replaced by their group details. If groups haven't been assigned yet, a yellow "✓ You are
checked in — awaiting group" card appears. The judge's schedule (group, time window, projects to
review with slot times and "Score ↗" links) appears once placed.
**What the system does** Mark attended_at timestamp. Groups assigned and auto-assign active?
**YES:** assign to the next group in round-robin. **NO:** leave group blank; admin assigns later.

---

## UI Page: `Hackathon · Judging`
- **Where to find it:** `/h/:id/judging` (judges/admins only).
- **Purpose:** Three sections — a **Judge Group Projects** panel (when the judge has a group),
  then three tabs: **Score projects** (give your own scores + investment), **Results &
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

### Workflow 0: View Judge Group Projects panel
**What the user sees** Before the tabs, a coloured card titled "Judge Group Projects — Group X"
shows the judge's group, the overall time window, and each project in the group with its
individual time slot, a score status badge (✓ scored / "to score"), and a "Score ↗" button.
Clicking "Score ↗" switches to the Score tab and opens that project.
**What the system does** Load judging-groups data; if the judge has a group, render the group
panel; project list sorted by group order.
**Flow picture** `[Open Judging] -> {has group?} --NO--> [tabs only]; --YES--> [Group panel + tabs]`

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
- **Purpose:** Configure this hackathon: details, tracks, sponsors, judges + demo-group
  assignment, projects, speakers, demo slots, awards, emails; plus a danger zone.
- **What is on the screen:** Details form; Tracks editor; Sponsors editor; **Judges &
  Assignment** (unified card — judging params, search-to-add judges, judge table with attendance
  checkbox + group badge + Remove button, group-assign controls); Projects editor; Speakers;
  Demo Slots; Awards; Voice Rules; **Emails** (send-once per person with sent count + Reset);
  Danger zone (Delete all projects & judge data; Delete hackathon).
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

### Workflow 4: Manage judges & demo-group assignment (Judges & Assignment card)
**What the user sees**
1. Two number inputs: **Total judge time (min)** and **Time per project (min)**. A hint shows the
   computed projects-per-group and group count. Click **Save params** to store them.
2. Below the params: a search box — type an email to find a user and click to add them as a judge.
3. A table lists every judge: their email, an **Attended** checkbox, their **Group** badge (or a
   dash if not yet placed), and a **Remove** button. Checking the box marks them as present;
   unchecking clears it. The checkbox column has a fixed width so the row never shifts.
4. Action buttons: **▶ Assign Groups** (or **↺ Re-assign Groups**) to distribute all projects
   (and any pre-checked-in judges) into demo groups; **⏸ Stop Auto-assign** / **▶ Resume
   Auto-assign** to pause or resume automatic placement of new judges; **↺ Reset All** to clear
   every group, project, and attendance record (confirmation required).

**What the system does**
1. Params saved immediately to the database; recomputed on each load.
2. Adding a judge grants them view+judge access for this hackathon only.
3. Toggling attendance sets or clears `attended_at`; if groups are assigned and auto-assign is
   active, a newly-checked-in judge is immediately placed in the next round-robin group.
4. Removing a judge revokes access and clears any group assignment.
5. Assign Groups: splits all submitted projects evenly across groups A, B, C …; places each
   pre-checked-in judge in a group; sets `assigned_at`.

**Simple logic summary** IF added THEN grant access; IF attend toggled AND auto-assign active
THEN place in group; IF Assign Groups clicked THEN distribute all projects + checked-in judges.

**Flow picture**
```
[Save params] -> [Stored; hint updated]
[Search & add judge] -> [Table row: email | checkbox | group | Remove]
[Check Attended] -> {auto-assign active?} --YES--> [Place in group]; --NO--> [Awaiting]
[▶ Assign Groups] -> [Distribute projects + judges into groups A, B, C…]
[Remove] -> [Access revoked]
```

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

### Workflow 8: Edit a submitted project
- **What starts it:** Admin clicks **▼ edit** on any project in the **Projects** section.

**What the user sees**
1. The project row expands to show a full edit form: **Project name**, **Short description**,
   **Demo video link**, **Git / repo link**.
2. Current **participants** are shown as removable chips; type in the search box to find and add
   more (same search-as-you-type dropdown as judges).
3. Available **tracks** and **sponsors** for this hackathon are shown as checkboxes — tick/untick
   to update which ones the project is linked to.
4. A **Delete project** button removes the project entirely (with confirmation).
5. Click **Save changes** → form collapses; the row updates in place.

**What the system does**
1. Admin only? **NO:** deny. **YES:** continue.
2. Name provided and not blank? **NO:** stop. **YES:** update name, description, and links.
3. Replace participants with the new list; replace tracks and sponsors.
4. Return the updated project details.

**Simple logic summary** IF admin AND name not blank THEN update all fields; ELSE stop.

**Flow picture**
```
[▼ edit] -> [Edit form: details + participants search + track/sponsor checkboxes]
         -> [Save] -> {admin & name ok?} --NO--> [Error]; --YES--> [Updated row]
         -> [Delete project] -> {confirm?} --YES--> [Removed]
```

### Workflow 9: Send emails (Emails section)
**What the user sees** Each email type (e.g. Welcome, Reminder, Deadline) is listed as a card
showing the label, who it goes to, and (if any have already been sent) a green "✓ N sent" count.
Click **Send** → the system emails everyone who has not received that type yet. The result shows
how many were sent, how many were skipped (already sent), and any failures. If anyone was already
sent, a **Reset** button appears — clicking it clears the tracking so the next send will go to
everyone again (with a confirmation prompt).
**What the system does** For each recipient: already in `email_sends` for this type + hackathon?
**YES:** skip. **NO:** send, then record in `email_sends`. Reset deletes all tracking rows for that
type so everyone is eligible again.
**Simple logic summary** Send once per user per type; skip repeats; Reset clears the tracking.
**Flow picture**
```
[Send] -> for each recipient: {already sent?} --YES--> skip; --NO--> [Email + record]
       -> [Result: N sent · M skipped]
[Reset] -> {confirm?} --YES--> [Delete tracking rows] -> [Next send goes to all]
```
