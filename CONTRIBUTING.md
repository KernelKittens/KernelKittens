# Contributing Write-ups to Kernel Kittens

This repository hosts the static source for [kernelkittens.team](https://kernelkittens.team). Team members are encouraged to submit challenge write-ups, exploit scripts, and post-competition analyses.

## Submission Guidelines

1. **Post-Competition Only**: Only submit walkthroughs for events that have concluded. Do not publish solutions for active CTFs.
2. **Verified Solves**: Include the confirmed flag and reproducible exploit code or command receipts wherever possible.
3. **No Personal Data**: Use player handles only. Never include real names, email addresses, or Discord IDs.

## How to Submit a Write-up

### Option 1: Pull Request (Recommended)

1. Fork this repository and clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/KernelKittens.git
   cd KernelKittens
   ```
2. Create a new branch:
   ```bash
   git checkout -b writeup/event-name
   ```
3. Add your challenge solves:
   - For an existing event, add an `<article class="archive-record">` block to `site/writeups/<event-slug>/index.html`.
   - For a new event, create `site/writeups/<event-slug>/index.html` following the Ready v3 archive layout, add an event card in `site/writeups/index.html`, and register the URL in `site/sitemap.xml`.
4. Test your changes locally:
   ```bash
   npm test
   ```
5. Commit and open a Pull Request against `main`.

### Option 2: Issue Template

If you prefer not to write HTML directly:
1. Open a new issue using the [Write-up Submission Template](https://github.com/SpookyMoo/KernelKittens/issues/new?template=writeup_submission.md).
2. Fill in the event, challenge name, category, solve details, and flag.
3. A maintainer will format and integrate it into the site.

## Code and Style Standards

All pages in `site/` follow the Ready v3 archive contract:
- **Stylesheet**: `site/assets/theme.css` is the sole authorized stylesheet. Do not link external CSS, Google Fonts, or CDNs.
- **Typography & Punctuation**: Standard ASCII only. Do not use em dashes, en dashes, or smart/curly quotes.
- **Components**: Use `.archive-record`, `.archive-meta`, `.tag`, and `.terminal-frame` classes.
- **Semantic HTML**: Ensure all images have descriptive `alt` attributes and headings follow a logical hierarchy (`h1` -> `h2` -> `h3`).
