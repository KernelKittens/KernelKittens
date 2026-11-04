import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../site/", import.meta.url);
const pages = [
  "index.html",
  "team/index.html",
  "apply/index.html",
  "results/index.html",
  "resources/index.html",
  "writeups/index.html",
  "writeups/kaspersky-sas-ctf-2026/index.html",
  "writeups/bushbash-ctf-2026/index.html",
  "writeups/tfc-ctf-2026/index.html",
  "accessibility/index.html",
  "404.html",
];
const forbiddenThemeMarkers = [
  'class="site-header',
  'class="brand-link',
  'class="motion-stage',
  'class="result-scorecard',
  'class="nav-list',
  'class="button-link',
  "--cobalt:",
  "--surface-alt:",
];

function read(relative) {
  return readFileSync(new URL(relative, root), "utf8");
}

test("every public page uses only the current archive theme", () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /class="ready-archive-page(?:"|\s)/);
    assert.match(html, /class="skip-link"/);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, `${page} needs one main landmark`);
    assert.match(html, /href="\/"/);
    assert.match(html, /<small>est\. 2026<\/small>/);
    assert.equal(html.includes("root@kk"), false, `${page} still contains the retired logo subtitle`);
    assert.match(
      html,
      /<link rel="icon" href="\/brand\/kernel-kittens-mark\.svg\?v=team-logo-20260906" type="image\/svg\+xml">/,
      `${page} must use the current team logo favicon`,
    );
    assert.deepEqual(
      [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]),
      ["/assets/theme.css"],
      `${page} must use only the canonical stylesheet`,
    );
    for (const marker of forbiddenThemeMarkers) {
      assert.equal(html.includes(marker), false, `${page} contains retired theme marker ${marker}`);
    }
    assert.doesNotMatch(html, /[\u2013\u2014\u2018\u2019\u201c\u201d]/u);
  }
});

test("the homepage links to Apply and Discord without loading the application client", () => {
  const home = read("index.html");
  assert.match(home, /<title>Kernel Kittens \| CTF Team<\/title>/);
  assert.match(home, /href="\/apply\/"/);
  assert.match(home, /aria-current="page"[^>]*>\[home\]<\/a>/);
  assert.equal((home.match(/href="https:\/\/apply\.kernelkittens\.team\/auth\/discord\/start"/g) ?? []).length, 1);
  assert.match(home, /<span>Log in with Discord<\/span>/);
  assert.equal((home.match(/src="\/brand\/discord-symbol\.svg"/g) ?? []).length, 1);
  assert.match(home, /<img[^>]*src="\/brand\/discord-symbol\.svg"[^>]*alt=""[^>]*>/);
  const discordSymbolPath = new URL("brand/discord-symbol.svg", root);
  assert.equal(existsSync(discordSymbolPath), true, "the official Discord symbol must be self-hosted");
  const discordSymbol = read("brand/discord-symbol.svg");
  assert.match(discordSymbol, /viewBox="0 0 64 48"/);
  assert.match(discordSymbol, /fill="white"/);
  assert.doesNotMatch(home, /data-ready-root|data-api-origin|data-ready-dialog|data-ready-form/);
  assert.doesNotMatch(home, /<script\b/);
});

test("the homepage removes the redundant path and publishes every verified result", () => {
  const home = read("index.html");
  assert.doesNotMatch(home, /<p class="path-label">\/home<\/p>/);
  assert.match(home, /<h2 id="competition-results-title">Competition results<\/h2>/);
  assert.match(home, /BlackHat MEA Qualification CTF 2026/);
  assert.match(home, /19 \/ 3,349\*/);
  assert.match(home, /<dt>Solved<\/dt><dd>15<\/dd>/);
  assert.match(home, /1,500/);
  assert.match(home, /Cyber Apocalypse 2026/);
  assert.match(home, /12 \/ 6,744/);
  assert.match(home, /136 \/ 136/);
  assert.match(home, /69,425/);
  assert.match(home, /BushBash CTF 2026/);
  assert.match(home, /1 \/ 994/);
  assert.match(home, /28 \/ 28/);
  assert.match(home, /5,997/);
  assert.match(home, /Kaspersky\{CTF\} 2026/);
  assert.match(home, /3 \/ 361/);
  assert.match(home, /<span class="placement-extra">1 \/ 52 \(Europe\)<\/span>/);
  assert.match(home, /<span class="placement-extra">30 \/ 30 \(Europe\)<\/span>/);
  assert.match(home, /<span class="placement-extra">4,413 \(Europe\)<\/span>/);
  assert.equal((home.match(/class="placement-extra"/g) ?? []).length, 3, "the Europe result needs a line in all three columns");
  assert.match(home, /Division: North America, South America, Caribbean/);
  assert.match(home, /30 \/ 30/);
  assert.match(home, /4,413/);
  assert.equal((home.match(/RESULT 2026 \/ team result/g) ?? []).length, 2);
  assert.ok(
    home.indexOf("BlackHat MEA Qualification CTF 2026") < home.indexOf("Kaspersky{CTF} 2026"),
    "the newest result must appear first",
  );
  assert.equal((home.match(/RESULT 2026 \/ member result with a prior team/g) ?? []).length, 2);
  assert.doesNotMatch(home, /KK \/ RESULT 2026/);
  assert.equal((home.match(/Credited to <strong>1337_PwnSp4c3<\/strong>/g) ?? []).length, 2);
  assert.ok(
    home.indexOf("Competition results") < home.indexOf("Recruitment"),
    "results must appear before Recruitment",
  );
});

