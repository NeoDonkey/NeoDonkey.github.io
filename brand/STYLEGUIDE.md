# NeoDonkey brand and style guide

For humans and for agents. Everything here is a rule you can check, not a mood you
have to intuit. If a rule and your taste disagree, the rule wins, because the point
of this document is that six months of output looks like one hand made it.

---

## 1. The one idea

**Your company is a git repository.**

That sentence is the product, the positioning and the proof at once. Everything on
the site is downstream of it. When a page, a post or a tweet does not trace back to
it in one step, it is off brand no matter how well written it is.

What it replaced, and why: the site used to lead with "The ERP That Costs Zero.
Forever." Price is the least interesting true thing about this product, it invites a
race to the bottom, and every buyer who has been burned reads "free" as "unsupported".
Lead with the property nobody else has.

---

## 2. Voice

The house voice is **a good engineer explaining something true, to someone who has
been lied to before.** Calm, specific, unhurried, faintly amused. Never excited.

### Rules

1. **Every claim is checkable.** If a reader cannot verify it by running a command,
   reading a file or clicking a link, cut it or rewrite it until they can.
2. **Name what does not work.** The scorecard section is the most persuasive thing on
   the site precisely because five rows say NOT YET. Publishing weakness is the
   strategy, not an accident of honesty.
3. **Concrete nouns beat adjectives.** Not "powerful audit trail". Instead: "every
   posting names the written rule that authorized it".
4. **No superlatives.** No revolutionary, seamless, cutting edge, game changing,
   next generation, unleash, elevate, effortless, blazing fast.
5. **No hedging either.** Not "we believe this may help". Say what it does.
6. **Short sentences carry the weight.** Long sentence, then a short one. Like this.
7. **German precision, English plainness.** GoBD, Nachvollziehbarkeit, UStVA and
   XRechnung are used by their real names, never translated into marketing.

### Banned characters and constructions

- **The em-dash and en-dash are banned everywhere.** Headlines, body, captions, alt
  text, tweets. Use a period, a comma, parentheses or a colon. This is the single
  most reliable tell that a machine wrote something.
- No exclamation marks.
- No rhetorical questions as headings ("What if your ERP just worked?").
- No emoji in body copy, headings or on the site. In tweets, at most one, and only
  when it carries information.
- No "we're excited to announce".

### A test you can run

Read any sentence aloud. If it would sound absurd said calmly by an accountant to
an auditor, rewrite it.

---

## 3. Colour

One accent. Never a second.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--paper` | `#FBFAF7` | `#12110D` | Page background. Never pure white or black. |
| `--paper-sunk` | `#F3F1EC` | `#1B1A15` | Recessed panels, the proof block. |
| `--ink` | `#16150F` | `#F2EFE6` | Body text. |
| `--ink-soft` | `#56534A` | `#A8A296` | Secondary text. |
| `--ink-faint` | `#8C877A` | `#79736A` | Meta, captions. |
| `--rule` | `#E2DED4` | `#2C2A23` | Hairlines. |
| `--stamp` | `#C0341C` | `#F2603F` | The accent. |
| `--verified` | `#2F6B4F` | `#6FBF93` | Verified state in quoted output only. |

**The accent is cinnabar, the colour of an audit stamp.** It is deliberately not a
SaaS blue and not a terminal green. It is allowed in exactly four places:

1. the logo mark,
2. the primary button,
3. the focus ring,
4. a NOT YET row on the scorecard.

It is never a background wash for a whole section, never a gradient, never a glow.
If you find yourself wanting a second accent, you want a different layout instead.

`--verified` green appears only inside quoted command output, because that is where
it appears in the real terminal. It is not a UI colour and never marks a button.

---

## 4. Type

No webfont is loaded, on purpose. The product ships zero dependencies and a landing
page that pulls three font files to announce that would be arguing with itself.

- Display and body: the system UI stack.
- Mono: the system mono stack. Mono carries the proof, so it is load bearing here
  rather than decorative.

Scale lives in `tokens.css`. Do not invent sizes outside it.

**If you later license a display face**, set `--font-display` in `tokens.css` and
nothing else changes. Faces that suit this brand: ABC Diatype, Söhne Breit,
GT America Display. Do not use Inter, and do not reach for a serif; this is not an
editorial brand, it is an engineering one.

**Headline discipline.** Two lines maximum. Tracking `-0.035em` at hero size. If a
headline needs three lines, the headline is too long, not the type too big.

---

## 5. Layout

- One radius scale: 4, 8, 12. Nothing else, nothing round.
- Hairlines separate sections. Cards only when elevation means something.
- Grids are asymmetric on purpose. `1.35fr 1fr` for the hero, `1.6fr 1fr` for the
  consequence grid. Three equal columns are banned.
- Every multi-column block collapses to one column below 820px. Declare it in the
  same rule, never assume.
- Section rhythm comes from `--section`, which scales with the viewport.

---

## 6. Motion

Dial: 5 of 10. Entry animation on the hero, reveal on scroll, a 1px push on button
press. That is the complete list.

- No looping animation anywhere.
- No parallax, no scroll hijacking, no custom cursor.
- Reveal uses `IntersectionObserver`. A scroll event listener is banned.
- Everything collapses under `prefers-reduced-motion: reduce`.

Every animation must answer "what does this communicate". Hierarchy, sequence or
feedback are valid answers. "It looked cool" is not.

---

## 7. Images still needed

The site currently ships without photography, which is a gap rather than a style.
These are the slots, in priority order.

1. **`/brand/mark.svg`** the logo. Referenced by the nav and the favicon. The nav
   removes the image if the file is missing, so the site is not broken without it,
   but it is not finished either.
2. **`/brand/og.png`**, 1200x630, for link previews on X and LinkedIn. Dark
   background, the mark, and the sentence "Your company is a git repository."
3. **One real screenshot** of the browser UI running a company, for a section below
   the proof block. A real capture, never a mock up built from HTML.

Rules for any image added later: no stock photography of people in offices, no
abstract 3D shapes, no gradient meshes. If a picture is not of the actual product or
of a real document, it probably should not be there.

---

## 8. What the site must never become

- A comparison-page farm. "NeoDonkey vs abas", "NeoDonkey vs ProAlpha" and the rest
  are SEO chaff. They rank for nothing durable, they read as desperate, and they put
  competitors' names above our own idea. The existing ones can stay until they are
  replaced by something better; do not write more.
- A feature list. Features are the least differentiated thing here.
- A page that claims something the scorecard does not support.

---

## 9. The one check before publishing anything

Open the page or the post and ask: **would a sceptical CTO who has been through a
failed SAP migration find one thing here they can verify in five minutes?**

If yes, ship it. If no, it is decoration.
