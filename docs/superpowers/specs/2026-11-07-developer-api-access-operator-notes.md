# Developer API Access — Operator Notes

## Vercel Node.js

Set Project Settings → Build and Deployment → Node.js Version to **26.x**.  
`package.json` also pins `"engines": { "node": "26.x" }` for the next deploy.

## Axiom (access logs)

1. Create a free Axiom account.
2. Create dataset `start-api-access`.
3. Create an API token with ingest permission.
4. Set server-only env vars (never `NEXT_PUBLIC_`):
   - `AXIOM_TOKEN`
   - `AXIOM_DATASET=start-api-access`
5. Add them in Vercel project env and local `.env.local`.

If these are missing, downloads still work; events are simply skipped.

## Partner onboarding

1. Admin/Root → Admin → Change User Permissions → set user to **Developer**.
2. Partner signs in → **API Access** → Generate key (copy once).
3. Partner requests books (exact titles as in START).
4. Admin → **API Access** tab → Approve.
5. Partner calls:

```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://start.samsaadhanii.in/api/download?book=BOOK_NAME&part1=&part2=&format=json&dataType=analysis"
```

Also accepted: `X-API-Key: YOUR_KEY`.

`book=all` is denied for Developer keys.

## License / credit

- License: CC BY-NC-SA  
- Credit: Word analyses: Sanskrit Knowledge Accessor (Samsaadhanii), — Samsaadhanii Team  
- Link: https://start.samsaadhanii.in

## Safety

- Do not test against production analysis by rewriting rows.
- Prefer a duplicate Mongo URI or fixtures for experiments.
- Do not commit/push until ready: Vercel auto-deploys `main`.
