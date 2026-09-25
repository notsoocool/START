# Shloka cluster design

## Goal

Let an editor combine two or more existing shlokas in the same chapter into one shloka card and one analysis page, without merging their sentences.

## Decision

This is option A with a sentence boundary: one database shloka, one analysis table, graphs still drawn per sentence. Word rows from shloka A are not concatenated into the sentence of shloka B.

## Data

- One new `Shloka` document replaces the selected documents.
- `slokano` is `${first}-${last}` after sorting the selected numbers by their leading integer. Example: `051` and `052` become `051-052`. Three selections `051`, `052`, `053` become `051-053`.
- `spart` is the selected texts joined with `#`, in that same number order. The chapter card already renders each `#` piece as its own paragraph, so the verses stay visually separate.
- Analysis rows move onto the new `slokano`. Their `word`, `poem`, `anvaya_no`, and `kaaraka_sambandha` values are copied unchanged.
- `sentno` is the only analysis field rewritten, and only to avoid a collision. Each source shloka’s distinct sentence numbers are mapped onto a fresh increasing sequence. Two sources that both used `sentno` `"1"` become `"1"` and `"2"`. A source that already has sentences `1` and `2` keeps those rows as two sentences; the next source starts at the next free number. Rows that shared a `sentno` inside one source still share one `sentno` after the move.
- The old shloka documents are deleted. Their analysis rows are not deleted; they now belong to the cluster.
- Bookmarks and discussions that pointed at the old shloka ids are left as-is. This version does not migrate them.

## Rules

- Every selected shloka must share `book`, `part1`, `part2`, and `chaptno`.
- At least two shlokas.
- Reject a selection that already contains a clustered `slokano` (the value includes `-`).
- Reject when any selected shloka is `locked`.
- Reject when `${first}-${last}` is already used in that chapter.
- `userPublished` and `groupPublished` on the new shloka are true only when every selected shloka already has that flag true. `owner` is copied from the first shloka in number order.

## Out of scope

- Merging word rows into a single sentence or a single graph.
- Changing kaaraka / discourse strings so they point across former shloka boundaries.
- The separate report that Add Shloka sometimes fails to process two or more pasted shlokas. That stays a different change.
- Un-clustering back into the original records.

## Success

After combining `051` and `052`, the chapter shows one card `051-052` with both verses stacked, and the analysis page lists both sentences under different `sentno` values with their original words.
