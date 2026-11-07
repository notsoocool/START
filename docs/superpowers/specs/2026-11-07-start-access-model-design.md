# START Access Model — Personal Books, Public Books, College Groups

**Date:** 2026-11-07  
**Status:** Approved for planning (decisions locked in chat 2026-11-07)  
**Context:** Researchers and college students use START for Sanskrit projects. Some books are personal research; some are shared corpus that colleges improve live. Admin workload must stay setup-only where possible.

## Problem

Flags (`owner`, `userPublished`, `groupPublished`, `locked`) and Admin clicks currently mix several jobs: private research, public open access, college collaboration, and START operations. Status dots and publish APIs often disagree with reality (`$first` aggregation, broken per-shloka publish, uploads without owner). The product intent was never written down clearly.

## Goals

1. One clear model for **who sees** and **who edits** each book kind.
2. Treat **user-published** as public commons (open platform), not exclusive START ownership.
3. Keep college improvement **live** on the shared book (no sandbox/merge).
4. Reduce Admin/Root day-to-day work via college leads.
5. Give implementers a contract for fixing publish dots, upload defaults, and auth later.

## Non-goals (this spec)

- Implementing auth hard-cut or UI fixes in this document.
- Changing Developer API access (separate spec).
- Sandbox / PR-style merge workflows for analysis (rejected: live edits).

## Decisions (locked)

| Topic                             | Choice                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| College improvement               | **Live** on the shared book; everyone with access sees changes immediately                                        |
| Role `User`                       | **View-only** — can read public (and otherwise allowed) books; cannot create or edit                              |
| Creating a private book           | Requires **Editor** (or higher). Users without it must **request** elevation                                      |
| Permission request                | **Missing today — must add:** User requests Editor (and/or Annotator); Admin/college lead approves                |
| Personal book default             | **Private** — creator only until they share or publish (creator is Editor+)                                       |
| Who edits START / assigned corpus | Annotator **or** Editor in a **group that has that book assigned**                                                |
| Admin role                        | **Setup only:** create college group → assign books → name college lead; keep official publish/lock + emergencies |
| College lead                      | Manages their members (add/remove Annotator/Editor); can approve member permission requests for their group        |
| `userPublished` meaning           | **Public for all to see** — platform commons, not “owned by START” exclusively                                    |
| Who edits after `userPublished`   | Still only assigned-group Annotator/Editor + Admin/Root (not open edit for every user)                            |

## Book states

### Visibility (see)

| State                   | Who sees the book                                       |
| ----------------------- | ------------------------------------------------------- |
| Personal unpublished    | Creator only (+ Admin/Root for support)                 |
| `groupPublished` (blue) | Members of groups that have the book in `assignedBooks` |
| `userPublished` (green) | **Everyone** on START (public commons)                  |
| `locked`                | Admin/Root only                                         |

Combinations: green overrides privacy for **read**. Blue without green is group-only. Lock hides from non-Admin even if publish flags are set (current product intent to preserve).

### Edit (write analysis)

| State                           | Who may edit                                                     |
| ------------------------------- | ---------------------------------------------------------------- |
| Personal unpublished            | Creator (must be Editor+) + Admin/Root                           |
| Group-visible START/shared book | Annotator/Editor **in a group assigned that book** + Admin/Root  |
| Public (`userPublished`)        | **Same edit rule as assigned groups** — public ≠ anyone can edit |
| Locked                          | Admin/Root only                                                  |

No sandbox. No merge queue. Wrong analysis is fixed live by people with edit rights.

### Ownership field (`owner`)

- **Means:** creator / steward for private research books and support routing.
- **Does not mean:** exclusive copyright or “START owns the public book.”
- When `userPublished` is true, treat content as **platform-public**; `owner` may remain for history/credit but must not block public **read**.
- Personal book create/upload must set `owner` to the creating user and leave both publish flags false.

## Roles

| Role               | Responsibility                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| User               | **View-only** — read public / allowed books; no create, no edit. May **request** Editor (or Annotator)              |
| Annotator          | Edit analysis on books assigned to their group; does **not** create new private books (unless also Editor)          |
| Editor             | Create private research books; edit assigned corpus books when in a group with that book                            |
| College lead       | Manage group members; approve permission requests for their college (future; Admin until built)                     |
| Admin / Root       | Groups, assign books, set lead, publish/lock, approve permission requests, emergencies, Developer API grants        |

## Status legend (UI contract)

