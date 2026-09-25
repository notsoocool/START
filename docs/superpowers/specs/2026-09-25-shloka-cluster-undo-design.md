# Undo a shloka cluster

## Goal

After combining shlokas, an editor can open the cluster, decide it was unnecessary, and restore the original shloka cards and sentence numbers.

## Data

- When a cluster is created, the new shloka stores `clusterUndo`: one entry per source shloka with `slokano`, `spart`, publish flags, `locked`, `owner`, and `sentnoMap` (`from`, `to`, `rows`).
- Undo moves analysis rows from the cluster sentence number back to `from` and the original `slokano`. It does not change `word`, `poem`, `anvaya_no`, or `kaaraka_sambandha`.
- The original shloka documents are created again and the cluster document is deleted.
- Undo combine stays available for 24 hours after `clusteredAt`, measured on the server. After that the cluster stays combined and the button is hidden.
- A cluster with no `clusteredAt` keeps undo, because the combine time is unknown.
- A cluster created before this snapshot existed cannot be undone.

## Who

Root, Admin, and an Editor assigned to the book. Annotators cannot undo.

## Rules

- Undo is refused when a restored shloka number already exists in the chapter.
- Undo is refused when the number of analysis rows no longer matches the snapshot, so added or deleted rows are not left behind.
- The confirm step is a shadcn dialog on the shloka page, labeled "Undo combine". After success the user returns to the chapter list.
