# Proposal: Simpler college access on START

**For:** Madam  
**From:** START team  
**Date:** 7 November 2026  
**Status:** Proposed (not yet built)

---

## 1. Why change?

Today colleges use **two kinds of groups** (Annotator group and Editor group). That makes it hard to know who belongs where, who should get which role, and who can edit which book.

We also give **Annotator / Editor for the whole platform**, so a person is either “Editor everywhere” or not. That does not match college work, where the same person may be annotator on one book-team and editor on another.

**Goal:** One clear story per college. Admin sets up. The college lead runs day-to-day. People get the right access for **their group’s books**.

---

## 2. Easy picture

```text
                         ADMIN (START)
              Create books (name only)
              Create college group
              Assign books to that group
              Name the group lead
                                |
                                v
                      ONE COLLEGE GROUP
                   (example: MAHE Bangalore)
                      Books: A, B, C
                                |
           +--------------------+--------------------+
           |                    |                    |
         LEAD                EDITOR              ANNOTATOR
    Manage people         Edit analysis         Edit analysis
    Rename books          + Add shloka          (analysis only)
    + Edit analysis       inside the book
```

**Important:** Lead, Editor, and Annotator **all can edit analysis** on the group’s books.  
Only **Editor** can **add new shlokas** (from inside the book).  
Only **Lead** manages who is in the group and which role they have.

---

## 3. Who does what?

### Admin (START)

| Task | Notes |
|------|--------|
| Create a book | Enter a **name only**; empty book is created |
| Create a college group | One group per college (or a separate group if someone needs private work) |
| Assign books to the group | Those books are what the college works on |
| Set the **group lead** | Lead then runs the team |

Admin does **not** assign Annotator/Editor for every student. That becomes the lead’s job.

### Group lead

| Task | Notes |
|------|--------|
| Add people | By **email** (after they have signed in to START once) |
| Set role | **Annotator** or **Editor** |
| Remove people | From that group only |
| Rename books | Books assigned to their group |
| Edit analysis | Yes — same as annotator on group books |

Lead cannot make anyone Admin, Root, or Developer.

### Editor (on that group)

- Edit analysis on the group’s books  
- **Add shlokas inside a book** (no global “Add Shloka” in the navbar)

### Annotator (on that group)

- Edit analysis on the group’s books  
- Cannot add new shlokas  

### Platform roles we still keep

| Role | Purpose |
|------|---------|
| **User** | Default after signup — can view public content until a lead adds them to a group |
| **Admin / Root** | START operations |
| **Developer** | API access only |

---

## 4. Roles are per group (not whole platform)

Example:

- Priya is **Annotator** in group “MAHE”  
- Priya is **Editor** in group “CSU”  

Each **group lead** decides that. There is no single “she is Editor for all of START.”

If someone needs separate / private work: Admin creates **another group** for them and assigns books the same way. We will **not** keep a separate private-research book path for now.

---

## 5. Example day-to-day flow

1. Admin creates book **“Charaka – new batch”**.  
2. Admin assigns it to group **MAHE** and sets the lead.  
3. Lead opens **Group Info**, adds `student@college.edu`, sets role **Annotator**.  
4. Student opens the book and edits analysis.  
5. Lead sets a senior to **Editor**; that person can add shlokas **from inside the book**.

If the email is not found: ask the person to **sign in to START once**, then the lead can add them.

---

## 6. What we stop doing

- Two group types (Annotator group vs Editor/supervisor group) and links between them  
- Giving Annotator / Editor as a **whole-platform** role for college users  
- Global **Add Shloka** in the main navbar  

---

## 7. Benefits

1. **Less confusion** — one group, three clear roles  
2. **Less Admin load** — lead adds students and sets Annotator / Editor  
3. **Correct access** — same person, different role in different groups  
4. **Safer content entry** — new shlokas only inside a book, by editors of that group  
5. **Same story for private work** — create another group; no special exception  

---

## 8. Quick comparison table

| On that group’s books | Lead | Editor | Annotator |
|-----------------------|------|--------|-----------|
| Edit analysis | Yes | Yes | Yes |
| Add shloka (inside book) | No | Yes | No |
| Add / remove people, set roles | Yes | No | No |
| Rename book | Yes | No | No |

---

## 9. Request

Kindly approve this direction so the team can implement it in phases (user emails → per-group roles → merge old double groups → Admin create-book → Add Shloka inside book → stop platform Annotator/Editor assignment for colleges).