test("the Results page contains the complete verified competition record", () => {
  const results = read("results/index.html");
  assert.equal((results.match(/class="archive-record"/g) ?? []).length, 4);
  assert.match(results, /BlackHat MEA Qualification CTF 2026/);
  assert.match(results, /19 \/ 3,349\*/);
  assert.match(results, /<dt>Solved<\/dt><dd>15<\/dd>/);
  assert.match(results, /1,500/);
  assert.match(results, /Cyber Apocalypse 2026/);
  assert.match(results, /12 \/ 6,744/);
  assert.match(results, /136 \/ 136/);
  assert.match(results, /69,425/);
  assert.match(results, /BushBash CTF 2026/);
  assert.match(results, /1 \/ 994/);
  assert.match(results, /28 \/ 28/);
  assert.match(results, /5,997/);
  assert.match(results, /Open - International/);
  assert.match(results, /Kaspersky\{CTF\} 2026/);
  assert.match(results, /3 \/ 361/);
  assert.match(results, /<span class="placement-extra">1 \/ 52 \(Europe\)<\/span>/);
  assert.match(results, /<span class="placement-extra">30 \/ 30 \(Europe\)<\/span>/);
  assert.match(results, /<span class="placement-extra">4,413 \(Europe\)<\/span>/);
  assert.equal((results.match(/class="placement-extra"/g) ?? []).length, 3, "the Europe result needs a line in all three columns");
  assert.match(results, /Division: North America, South America, Caribbean/);
  assert.match(results, /30 \/ 30/);
  assert.match(results, /4,413/);
  assert.equal((results.match(/RESULT 2026 \/ team result/g) ?? []).length, 2);
  assert.ok(
    results.indexOf("BlackHat MEA Qualification CTF 2026") < results.indexOf("Kaspersky{CTF} 2026"),
    "the newest result must appear first",
  );
  assert.equal((results.match(/RESULT 2026 \/ member result with a prior team/g) ?? []).length, 2);
  assert.doesNotMatch(results, /KK \/ RESULT 2026/);
  assert.equal((results.match(/1337_PwnSp4c3/g) ?? []).length, 2);
});

test("the application is a full archive record with the existing API flow", () => {
  const apply = read("apply/index.html");
  assert.match(apply, /<title>stray\.rar \| Kernel Kittens<\/title>/);
  assert.match(apply, /<h1>stray\.rar<\/h1>/);
  assert.match(apply, /<h2>stray\.rar<\/h2>/);
  assert.doesNotMatch(apply, /candidate assignment/);
  assert.doesNotMatch(apply, /READY-V[0-9]/);
  assert.match(apply, /Find three fragments in order, then assemble them with the format below\./);
  assert.match(apply, /This challenge is designed to be solvable in under five minutes\./);
  assert.match(apply, /Every correct solve unlocks the KernelKittens Discord and grants Member\./);
  assert.doesNotMatch(apply, /Parts A \+ B \+ C \+ D|10-15 minutes|repeat this challenge/i);
  assert.match(apply, /data-ready-root/);
  assert.match(apply, /data-api-origin="https:\/\/apply\.kernelkittens\.team"/);
  assert.match(apply, /class="application-record"/);
  assert.match(apply, /<ol class="application-steps">/);
  assert.equal((apply.match(/<li class="application-step"/g) ?? []).length, 3);
  const visibleBeforeLogin = apply.slice(0, apply.indexOf("data-ready-assignment hidden"));
  assert.match(visibleBeforeLogin, /Submit format: <code>KernelFlag\{first_second_third\}<\/code>/);
  assert.match(apply, /data-ready-login-link/);
  assert.match(apply, /data-ready-download/);
  assert.match(apply, /data-ready-form/);
  assert.match(apply, /data-ready-flag/);
  assert.match(apply, /KernelFlag\{first_second_third\}/);
  assert.match(apply, /Submit format: <code>KernelFlag\{first_second_third\}<\/code>/);
  assert.match(apply, /Under 5:00 gets Member plus CTF Player\./);
  assert.match(apply, /5:00 or longer gets Member\./);
  assert.match(apply, /data-ready-discord-join/);
  assert.doesNotMatch(apply, /TOP|topTokens|base64|password|256-password/i);
  assert.match(apply, /<script type="module" src="\/assets\/apply\.js"><\/script>/);
  assert.doesNotMatch(apply, /<dialog|data-ready-dialog|data-ready-open|data-ready-close|data-ready-reopen/);
  assert.equal(apply.includes("/apply/stray.rar"), false);
});

