# 4) UI Pages and Workflows

Plain language only — no technical API detail here (see [§7](07-api-flows.md)). The app is
branded **SUBLET**. After login you land on the **Hackathons** list and step into one hackathon's
workspace (Overview, Team Matching, Submit Project, Judging, Admin).

---

## UI Page: `Register`
- **Where to find it:** `/register`, linked from Login.
- **Purpose:** Create a participant account.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Email | Text field | Mandatory |
| Password | Password field | Mandatory |
| LinkedIn URL | Text field | Optional |
| Create account | Button | — |

- **Validation:** valid email; password ≥ 6; email unused.
- **When something goes wrong:** inline messages (invalid email / short password / already exists).

### Workflow 1: Create account
- **What starts it:** User submits the form.

**What the user sees** 1. Enter email/password/LinkedIn. 2. On success, land on Hackathons.
3. On failure, inline error.

**What the system does** 1. Email valid? **NO:** stop. **YES:** continue. 2. Password ≥ 6?
**NO:** stop. **YES:** continue. 3. Email taken? **YES:** stop. **NO:** create + log in.

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
| Create form: Details | Text area | Optional |

- **Validation:** create requires a non-empty name (admin only).
- **When something goes wrong:** "Hackathon name is required"; non-admins don't see create.

### Workflow 1: Browse & open a hackathon
**What the user sees** Cards for each hackathon; clicking one opens its Overview.
**What the system does** Load all hackathons with per-user judge flag and counts.
**Simple logic summary** Show every hackathon; entering one scopes all later screens to it.
**Flow picture** `[Open home] -> [Load hackathons] -> [Click card] -> [Hackathon workspace]`

### Workflow 2: Create a hackathon (admin)
**What the user sees** Admin clicks **+ New hackathon**, fills name/details, creates, and is
taken to that hackathon's Admin page.
**What the system does** Name present? **NO:** stop. **YES:** create and open its Admin.
**Simple logic summary** IF name empty THEN stop; ELSE create and configure.
**Flow picture** `[+ New] -> {name?} --NO--> [Error]; --YES--> [Create] -> [Admin]`

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

---

## UI Page: `Hackathon · Overview`
- **Where to find it:** `/h/:id` (the hackathon workspace landing, via the sidebar).
- **Purpose:** Summarize this hackathon: details, your matching status, your project, and (for
  judges) a judging shortcut.
- **What is on the screen:** hero with name/details; Team Matching card; My Project card;
  Judging card (judges only). All read-only.

### Workflow 1: View overview
**What the user sees** The hackathon's details and cards reflecting your status here.
**What the system does** Load this hackathon's details, your matching status, your project; show
the Judging card only if you're a judge/admin here.
**Flow picture** `[Open] -> [Load scoped status] -> [Render cards]`

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

- **Validation:** role + plan required; locked once matched.

### Workflow 1: Opt into / update profile
**What the user sees** Fill and save; success note; if matched, the form is locked and your team
is shown.
**What the system does** Role & plan present? **NO:** stop. Already matched? **YES:** refuse.
First time? **YES:** create; **NO:** update.
**Simple logic summary** IF missing THEN stop; IF matched THEN stop; ELSE save (waiting for run).
**Flow picture** `[Fill] -> {valid?} --NO--> [Error]; -> {matched?} --YES--> [Locked]; --NO--> [Save]`

---

## UI Page: `Hackathon · Submit Project`
- **Where to find it:** `/h/:id/submit`.
- **Purpose:** Submit one project (per person, per hackathon).
- **What is on the screen:** Project name (mandatory); Short description; Demo video link; Git
  link; Team members (multi); Tracks (multi); Sponsors used (multi); Submit; My Projects list.
- **Validation:** name required; no member already on another project **in this hackathon**.

### Workflow 1: Submit a project
**What the user sees** Fill and submit → "Project submitted!"; appears under My Projects; on
conflict, which people clash and nothing saved.
**What the system does** Name? **NO:** stop. Add creator. Anyone already on a project here?
**YES:** stop (no orphan). **NO:** save with team/tracks/sponsors.
**Flow picture** `[Fill] -> {name?} --NO--> [Error]; -> {clash?} --YES--> [409]; --NO--> [Saved]`

### Workflow 2: View my projects
**What the user sees** Your project(s) in this hackathon. **What the system does** Load only your
own. **Flow picture** `[Open] -> [Load mine] -> [Show]`

---

## UI Page: `Hackathon · Judging`
- **Where to find it:** `/h/:id/judging` (judges/admins only).
- **Purpose:** Browse/filter projects and submit/update scores.
- **What is on the screen:** Sponsor filter (All + each sponsor); selectable project list;
  details panel (links, team, tracks, sponsors, average); six score fields (each 0–max, live
  total /100); Comments; Save; admins also see all judges' scores.
- **Validation:** each criterion within range; non-judges denied.

### Workflow 1: Browse & filter
**What the user sees** Project list, optionally narrowed by sponsor; click to open details.
**What the system does** Judge/admin? **NO:** deny. **YES:** list (filtered if a sponsor chosen).
**Flow picture** `[Open] -> {judge?} --NO--> [Denied]; -> {filter?} -> [List]`

### Workflow 2: Score a project
**What the user sees** Enter the six values (live total), comments, Save → "Score saved!".
**What the system does** All in range? **NO:** stop. Scored before? **YES:** update; **NO:**
create. Store total.
**Flow picture** `[Enter] -> {in range?} --NO--> [Error]; -> {scored?} -> [Upsert total]`

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
**What the user sees** Updated name/details with "Saved!". **What the system does** Store them;
shown to everyone in this hackathon.

### Workflow 2 & 3: Manage tracks / sponsors
**What the user sees** Add/rename/delete updates the list. **What the system does** Empty name?
**YES:** reject. **NO:** apply. **Flow picture** `[Type] -> {empty?} -> reject/apply`

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
