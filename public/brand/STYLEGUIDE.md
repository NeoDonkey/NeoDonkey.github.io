# NeoDonkey brand and style guide

For humans and for agents. Everything here is a rule you can check, not a mood you
have to intuit. If a rule and your taste disagree, the rule wins, because the point
of this document is that six months of output looks like one hand made it.

---

## 1. The one idea

**Your next ERP is your last.**

That is the headline, the positioning and the promise at once. Everything on the site is
downstream of it. When a page, a post or a tweet does not trace back to it in one step,
it is off brand no matter how well written it is.

It rests on Principle 6, compatibility in both directions. A document written today opens
in thirty years. A document written tomorrow opens in the version running now. Updates
add and never remove. That is why there is no next migration, and the migration is the
thing every ERP buyer is actually afraid of.

Four supporting arguments, in the order the page makes them:

1. **Nobody sells you an ERP. They sell you the migration.** (Principle 6)
2. **Your systems do not need integrating. They need speaking to.** (Principle 5)
3. **What your COO writes is what the system runs.** (Principle 11)
4. **The screen is the disposable part.** (Principle 7)

Then ground and scale: the company is the data centre (Principle 2), and one laptop or
ten thousand employees run the same software (Principle 8).

**What this replaced, and why.** The site led for a while with "Your company is a git
repository", and before that with "The ERP That Costs Zero. Forever." The first is true
and reads to a CFO as a developer tool. The second sells on price, which is the least
interesting true thing here and reads as "unsupported" to anyone who has been burned.
A version after those led on Europe. Sovereignty is a reason to trust the design, not a
reason to buy, so it is an argument in the middle of the page and not the headline.

**Register.** Write for someone with budget authority who has survived a failed
implementation. Never write down to them and never write like a startup. No "we're
building", no roadmap language, no hobby project modesty.

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

Every value is sampled from the logo rather than chosen to sit next to it. The mark
is a neon donkey on a deep indigo plate, and two values carry it:

- `#23C7F6` the glow. The single most identifiable thing about the brand.
- `#1A0D58` the plate it stands on.

So the site is **dark by default and indigo grounded**. That is what lets the mark
sit on the page instead of looking stuck to it. Light mode is supported and contrast
checked, it is simply not the primary expression.

| Token | Dark (default) | Light | Used for |
|---|---|---|---|
| `--paper` | `#0D0A26` | `#FBFAFF` | Page. Deeper than the plate so the mark reads as a badge. |
| `--paper-sunk` | `#14103A` | `#F1EFFA` | Recessed panels, the proof block. |
| `--ink` | `#EDEBFF` | `#14103A` | Body text. Violet leaning, never pure. |
| `--ink-soft` | `#A7A2CE` | `#4E4877` | Secondary text. |
| `--ink-faint` | `#726C9C` | `#7E78A6` | Meta, captions. |
| `--rule` | `#241E56` | `#E0DCF0` | Hairlines. |
| `--accent` | `#3DD8F5` | `#0A6E8A` | The glow. |
| `--btn-bg` / `--btn-ink` | `#3DD8F5` / `#06121A` | `#1A0D58` / `#FFFFFF` | Primary action. |
| `--verified` | `#5FE3A6` | `#10714B` | Verified state, quoted output only. |

**One accent, and it is the glow.** It is allowed in exactly four places:

1. the emphasised words in the hero headline,
2. the primary button,
3. the focus ring,
4. a NOT YET row on the scorecard.

Never a background wash for a whole section, never a gradient, never an outer glow
in CSS. The mark already glows; the interface does not need to.

**Why the accent changes value between modes.** The glow is too bright to be a text
colour on white, so light mode darkens it and moves the primary button to the indigo
plate. Both values still come from the logo and the hue family does not change.

**The mark is the only place the full neon range appears.** Magenta and violet live
inside the logo image and nowhere else. Do not pull them into the interface, or the
page becomes a poster and stops being readable.

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

- One radius scale: 4, 8, 14. The 14 matches the corner of the logo plate at small
  sizes, which is why the nav badge and the proof block agree. Nothing round.
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

- **A loop is allowed only when the loop is the argument.** Four diagrams on the landing
  page loop, and each one earns it by showing something that happens over time and could
  not be drawn as a still: a machine dropping out and the traffic rerouting, a document
  stopped at a version wall while another passes through, a translation happening at a
  boundary, an interface being replaced while the core does not move. Decoration never
  loops. If you cannot say in one sentence what the motion proves, it does not ship.
- Each diagram carries its argument in a mono caption inside the drawing, so the point
  survives a screenshot.
- No parallax, no scroll hijacking, no custom cursor.
- Reveal uses `IntersectionObserver`. A scroll event listener is banned.
- Everything collapses under `prefers-reduced-motion: reduce`.

Every animation must answer "what does this communicate". Hierarchy, sequence or
feedback are valid answers. "It looked cool" is not.

---

## 7. Images

**Done.** The mark ships at `/brand/mark.png` with sizes at 512, 180, 128, 64 and 32,
a favicon, and an Open Graph card at `/brand/og.png` composed from the mark on the
indigo ground.

**The mark is not the hero image.** It is a nav badge, a favicon and an OG card. A logo
in the hero slot says nothing about the product and reads as a placeholder. The hero
carries the mesh diagram instead, which is the one picture that explains the system.

**Still open.** One real screenshot of the browser UI running a company, for a
section below the proof block. A real capture, never a mock up built from HTML.
Until it exists the page ships without product photography, which is a gap rather
than a style choice.

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
- A page that claims something the scorecard does not support. The scorecard is no longer
  a section on the landing page, because five NOT YET rows in front of a buyer reads as a
  prototype rather than as honesty. It is linked in the footer as "Build status" and it is
  still the thing every claim has to survive.

---

## 9. The one check before publishing anything

Open the page or the post and ask: **would a sceptical CTO who has been through a
failed SAP migration find one thing here they can verify in five minutes?**

If yes, ship it. If no, it is decoration.