test("the application explains timed scoring and keeps reissue hidden until download", () => {
  const apply = read("apply/index.html");
  assert.match(apply, /Scoring is based on the time from your first download to a correct submission\./);
  assert.doesNotMatch(apply, /You can repeat this challenge as many times as you want\./);
  assert.match(apply, /data-ready-reissue-panel hidden/);
  assert.match(apply, /data-ready-reissue-status[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(apply, /data-ready-reissue/);
  assert.match(apply, />Request a new archive<\/button>/);
  assert.match(apply, /A new archive is available after one hour\./);
  assert.match(apply, /Your original timer does not reset\./);
});

test("the application client has no modal controls", () => {
  const client = read("assets/apply.js");
  assert.doesNotMatch(client, /data-ready-dialog|data-ready-open|data-ready-close|data-ready-reopen|showModal/);
  assert.match(client, /\/v1\/session/);
  assert.match(client, /\/v1\/download/);
  assert.match(client, /\/v1\/submit/);
  assert.match(client, /\/v1\/logout/);
  assert.match(client, /\/v1\/reissue/);
  assert.match(client, /data-ready-reissue-panel/);
  assert.match(client, /firstDownloadAtMs/);
  assert.match(client, /reissueAvailableAtMs/);
  assert.match(client, /setInterval/);
  assert.doesNotMatch(client, /TOP|topTokens|data-ready-top|base64|password|256-password/i);
  assert.match(client, /discordJoinReady/);
  assert.match(client, /discordJoinUrl/);
  assert.match(client, /response\.ok[\s\S]*?responseStatus === "received"[\s\S]*?await loadSession\(true\);/);
  assert.match(client, /reissuePanel\.hidden = value\.solvedAtMs !== null \|\|/);
  assert.match(client, /data-ready-discord-join/);
  assert.match(client, /loadSession\(false, true\)/);
  assert.doesNotMatch(client, /function showAssignment\(value\) \{\s*session = value;\s*flag\.value = ""/);
  assert.match(client, /window\.setTimeout\(\(\) => loadSession\(true\), delayMs\)/);
  assert.match(client, /response\.status === 409 && responseStatus === "download_required"/);
  assert.match(client, /response\.status === 503 && responseStatus === "notification_pending"/);
  assert.match(client, /Flag accepted, but the Discord receipt is still pending\. Try submit again\./);
  assert.match(client, /response\.status === 400 && responseStatus === "wrong_prefix"/);
  assert.match(client, /That prefix is wrong\. Re-read the flag format and try again\./);
  assert.doesNotMatch(
    client,
    /download\.addEventListener\("click",[\s\S]*?reissuePanel\.hidden = false/
  );
});

test("the roster is published on the homepage and the team page", () => {
  const blackHatMea = "BlackHat MEA Qualification CTF 2026";
  const kaspersky = "Kaspersky{CTF} 2026";
  const apocalypse = "Cyber Apocalypse 2026 (1337_PwnSp4c3)";
  const bushbash = "BushBash CTF 2026 (1337_PwnSp4c3)";
  const members = [
    ["spookymoo", "SHOOTTHEMESSENGER", [blackHatMea, kaspersky, apocalypse, bushbash]],
    ["hoxed", "Hoxed", [blackHatMea, kaspersky]],
    ["romil1998", "romil0xsec", [blackHatMea, kaspersky, apocalypse, bushbash]],
    ["deva_rp", "Deva_RP", [blackHatMea, kaspersky]],
    ["antsyy_", "Antsy", [blackHatMea, kaspersky, apocalypse, bushbash]],
  ];
  for (const page of ["index.html", "team/index.html"]) {
    const html = read(page);
    assert.equal((html.match(/class="roster-member"/g) ?? []).length, members.length, `${page} needs one card per player`);
    const cards = [...html.matchAll(/<li class="roster-member">[\s\S]*?<\/li>\s*<\/ul>/g)].map((m) => m[0]);
    assert.equal(cards.length, members.length, `${page} needs one parsed card per player`);
    for (const [index, [file, name, played]] of members.entries()) {
      assert.ok(html.includes(`src="/brand/team/${file}.png"`), `${page} is missing the ${file} avatar`);
      assert.ok(html.includes(`<h3>${name}</h3>`), `${page} is missing the name ${name}`);
      const card = cards[index];
      assert.ok(card.includes(`/brand/team/${file}.png`), `${page} card order drifted at ${file}`);
      assert.deepEqual(
        [...card.matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1]),
        played,
        `${page} lists the wrong competitions for ${file}`,
      );
    }
    for (const match of html.matchAll(/<img class="roster-avatar"[^>]*>/g)) {
      assert.match(match[0], /alt=""/, "avatars are decorative next to the name");
      assert.match(match[0], /width="128"[^>]*height="128"/, "avatars need intrinsic dimensions");
    }
    assert.equal(html.includes("roster-handle"), false, `${page} must not publish Discord usernames`);
    for (const [file] of members) {
      assert.equal(
        new RegExp(`>[^<]*\b${file}\b[^<]*<`).test(html),
        false,
        `${page} still shows the Discord username ${file} as visible text`,
      );
    }
    assert.equal(html.includes("sp4reparts"), false, `${page} lists only the five players`);
    assert.equal(html.includes("cdn.discordapp.com"), false, `${page} must self-host avatars`);
  }
  const home = read("index.html");
  assert.match(home, /<h2 id="team-title">Team<\/h2>/);
  assert.match(home, /<a class="archive-action" href="\/team\/">Full team<\/a>/);
  assert.ok(
    home.indexOf("Competition results") < home.indexOf('id="team-title"') &&
      home.indexOf('id="team-title"') < home.indexOf("Recruitment"),
    "the team sits between results and recruitment",
  );
  const team = read("team/index.html");
  assert.match(team, /<title>Team \| Kernel Kittens<\/title>/);
  assert.match(team, /<h1>Team<\/h1>/);
  assert.doesNotMatch(team, /<script/);
});

test("every route exposes the team link", () => {
  for (const page of pages) {
    assert.ok(read(page).includes('href="/team/"'), `${page} is missing the team link`);
  }
  assert.match(read("team/index.html"), /<a href="\/team\/" aria-current="page">\[team\]<\/a>/);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/kernelkittens\.team\/team\/<\/loc>/);
});

test("secondary routes expose their current-page state", () => {
  assert.match(read("results/index.html"), /<a href="\/results\/" aria-current="page">\[results\]<\/a>/);
  assert.match(read("writeups/index.html"), /<a href="\/writeups\/" aria-current="page">\[write-ups\]<\/a>/);
  assert.match(read("accessibility/index.html"), /<a href="\/accessibility\/" aria-current="page">accessibility<\/a>/);
});

test("the canonical stylesheet contains the current archive theme", () => {
  const css = read("assets/theme.css");
  assert.match(css, /\.ready-archive-page\{/);
  assert.match(css, /--page:#060606/);
  assert.match(css, /--link:#ef6a2e/);
  assert.match(css, /\.ready-archive-page \.crew-nav a,\.ready-archive-page \.crew-nav button\{[^}]*display:inline-flex/);
  assert.match(css, /\.ready-archive-page \.competition-records\{[^}]*max-width:none/);
  assert.match(css, /\.ready-archive-page \.competition-records\{[^}]*display:grid/);
  assert.match(css, /\.ready-archive-page \.roster\{[^}]*max-width:none/);
  assert.match(css, /\.ready-archive-page \.roster\{[^}]*grid-template-columns:1fr/);
  assert.match(css, /\.ready-archive-page \.roster\{[^}]*display:grid/);
  assert.match(css, /\.ready-archive-page \.roster-avatar\{[^}]*object-fit:cover/);
  assert.equal(css.includes("roster-handle"), false, "the Discord username style is retired");
  for (const marker of forbiddenThemeMarkers) {
    assert.equal(css.includes(marker), false, `theme.css contains retired marker ${marker}`);
  }
});

test("all local page assets exist", () => {
  for (const page of pages) {
    const html = read(page);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
      const target = match[1].split("#", 1)[0].split("?", 1)[0];
      if (target === "/" || target.endsWith("/")) continue;
      assert.equal(existsSync(fileURLToPath(new URL(`.${target}`, root))), true, `${page} references missing ${target}`);
    }
  }
});
