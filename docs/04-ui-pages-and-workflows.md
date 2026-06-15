# 4) UI Pages and Workflows

Plain language only — no technical API detail here. API contracts are in
[`07-api-flows.md`](07-api-flows.md).

---

## UI Page: `Register`

- **Where to find it:** `/register`, linked from the Login page ("Register").
- **Purpose:** Let a new participant create an account.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Email | Text field | Mandatory |
| Password | Password field | Mandatory |
| LinkedIn URL | Text field | Optional |
| Create account | Button | — |

- **Validation:**
  - Email must look like a real email address.
  - Password must be at least 6 characters.
  - Email must not already be in use.
- **When something goes wrong:** "Please provide a valid email address", "Password must be at
  least 6 characters", or "An account with this email already exists".

### Workflow 1: Create account
- **What starts it:** User fills the form and clicks **Create account**.

**What the user sees**
1. Types email, password, and (optionally) a LinkedIn URL.
2. Clicks **Create account**.
3. On success, lands on the Dashboard, already logged in.
4. On failure, sees an inline error message and stays on the page.

**What the system does**
1. Email valid? **NO:** show the error and stop. **YES:** continue.
2. Password at least 6 characters? **NO:** show the error and stop. **YES:** continue.
3. Email already registered? **YES:** show "already exists" and stop. **NO:** continue.
4. Save the account with a securely hashed password and a normal "user" role.
5. Issue a login token and open the Dashboard.

**Simple logic summary**
IF email invalid OR password too short OR email taken THEN stop with a message; ELSE create
the account and log the person in.

**Flow picture**
```text
[Fill form] -> [Click Create] -> {valid & unique?} --NO--> [Show error]
                                        |YES
                                        v
                                 [Create + log in] -> [Dashboard]
```

---

## UI Page: `Login`

- **Where to find it:** `/login` (default page when logged out).
- **Purpose:** Authenticate an existing participant, judge, or admin.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Email | Text field | Mandatory |
| Password | Password field | Mandatory |
| Log in | Button | — |

- **Validation:** Email and password are both required; the pair must match an account.
- **When something goes wrong:** "Invalid email or password".

### Workflow 1: Log in
- **What starts it:** User enters credentials and clicks **Log in**.

**What the user sees**
1. Enters email and password and clicks **Log in**.
2. On success, lands on the Dashboard; the nav shows links appropriate to their role.
3. On failure, sees "Invalid email or password".

**What the system does**
1. Both fields present? **NO:** show error and stop. **YES:** continue.
2. Account exists and password matches? **NO:** show "Invalid email or password" and stop.
   **YES:** continue.
3. Issue a login token and open the Dashboard.

**Simple logic summary**
IF credentials match THEN log in; ELSE stop with "Invalid email or password".

**Flow picture**
```text
[Enter credentials] -> {match?} --NO--> [Invalid email or password]
                          |YES
                          v
                      [Log in] -> [Dashboard]
```

### Workflow 2: Stay logged in across reloads
- **What starts it:** The app loads while a saved session exists.

**What the user sees**
1. On refresh, the app briefly shows "Loading…", then restores the logged-in view.

**What the system does**
1. A saved session token present? **NO:** show the Login page. **YES:** continue.
2. Token still valid? **NO:** clear it and show Login. **YES:** restore the user and continue.

**Simple logic summary** IF a valid saved session exists THEN restore it; ELSE show Login.

**Flow picture**
```text
[App loads] -> {valid session?} --NO--> [Login]
                     |YES
                     v
                [Restore user] -> [Dashboard]
```

---

## UI Page: `Dashboard`

- **Where to find it:** `/` after logging in ("Dashboard" in the nav).
- **Purpose:** Personalized landing page summarizing the hackathon, your team-matching status,
  your project, and (for judges) a judging shortcut.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Hackathon name & details | Text (read-only) | — |
| Team Matching card | Status + link | — |
| My Project card | Status + link | — |
| Judging card (judges only) | Link | — |

