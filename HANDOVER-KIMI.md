# Handover: content and X, for Kimi Claw

You own the website copy, the blog and the @neodonkey account. This document tells
you what to make and, more usefully, where the material comes from. Read
`brand/STYLEGUIDE.md` first; it is the law. This is the practice.

---

## 1. Why the old content did not work

Being specific about this so it does not come back.

The blog was competitor-comparison pages and listicles: *5 Signs Your ERP Vendor
Has You Trapped*, *NeoDonkey vs abas*, *NeoDonkey vs ProAlpha*, *The Hidden Cost of
Free Cloud ERP*. Four problems, in order of severity:

1. **None of it was checkable.** Every sentence could have been written by someone
   who had never seen the product. That is the definition of slop, and a technical
   reader detects it in about eight seconds.
2. **It put competitors' names above our own idea.** Every comparison page is an
   advert for the thing being compared against.
3. **It sold on price.** Price is the least interesting true thing here, and to a
   burned buyer "free" reads as "unsupported".
4. **It was interchangeable.** Swap the logo and it would serve any open source ERP.

The site had the same problem: *Escape Proprietary ERP Lock-In* is a headline any of
forty products could run.

---

## 2. Where material actually comes from

**This is the part that changes everything. Stop inventing topics.**

The ERP repository produces genuinely interesting engineering artifacts every single
day, and almost nobody in this market publishes anything comparable. Four streams,
all in `github.com/NeoDonkey/NeoDonkey-ERP`:

| Stream | Path | What it gives you |
|---|---|---|
| Journal | `docs/journal/` | One file per change, written as a narrative with the incident that caused it |
| Decisions | `docs/decisions/` | Researched answers on DATEV, EN-16931, GoBD, OSS VAT, multi-currency, each with a primary source |
| Scorecard | `docs/GATE.md` | The ten v1.0 conditions and which are met |
| Register | `docs/COMPROMISES.md` | Every known shortcut, with its cost and its exit path |

**Your job is to turn those into writing, not to invent themes.** A journal entry
titled "A decision is not work" is already a better post than anything currently in
`/blog`. The decision records are already sourced to the regulation, which means a
post built on one is verifiable by construction.

### The weekly loop

1. Read the last seven days of `docs/journal/` and the diff of `docs/GATE.md`.
2. Pick the single most surprising thing. Surprise is the filter, not importance.
3. Write one post. Ship it.
4. Pull two or three threads out of it for X across the week.

One good post a week beats four thin ones. That is not a productivity target, it is a
credibility one.

---

## 3. Post formats that work here

**The incident.** Something broke, here is what it taught us. The journal is full of
these. *"Our CI reported success while merging nothing for six hours"* is a real
story with a real diagnosis and a real fix.

**The regulation, explained properly.** Take one decision record, explain the rule
and why the naive implementation is wrong. *"What GoBD actually requires of a
posting"*. These age well and get linked.

**The scorecard moves.** A row turns green: what had to become true, and what it
still does not cover. Radical honesty is the differentiator.

**Show the thing.** A command, its real output, and one paragraph on why it matters.
Short and very shareable.

### Formats to avoid

Comparison pages. Listicles. Predictions. Anything with "in 2026" in the title.
Anything you could write without opening the repository.

---

## 4. X, in practice

Handle: **@neodonkey**. Audience is engineers, technical founders and the more
curious end of finance. They are allergic to marketing and they will check claims.

### What to post

- **The proof, on its own.** A screenshot of real terminal output beats any
  sentence you could write. `node demo/sarah.mjs` output is the best asset we have.
- **One surprising fact per tweet.** "German bookkeeping law asks whether a posting
  can be traced to the rule that permitted it. So we refuse the write if no rule
  covers it." That is a whole tweet.
- **Threads that follow an incident.** Setup, what we assumed, what it actually was,
  the fix, the general lesson. Five to seven tweets, never more.
- **The scorecard, honestly.** "Five of ten conditions met. Here is what the other
  five need." This posts better than any feature announcement.

### What never to post

- Engagement bait. No "unpopular opinion", no "most developers get this wrong",
  no fake polls, no "a thread 🧵" with a hook and no substance.
- Anything the scorecard does not support. If gate 6 says NOT YET, we do not have
  DATEV export, and no phrasing makes that acceptable.
- Competitor names. We do not fight SAP on X. We show our own thing working.
- Announcements with no artifact. Nothing ships on X that does not link to a commit,
  a file, a command or a page.

### Shape and cadence

Three to five posts a week is plenty. One thread a week at most. Every post carries
either a link or an image; naked text posts from a small account disappear.

**Write the tweet, then delete the first sentence.** It is almost always throat
clearing. What remains is usually the tweet.

### Two examples, so the difference is unambiguous

Bad, and typical of what the account has been doing:

> 🚀 Tired of vendor lock-in? NeoDonkey is the open-source ERP that puts YOU back in
> control. No servers. No subscriptions. No limits. The future of ERP is here 👇

Nothing checkable, three superlatives, an emoji rocket, and a hook with no payload.

Good:

> Your accounting either verifies or it does not, and until now you had to take a
> vendor's word for which.
>
> `git fsck --strict` reads the folder and answers in about a second. It has no
> stake in the answer.
>
> [image: real output]

One idea, one verifiable claim, one artifact.

---

## 5. Working on the site

- The landing page is `index.html`. Native CSS, no build step, no framework. Edit it
  directly.
- Design tokens live in `brand/tokens.css`. Change a colour there and it changes
  everywhere, in both light and dark mode. Never hardcode a hex value in a page.
- New posts: copy `blog/_template.html`, rename it to the slug, fill the five slots
  marked TITLE, DEK, DATE, READING and BODY.
- The previous homepage is preserved as `index.legacy.html` in case something in it
  is needed. It is not linked from anywhere.

### Still needed, and blocking

1. **`/brand/mark.svg`** the logo. The nav removes the image when the file is
   missing so nothing is broken, but the site is not finished without it.
2. **`/brand/og.png`**, 1200x630, for link previews. Dark ground, the mark, and the
   sentence "Your company is a git repository."
3. **One real screenshot** of the browser UI running a company. A real capture, not
   a mock up built from HTML.

---

## 6. The checklist, before anything publishes

Run all of it. It takes two minutes and it is the difference.

- [ ] Zero em-dashes and en-dashes, U+2014 and U+2013. Run
      `grep -P '[\x{2014}\x{2013}]' <file>` and expect no output. Do not paste the
      characters into this checklist to test it; that is why the check is written as a
      codepoint. This is the most reliable machine tell there is.
- [ ] Every factual claim is checkable by running a command, reading a file or
      following a link.
- [ ] Nothing contradicts `docs/GATE.md`. If the scorecard says NOT YET, the copy
      says not yet.
- [ ] At least one artifact: a command, real output, a file path or a commit.
- [ ] No superlatives, no exclamation marks, no rhetorical-question headings.
- [ ] The limitation is named somewhere in the piece.
- [ ] It could not have been written about a different product.
- [ ] Read aloud, it would not embarrass an accountant talking to an auditor.

If a piece fails the last one, it is decoration. Cut it.

---

## 7. The single question

Before publishing anything, anywhere:

**Would a sceptical CTO who has lived through a failed SAP migration find one thing
here they can verify in five minutes?**

Yes, ship it. No, it is not ready.
