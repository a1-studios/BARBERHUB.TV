# 08 — Monitoring & incidents

Catching SEO regressions early and the runbook for when they happen.

## Alerts to configure

| Source | Alert | Threshold | Channel |
| --- | --- | --- | --- |
| Google Search Console | Manual action | any | Email + Slack #seo |
| GSC | Indexing errors spike | +20 errors w/w | Slack #seo |
| GSC | Coverage drop | indexed pages –5% w/w | Slack #seo |
| Semrush | Position lost (top 10 keywords) | drop > 5 positions | Email |
| Semrush | New competitor in top 10 | any | Email |
| PageSpeed Insights (cron) | CWV breach on tracked URLs | any metric over budget | Slack #seo |
| Supabase (`seo_events`) | Daily landing views | drop > 30% d/d | Slack #seo |

Cron job lives in `supabase/functions/seo-health-check` (TODO — not yet built; spec it when the first KPI dashboard exists).

## Incident: rankings dropped

Triage in this order — first match wins:

### 1. Algorithm update?

- Check https://status.search.google.com and SEO news sites (Search Engine Land, Search Engine Roundtable) for a confirmed update in the last 7 days.
- Compare drop pattern to the update's known signals (e.g., Helpful Content, Core, Spam).
- If algorithm: don't panic-edit. Wait 1–2 weeks for the rollout to settle, then assess. Reactive edits during a rollout add noise.

### 2. Technical regression?

Run through:
- [ ] Robots.txt unchanged? `curl https://barberhub-tv.lovable.app/robots.txt`
- [ ] Sitemap reachable and valid? `curl https://barberhub-tv.lovable.app/sitemap.xml | head`
- [ ] Affected page returns 200 (not 301/404/500)?
- [ ] Affected page has `<title>`, `<meta description>`, canonical?
- [ ] Affected page rendered HTML matches what Googlebot sees? Use GSC URL Inspection → "Test live URL".
- [ ] Recent deploy in the last 14 days that touched the affected route? Roll back or hotfix.

### 3. Content decay?

- The page hasn't been updated in 6+ months and competitors have refreshed.
- Fix: refresh copy, add new FAQ entries, update `<lastmod>`, resubmit in GSC.

### 4. Lost backlinks?

- Semrush → Backlink Analytics → Lost. Were any high-authority links removed?
- Try outreach to recover. If unrecoverable, accept and rebuild elsewhere.

## Incident: pages deindexed

1. GSC → Coverage → see exclusion reason.
2. Common causes and fixes:

| Reason | Fix |
| --- | --- |
| `noindex` tag detected | Remove the tag, request reindex |
| Duplicate, Google chose different canonical | Verify our canonical is correct and self-referencing |
| Crawled — currently not indexed | Improve content quality, add internal links, wait |
| Discovered — currently not indexed | Add internal links, submit in sitemap, request indexing |
| Soft 404 | Ensure page has substantive content, not just "no results" |
| Blocked by robots.txt | Check robots.txt for unintended Disallow |

3. After fixing, use GSC URL Inspection → Request Indexing (max 10/day).

## Incident: traffic drops with no ranking change

Means rankings held but clicks fell. Causes:

- New SERP feature (AI Overview, Featured Snippet) eating clicks above us.
- Seasonality (haircut searches dip in late December, spike in May/August/before-school).
- Brand-name confusion (a new competitor with similar name).

Compare GSC impressions vs clicks side-by-side. If impressions held but CTR fell → SERP feature. Adjust title/description to win the click back.

## Kill / merge rule

If a page has 0 clicks in 90 days AND < 100 impressions:
- **Merge** into a stronger sibling page if topics overlap (301 redirect).
- **Kill** with 410 Gone otherwise. Remove from sitemap.

Document the decision in `docs/seo/retired-pages.md` (create the file the first time you retire something) so we don't accidentally rebuild the same dead page.

## Escalation

For anything you can't resolve in 30 minutes of triage:
1. Post in #seo with the GSC screenshot, the URL, and what you've already tried.
2. Tag the growth owner.
3. Do NOT mass-edit pages while uncertain — one bad edit shipped to 150 pages is a much bigger fire.