- **Validation:** None (read-only).
- **When something goes wrong:** Sections quietly show an empty/"none yet" state if data can't
  be loaded.

### Workflow 1: View dashboard
- **What starts it:** The Dashboard opens.

**What the user sees**
1. The hackathon name and details at the top.
2. A Team Matching card: "opt in" prompt, "waiting" notice, or your matched team list.
3. A My Project card: a link to submit, or your submitted project.
4. Judges also see a Judging card.

**What the system does**
1. Load the hackathon details, your matching status, and your project(s).
2. Matched already? **YES:** list your teammates. **NO + opted in?** show "waiting". **NO:**
   show the "opt in" prompt.
3. Is this a judge or admin? **YES:** show the Judging card. **NO:** hide it.

**Simple logic summary** Show what applies to this person based on their matching status, their
project, and whether they can judge.

**Flow picture**
```text
[Open Dashboard] -> [Load details + status] -> [Render cards by role/status]
```

---

## UI Page: `Team Matching`

- **Where to find it:** `/matching` ("Team Matching" in the nav). Optional feature.
- **Purpose:** Let a participant opt into team matching by describing themselves and their idea.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Your role | Dropdown (≈28 options) | Mandatory |
| What do you plan to build? | Text area | Mandatory |
| Tracks | Multi-select chips | Optional |
| Sponsors | Multi-select chips | Optional |
| Opt in / Update profile | Button | — |

- **Validation:** Role and "what you plan to build" are required.
- **When something goes wrong:** "Role and what you plan to build are required"; if already
  matched, the form is locked with a banner.

### Workflow 1: Opt into / update matching profile
- **What starts it:** User fills the form and clicks **Opt in** (or **Update profile**).

**What the user sees**
1. Picks a role, writes what they plan to build, and selects any tracks and sponsors.
2. Clicks the button and sees a success note that they'll be placed when the admin runs matching.
3. If they were already matched, the whole form is locked and shows "your profile is locked".

**What the system does**
1. Role and plan provided? **NO:** show the error and stop. **YES:** continue.
2. Already matched? **YES:** refuse the change and stop. **NO:** continue.
3. First time? **YES:** create the profile. **NO:** update the existing one.

**Simple logic summary** IF role/plan missing THEN stop; IF already matched THEN stop; ELSE
save the profile (waiting for the admin to run matching).

**Flow picture**
```text
[Fill profile] -> {role & plan?} --NO--> [Error]
                       |YES
                       v
                 {already matched?} --YES--> [Locked]
                       |NO
                       v
                 [Save profile] -> [Waiting for matching]
```

---

## UI Page: `Submit Project`

- **Where to find it:** `/submit` ("Submit Project" in the nav).
- **Purpose:** Submit one project per person, with team, tracks, and sponsors used.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Project name | Text field | Mandatory |
| Short description | Text area | Optional |
| Demo video link | Text field | Optional |
| Git repository link | Text field | Optional |
| Team members (besides you) | Multi-select | Optional |
| Tracks | Multi-select chips | Optional |
| Sponsors used | Multi-select chips | Optional |
| Submit project | Button | — |
| My Projects | List (read-only) | — |

- **Validation:** Project name is required. No selected member (or you) may already be on
  another project.
- **When something goes wrong:** "Project name is required" or "These participants are already
  part of another project: …".

### Workflow 1: Submit a project
- **What starts it:** User fills the form and clicks **Submit project**.

**What the user sees**
1. Enters name, description, links, and selects teammates/tracks/sponsors.
2. Clicks **Submit project** and sees "Project submitted!"; the project appears under My Projects.
3. On conflict, sees which people are already on another project and nothing is saved.

**What the system does**
1. Project name present? **NO:** show the error and stop. **YES:** continue.
2. Add the submitter to the team automatically.
3. Any team member already on another project? **YES:** list them, stop, save nothing.
   **NO:** continue.
4. Save the project with its team, tracks, and sponsors.

