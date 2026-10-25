# Danio website

## GitHub Pages

This repository contains only the static website. No npm install, build step,
server, or secrets are required. Publish the repository root directly.

After you commit and push the files yourself:

1. Open repository **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Select **main** and **/(root)**, then **Save**.

Expected address after a successful deployment:
<https://imahdiehm.github.io/danio_website/>.
The root opens English; Persian is available at `fa/` and English at `en/`.
All local asset and language links are relative, including the root redirect,
so they work under `/danio_website/` and on a custom domain.
The `.nojekyll` file keeps the site as plain static files.

Setup reference: [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Local preview

Run `python -m http.server 8879 --bind 127.0.0.1` in this directory, then open
<http://127.0.0.1:8879/>. Use HTTP rather than opening HTML files directly.

Buildless English and Persian presentation site with a warm cream background, navy ink,
particle wordmark, and architectural floor-plan flow illustration. Serve this directory as the web root; the root opens English.

Preview from the repository root:
`python -u -m http.server 8879 --directory . --bind 127.0.0.1`
Open `/en/` or `/fa/`. No installation, external font service, analytics, or third-party runtime
dependencies are required. Language switching retains the current section.
Numbers and interface labels follow the selected language.

## Owners

- `en/index.html`, `fa/index.html`: localized content, navigation, playground
  controls, FAQ, and technical guide links.
- `assets/style.css`: responsive layout, RTL, reveal and hover transitions,
  keyboard focus, and reduced-motion styles.
- `assets/app.js`: mobile navigation and the standalone illustrative grid demo.
- `assets/brand-intro.js`: a finite 2.75-second fullscreen particle/fish entrance,
  followed by docking into the original static wordmark. Runs once per tab session
  when storage is available. Language changes, section deep links, restored scroll,
  reduced-motion preferences and late image loads bypass it. Enter/Escape skips it;
  a four-second failsafe releases the overlay. Image fallback needs no JavaScript.
- `assets/ambient.js`: independent conceptual floor-plan animation. Twelve connected
  itineraries use shared junctions, rounded turns, eight portals and six room blocks.
  Rendering is capped near 30 fps and pauses offscreen, when hidden, or on request.
- `assets/favicon.svg`: particle initial.
- `assets/danio-wordmark.png`: transparent particle wordmark derived from the supplied brand reference.
- `assets/fonts/Vazirmatn-variable.woff2`: self-hosted Vazirmatn v33.003,
  weights 100–900, shared Persian and Latin typography. The unmodified font and
  its `OFL.txt` license come from https://github.com/rastikerdar/vazirmatn/tree/v33.003.
  Keep the license with the font when distributing the website.

## Demo boundary

The animated architectural floor plan is a conceptual graphic, not live sensor
data or a connected digital twin.
The site does not claim machine-learning inference or physical synchronization.

The browser demo is separate from the native C# engine and analysis dashboard.
It uses a 48 x 26 grid, four-neighbor shortest-path distances, seed 42, unique
starts, and synchronous proposals into empty, unreserved cells. Controls change
population, single/dual exits, playback speed, and agent/density views. The
counter reports model steps, not seconds.

The three numbered obstacles support mouse/touch dragging with a grid-snapped
preview. Blue outlines indicate valid placement; red indicates overlap. Blocks
must keep one free cell between each other and the outer boundary, preserving
corridors and exit access. Releasing a valid moved block rebuilds the graph and
restarts the seeded population, retaining the previous run/pause state. Invalid
moves and cancelled drags keep the original layout and run. Escape, pointer
cancellation, capture loss, window blur and hidden tabs cancel pending movement.
Focus the plan, select obstacles with 1–3, and use arrow keys for keyboard moves.
Reset restarts the current layout; Reset layout restores the default obstacles.
Layouts are browser-memory only and do not persist across page loads.

Density is a visual kernel around
current agents, not a calibrated physical measurement. This demo does not
reproduce native policy, RNG, movement chains, metrics, or persisted results.

The multi-route sketch has intersecting, bidirectional decorative flows on a
shared architectural network. These are illustrative trajectories rather than
collision-resolved predictions. Pointer movement repels nearby particles; holding
the primary button gathers them. The flow pause button affects only this sketch.
The logo introduction finishes permanently for that tab session and the masthead
then contains only the original static image. Reduced-motion starts the flow paused
and skips the introduction. Pointer leave, cancellation, window blur and hidden
tabs clear interaction state.

Motion pauses in hidden tabs; offscreen canvases skip drawing and the playground
skips stepping. Reduced-motion preferences disable initial autoplay and reveal
transitions. Visitors can explicitly play the demo or toggle decorative motion.
Navigation, content, links, and FAQ remain available without JavaScript.

## Validation

Check both languages at desktop and mobile widths, keyboard navigation, mobile
menu, FAQ, motion controls, population, playback speed, exits, reset, density,
obstacle dragging, invalid placements, cancellation, keyboard movement, layout reset,
and run completion. Check diagram hover repulsion, held-click attraction,
release/leave recovery, pause and reduced-motion behavior. Check the browser console and local section/asset links.
Run `node --check assets/app.js` after behavior edits.

Danio is the public brand; plugin names, GUIDs, and schemas remain Surica.
Guide links use the existing GitHub repository and depend on its public access.
No public binary download is offered here. A custom domain is not configured.