| Indicator              | Meaning                                                         |
| ---------------------- | --------------------------------------------------------------- |
| Green                  | `userPublished` — public to all                                 |
| Blue                   | `groupPublished` — shared to assigned groups                    |
| Owner / private marker | Unpublished personal / stewarded private (Admin may always see) |
| Lock                   | Admin locked                                                    |

Rules:

- Aggregation must not use nondeterministic `$first` for book-level status. Prefer all-true / any-true / counts (e.g. “3/10 chapters public”).
- Chapter-level status must be visible when chapters differ.
- Same legend for all roles; do not hide green from non-Admin while showing blue.

## Admin workload (target)

**Admin does:**

1. Create college group
2. Assign START / corpus books to that group
3. Designate college lead
4. Publish / unpublish / lock official books when ready
5. Emergencies (wipe, Root promotions, API access approve)

**Admin does not (target):**

- Add every student by hand once lead exists
- Manually set `owner` after every student upload
- “Fix” dots that lie because of `$first`
- Manually discover who wants Editor — they **request** it

**College lead does:** member management + approve elevation requests for their group.

**New flow to build:** User → “Request Editor / Annotator” → notification to Admin (and/or college lead) → approve → role set (optionally add to group).

## Difference from current code

### Already aligned

| Model | Current code |
|---|---|
| College edits are live (no sandbox) | Analysis is edited on the live book |
| Edit shared corpus via group + assigned book | Annotator/Editor need the book in their group |
| `userPublished` ⇒ everyone can **see** | Books query includes `userPublished: true` for normal users |
| Admin publish / lock UI exists | Admin → Publish tab; lock API is Admin-gated |

### Gaps (model vs code)

| Model says | Current code does |
|---|---|
| Role `User` = view-only | Matches edit gate today; **create** paths must also reject User |
| Create private book = Editor+ (or request) | **No request flow** — Admin must elevate by hand; request UI/API missing |
| Personal book: set `owner` = creator, unpublished | Upload often sets **no `owner`** → only Admin sees until hand-fixed |
| Editor creates/owns private book and can edit it | Owner check exists but `User` is denied first; Editors in group path OK |
| Public = commons (not exclusive START ownership) | No product language; `owner` still drives private Admin-only badges |
| Public = read all; edit still group-only | Edit rule roughly OK; dots/Admin paths confuse the story |
| Green/blue same meaning for all roles | **Green only for Admin/Root**; blue for everyone |
| Dots = real book/chapter truth | Book status uses **`$first`** → mixed chapters lie |
| Chapter publish visible on books tree | Chapter nodes have **no status** in UI |
| Admin setup + college lead manages members | **No college-lead capability** — Admin still adds every student |
| Publish only Admin/Root | Publish APIs allow **any signed-in user** |
| Groups only Admin/Root | Group CRUD often **unauthenticated** |
| Clear personal → share → public path | Per-shloka `/publish` page is **dead** (wrong payload + fake `groupId`) |
| Locked book stays locked | New shloka on locked book forces **`locked: false`** |

### Implementation priority (when planning starts)

1. Auth hard-cut on publish / groups / upload / role APIs.  
2. **Permission request flow** (User → request Annotator/Editor → Admin/lead approve).  
3. Personal-book defaults (`owner` + unpublished); create gated to Editor+.  
4. Publish status truth (replace `$first`; chapter indicators; same legend for all roles).  
5. College-lead member management to cut Admin clickwork.

## Success criteria

- Role `User` cannot create or edit; they can request Editor/Annotator.
- An Editor can create a personal book that stays private without Admin intervention.
- A public (`userPublished`) book is readable by any signed-in user; edit still requires group assignment (or Admin).
- A college Annotator in a group with पुस्तक X assigned can live-edit X; others cannot.
- Green/blue/lock on the books tree match chapter reality (no silent `$first`).
- Admin weekly work is mostly setup + publish, not per-student firefighting.

## Open follow-ups (not blocking this model)

- Exact “college lead” permission bit vs using Editor + convention.
- Whether anonymous visitors can read `userPublished` books without login.
- Credit / attribution line when personal research is later made public.

## Approval

Approved for planning based on locked chat decisions (2026-11-07), updated same day: live college edits; **User = view-only**; private book create requires **Editor** (request flow to be built); group-assigned Annotator/Editor edit; Admin setup + college lead; `userPublished` = public commons read; public edit still group-scoped.

Next: implementation plan starting with auth hard-cut, **permission request**, personal-book defaults (Editor+), publish status truth, college-lead.