**Simple logic summary** IF no name THEN stop; IF any member already on a project THEN stop;
ELSE save the project (creator always included).

**Flow picture**
```text
[Fill form] -> {name?} --NO--> [Error]
                  |YES
                  v
            [Add creator] -> {anyone already on a project?} --YES--> [Conflict, stop]
                                       |NO
                                       v
                                 [Save project] -> [Shown in My Projects]
```

### Workflow 2: View my projects
- **What starts it:** The page loads.

**What the user sees** A list of the projects they belong to (name, description, team, tracks,
sponsors). Non-judges only ever see their own.

**What the system does** Load and show only the projects this person participates in.

**Simple logic summary** Show this person's own project(s) only.

**Flow picture** `[Open page] -> [Load my projects] -> [Show list]`

---

## UI Page: `Judging`

- **Where to find it:** `/judging` (visible to admin-selected judges and admins).
- **Purpose:** Browse project details, filter by sponsor, and submit/update scores.
- **What is on the screen:**

| Name | Type | Mandatory |
|------|------|-----------|
| Filter by sponsor | Dropdown ("All projects" + each sponsor) | Optional |
| Project list | Selectable list | — |
| Project details | Read-only panel (links, team, tracks, sponsors) | — |
| Score criteria (6 fields) | Number fields (each 0–max) | Mandatory to save |
| Comments | Text area | Optional |
| Save score | Button | — |
| All scores (admin) | Table | — |

- **Validation:** Each criterion must be between 0 and its maximum; the six maxima total 100.
- **When something goes wrong:** "<criterion> must be between 0 and <max>"; non-judges are
  refused access to the page and to details.

### Workflow 1: Browse and filter projects
- **What starts it:** A judge opens the page or changes the sponsor filter.

**What the user sees**
1. A list of projects, optionally narrowed by a chosen sponsor.
2. Clicking a project shows its details and the scoring form.

**What the system does**
1. Is this person a judge or admin? **NO:** refuse access. **YES:** continue.
2. Sponsor filter chosen? **YES:** show only projects using that sponsor. **NO:** show all.

**Simple logic summary** IF judge/admin THEN list projects (filtered if a sponsor is chosen);
ELSE deny.

**Flow picture**
```text
[Open Judging] -> {judge/admin?} --NO--> [Denied]
                       |YES
                       v
                 {sponsor filter?} --YES--> [Filtered list]
                       |NO
                       v
                   [All projects]
```

### Workflow 2: Score a project
- **What starts it:** A judge opens a project and clicks **Save score**.

**What the user sees**
1. Enters a number for each of the six criteria; a running total out of 100 updates live.
2. Adds optional comments and clicks **Save score**; sees "Score saved!".
3. Admins also see every judge's score and the average; judges see their own plus the average.

**What the system does**
1. Every criterion within 0..its max? **NO:** show which one is out of range and stop.
   **YES:** continue.
2. Already scored this project before? **YES:** update that score. **NO:** create a new one.
3. Compute and store the total (sum of the six criteria).

**Simple logic summary** IF any value out of range THEN stop; ELSE save (update if this judge
already scored) and recompute the total.

**Flow picture**
```text
[Enter scores] -> {all in range?} --NO--> [Error]
                       |YES
                       v
                 {scored before?} --YES--> [Update] 
                       |NO                    |
                       v                      v
                   [Create] --------> [Save total]
```

---

## UI Page: `Admin Panel`

- **Where to find it:** `/admin` (admins only).
- **Purpose:** Manage hackathon details, tracks, sponsors, users/access, and team matching.
- **What is on the screen:** Hackathon Details form; Tracks list editor; Sponsors list editor;
  Users table (role, "Can view & judge" toggle, remove) + Add-user form; Team Matching panel
  (counts, "Run matching" button, opt-in table, formed teams).
- **Validation:** Track/sponsor names non-empty; new users need email + password; the admin
  account cannot be removed.
- **When something goes wrong:** "Track name is required", "Email already exists", "The admin
  account cannot be removed", "No new people have opted in since the last run".

### Workflow 1: Edit hackathon details
- **What starts it:** Admin edits the name/details and clicks **Save**.

**What the user sees** Updated name and details with a "Saved!" note.
**What the system does** Store the new hackathon name and details; everyone sees them on the
Dashboard.
**Simple logic summary** Save the new details.
**Flow picture** `[Edit fields] -> [Save] -> [Stored & shown to all]`

### Workflow 2: Manage tracks (multiple entries)
- **What starts it:** Admin adds, renames, or deletes a track.

**What the user sees** The track list updates immediately after each action.
**What the system does**
1. Adding with an empty name? **YES:** reject. **NO:** add it.
2. Rename or delete the chosen track.
**Simple logic summary** IF name empty THEN reject; ELSE add/rename/delete.
**Flow picture** `[Type name] -> {empty?} --YES--> [Reject]; --NO--> [Add]; [edit]/[delete] -> [List updates]`

### Workflow 3: Manage sponsors (multiple entries)
- Identical shape to Workflow 2, for sponsors. Names must be non-empty; add/rename/delete
  update the list immediately.

### Workflow 4: Manage user access (who can view & judge)
- **What starts it:** Admin toggles a user's "Can view & judge".

**What the user sees** The toggle flips to Yes/No.
**What the system does** Grant or revoke that user's permission to view project details and
submit scores. (The admin row shows a fixed "✓ (admin)".)
**Simple logic summary** Set the person's judge permission on or off.
**Flow picture** `[Toggle] -> [Permission updated]`

### Workflow 5: Add a user
- **What starts it:** Admin fills the Add-user form and clicks **Add user**.

**What the user sees** The new user appears in the table; errors show inline.
**What the system does**
1. Email + password present and email unused? **NO:** show the error and stop. **YES:** create
   the account (optionally pre-granting judge access).
**Simple logic summary** IF email/password valid and unique THEN create; ELSE stop.
**Flow picture** `[Fill form] -> {valid & unique?} --NO--> [Error]; --YES--> [User added]`

### Workflow 6: Remove a user
- **What starts it:** Admin clicks **remove** on a user row and confirms.

**What the user sees** The user disappears from the table; removing the admin is blocked.
**What the system does**
1. Is the target the admin? **YES:** refuse. **NO:** continue.
2. Detach the user from any project/matching/scores, then delete the account.
**Simple logic summary** IF target is admin THEN refuse; ELSE clean up references and delete.
**Flow picture** `[Click remove] -> {admin?} --YES--> [Refuse]; --NO--> [Clean up + delete]`

### Workflow 7: Run team matching
- **What starts it:** Admin clicks **Run matching**.

**What the user sees**
1. Counts of who opted in, who is waiting (new), and how many runs happened.
2. After clicking, a summary like "Matched N new people into M team(s)"; the formed teams
   appear below.

**What the system does**
1. Any people not yet matched? **NO:** show "No new people have opted in since the last run"
   and stop. **YES:** continue.
2. Form teams of up to 4 from the waiting people using track/sponsor overlap, AI similarity of
   their "plan to build", and a mix of role types.
3. Mark those people matched, record the run, and show the new teams. Previously matched people
   are never reshuffled.

**Simple logic summary** IF nobody new is waiting THEN stop; ELSE group only the new people
into balanced teams of ≤ 4 and lock them in.

**Flow picture**
```text
[Click Run] -> {new opt-ins?} --NO--> [Nothing to do]
                    |YES
                    v
              [Form ≤4 teams from new people] -> [Lock + record + show teams]
```

### Workflow 8: View opt-ins and formed teams
- **What starts it:** The Team Matching panel loads.

**What the user sees** A table of everyone who opted in (email, role, plan, status) and cards
for each formed team.
**What the system does** Load and display all matching profiles and current teams.
**Simple logic summary** Show who opted in and the teams formed so far.
**Flow picture** `[Open panel] -> [Load opt-ins + teams] -> [Show table + team cards]`
