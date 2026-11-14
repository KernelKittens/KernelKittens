function requireElement(root, selector) {
  const element = root.querySelector(selector);
  if (element === null) throw new Error("Ready page is incomplete");
  return element;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSession(value) {
  if (
    !isObject(value) ||
    value.authenticated !== true ||
    !isObject(value.artifact) ||
    typeof value.displayName !== "string" ||
    value.displayName.length < 1 ||
    value.displayName.length > 64 ||
    typeof value.csrf !== "string" ||
    value.csrf.length < 16 ||
    value.csrf.length > 512 ||
    typeof value.downloadAction !== "string" ||
    !/^v1\.[0-9]{13}\.[A-Za-z0-9_-]{43}$/u.test(value.downloadAction) ||
    typeof value.artifact.filename !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,126}\.rar$/u.test(value.artifact.filename) ||
    typeof value.artifact.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.artifact.sha256) ||
    !(value.solvedAtMs === null || Number.isSafeInteger(value.solvedAtMs)) ||
    !(value.score === null ||
      (Number.isSafeInteger(value.score) && value.score >= 0 && value.score <= 1000)) ||
    !(value.inviteEligible === null || typeof value.inviteEligible === "boolean") ||
    !(value.discordInviteUrl === null || typeof value.discordInviteUrl === "string") ||
    typeof value.discordJoinReady !== "boolean" ||
    !(value.discordJoinUrl === null || typeof value.discordJoinUrl === "string") ||
    !["unavailable", "ready", "joining", "joined", "role_pending", "retry"].includes(value.discordJoinState) ||
    !(value.firstDownloadAtMs === null || Number.isSafeInteger(value.firstDownloadAtMs)) ||
    !(value.reissueAvailableAtMs === null ||
      Number.isSafeInteger(value.reissueAvailableAtMs))
  ) {
    return null;
  }

  return {
    authenticated: true,
    displayName: value.displayName,
    csrf: value.csrf,
    downloadAction: value.downloadAction,
    artifact: {
      filename: value.artifact.filename,
      sha256: value.artifact.sha256,
    },
    solvedAtMs: value.solvedAtMs,
    score: value.score,
    inviteEligible: value.inviteEligible,
    discordInviteUrl: value.discordInviteUrl,
    discordJoinReady: value.discordJoinReady,
    discordJoinUrl: value.discordJoinUrl,
    discordJoinState: value.discordJoinState,
    firstDownloadAtMs: value.firstDownloadAtMs,
    reissueAvailableAtMs: value.reissueAvailableAtMs,
  };
}

const root = document.querySelector("[data-ready-root]");

if (root !== null) {
  const apiOrigin = root.dataset.apiOrigin;
  if (apiOrigin === undefined) throw new Error("Ready API is not configured");

  const status = requireElement(root, "[data-ready-status]");
  const login = requireElement(root, "[data-ready-login]");
  const loginLink = requireElement(root, "[data-ready-login-link]");
  const assignmentSections = [...root.querySelectorAll("[data-ready-assignment]")];
  if (assignmentSections.length !== 2) throw new Error("Ready page is incomplete");
  const displayName = requireElement(root, "[data-ready-display-name]");
  const download = requireElement(root, "[data-ready-download]");
  const sha = requireElement(root, "[data-ready-sha]");
  const form = requireElement(root, "[data-ready-form]");
  const flag = requireElement(root, "[data-ready-flag]");
  const joinSection = requireElement(root, "[data-ready-discord-join-section]");
  const joinStatus = requireElement(root, "[data-ready-discord-join-status]");
  const join = requireElement(root, "[data-ready-discord-join]");
  const submit = requireElement(root, "[data-ready-submit]");
  const result = requireElement(root, "[data-ready-result]");
  const logout = requireElement(root, "[data-ready-logout]");
  const reissuePanel = requireElement(root, "[data-ready-reissue-panel]");
  const reissueStatus = requireElement(root, "[data-ready-reissue-status]");
  const reissue = requireElement(root, "[data-ready-reissue]");
  let session = null;
  let reissueTimer = null;

  loginLink.href = `${apiOrigin}/auth/discord/start`;
  download.href = `${apiOrigin}/v1/download`;

  function showLoggedOut(message = "Discord assigns your file.") {
    if (reissueTimer !== null) window.clearInterval(reissueTimer);
    reissueTimer = null;
    session = null;
    status.textContent = message;
    login.hidden = false;
    for (const section of assignmentSections) section.hidden = true;
    reissuePanel.hidden = true;
    joinSection.hidden = true;
    join.hidden = true;
  }

  function updateReissueCountdown() {
    if (session === null || session.reissueAvailableAtMs === null) return;
    const remainingMs = Math.max(0, session.reissueAvailableAtMs - Date.now());
    if (remainingMs === 0) {
      reissueStatus.textContent = "A new archive is available.";
      reissue.disabled = false;
      if (reissueTimer !== null) window.clearInterval(reissueTimer);
      reissueTimer = null;
      return;
    }
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    reissueStatus.textContent = `Available in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.`;
    reissue.disabled = true;
  }

  function startReissueCountdown() {
    if (reissueTimer !== null) window.clearInterval(reissueTimer);
    updateReissueCountdown();
    if (reissue.disabled) reissueTimer = window.setInterval(updateReissueCountdown, 1000);
  }

  function safeJoinUrl(value) {
    if (!value.discordJoinReady || value.discordJoinUrl === null) return null;
    const url = new URL(value.discordJoinUrl);
    return url.protocol === "https:" && url.origin === new URL(apiOrigin).origin &&
      url.pathname === "/auth/discord/join/start" ? url.toString() : null;
  }

  function safeInviteUrl(value) {
    if (value.inviteEligible !== true || typeof value.discordInviteUrl !== "string") return null;
    try {
      const url = new URL(value.discordInviteUrl);
      const allowed = url.protocol === "https:" &&
        (url.hostname === "discord.gg" || url.hostname === "discord.com" || url.hostname === "www.discord.com");
      return allowed ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function renderOutcome(value) {
    if (value.solvedAtMs === null || value.score === null || value.elapsedMs === null) return;
    const totalSeconds = Math.floor(value.elapsedMs / 1000);
    const stamp = `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
    result.textContent = `Accepted in ${stamp}. Score ${value.score} of 1000.`;
    const inviteUrl = safeInviteUrl(value);
    if (inviteUrl !== null) {
      const link = document.createElement("a");
      link.href = inviteUrl;
      link.rel = "noopener";
      link.textContent = "Use your public server invite";
      result.append(" ", link);
    } else if (value.inviteEligible === true) {
      result.append(" Your public server invite is on the way.");
    }
  }

  function showDiscordJoin(value) {
    join.hidden = true;
    const joinUrl = safeJoinUrl(value);
    const messages = {
      unavailable: "Discord join is unavailable.",
      ready: "Your solve is accepted. Join the Discord server to receive your role.",
      joining: "Discord join is in progress.",
      joined: "Discord joined. Your Member role is ready.",
      role_pending: "Discord joined. Your roles are still being added.",
      retry: "Discord join did not finish. Try again.",
    };
    joinStatus.textContent = messages[value.discordJoinState];
    joinSection.hidden = false;
    if (joinUrl !== null && (value.discordJoinState === "ready" || value.discordJoinState === "retry")) {
      join.href = joinUrl;
      join.textContent = value.discordJoinState === "retry" ? "Try Discord again" : "Join Discord";
      join.hidden = false;
    }
  }

  function showAssignment(value, clearProof = false) {
    session = value;
    if (clearProof) {
      flag.value = "";
    }
    form.hidden = false;
    flag.disabled = false;
    submit.hidden = false;
    submit.disabled = false;
    result.textContent = "";
    status.textContent = "Assignment recovered.";
    login.hidden = true;
    for (const section of assignmentSections) section.hidden = false;
    displayName.textContent = `Signed in as ${value.displayName}`;
    download.textContent = `Download ${value.artifact.filename}`;
    const downloadUrl = new URL("/v1/download", apiOrigin);
    downloadUrl.searchParams.set("action", value.downloadAction);
    download.href = downloadUrl.toString();
    sha.textContent = value.artifact.sha256;
    renderOutcome(value);
    reissuePanel.hidden = value.solvedAtMs !== null || value.firstDownloadAtMs === null;
    if (!reissuePanel.hidden) startReissueCountdown();
    else {
      if (reissueTimer !== null) window.clearInterval(reissueTimer);
      reissueTimer = null;
      reissueStatus.textContent = "";
      reissue.disabled = true;
    }
    if (value.solvedAtMs !== null) {
      form.hidden = true;
      result.textContent = "received.";
      showDiscordJoin(value);
    } else {
      joinSection.hidden = true;
    }
  }

  async function loadSession(keepCurrentOnError = false, clearProof = false) {
    try {
      const response = await fetch(`${apiOrigin}/v1/session`, {
        method: "GET",
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("session unavailable");
      const value = await response.json();
      if (isObject(value) && value.authenticated === false) {
        showLoggedOut();
        return;
      }
      const parsed = parseSession(value);
      if (parsed === null) throw new Error("invalid session");
      showAssignment(parsed, clearProof);
    } catch {
      if (!keepCurrentOnError) {
        showLoggedOut("Challenge service unavailable. Try again.");
      }
    }
  }

  download.addEventListener("click", () => {
    for (const delayMs of [750, 2000, 5000]) {
      window.setTimeout(() => loadSession(true), delayMs);
    }
  });

  reissue.addEventListener("click", async () => {
    if (session === null || reissue.disabled) return;
    if (reissueTimer !== null) window.clearInterval(reissueTimer);
    reissueTimer = null;
    reissue.disabled = true;
    reissueStatus.textContent = "Requesting a new archive...";
    try {
      const response = await fetch(`${apiOrigin}/v1/reissue`, {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json", "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ csrf: session.csrf }),
      });
      const value = await response.json();
      const responseStatus = isObject(value) ? value.status : undefined;
      if (response.ok && responseStatus === "issued") {
        await loadSession(false, true);
        return;
      }
      if (response.status === 429 && responseStatus === "cooldown") {
        reissueStatus.textContent = "The one-hour cooldown is still running.";
        startReissueCountdown();
      } else if (response.status === 409 && responseStatus === "download_required") {
        reissueStatus.textContent = "Download this archive before requesting another one.";
      } else if (response.status === 409 && responseStatus === "solved") {
        reissuePanel.hidden = true;
        await loadSession(true);
      } else if (response.status === 403) {
        reissueStatus.textContent = "Session expired. Sign in again.";
      } else {
        reissueStatus.textContent = "Archive service unavailable. Try again.";
      }
    } catch {
      reissueStatus.textContent = "Archive service unavailable. Try again.";
      if (session?.reissueAvailableAtMs !== null && Date.now() >= session.reissueAvailableAtMs) reissue.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (session === null || !form.reportValidity()) return;

    submit.disabled = true;
    result.textContent = "Checking...";
    try {
      const response = await fetch(`${apiOrigin}/v1/submit`, {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json", "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ csrf: session.csrf, flag: flag.value }),
      });
      const value = await response.json();
      const responseStatus = isObject(value) ? value.status : undefined;
      if (response.ok && responseStatus === "received") {
        result.textContent = "received.";
        flag.disabled = true;
        submit.hidden = true;
        await loadSession(true);
        return;
      }
      if (response.status === 503 && responseStatus === "notification_pending") result.textContent = "Flag accepted, but the Discord receipt is still pending. Try submit again.";
      else if (response.status === 409 && responseStatus === "download_required") result.textContent = "Download your archive before submitting.";
      else if (response.status === 429) result.textContent = "Slow down. Try again in a minute.";
      else if (response.status === 400 && responseStatus === "wrong_prefix") result.textContent = "That prefix is wrong. Re-read the flag format and try again.";
      else if (response.status === 400 && responseStatus === "invalid") result.textContent = "Nope.";
      else if (response.status === 403) result.textContent = "Session expired. Sign in again.";
      else result.textContent = "Submission service unavailable. Try again.";
    } catch {
      result.textContent = "Submission service unavailable. Try again.";
    } finally {
      if (!submit.hidden) submit.disabled = false;
    }
  });

  logout.addEventListener("click", async () => {
    if (session === null) return;
    logout.disabled = true;
    try {
      await fetch(`${apiOrigin}/v1/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ csrf: session.csrf }),
      });
    } finally {
      window.location.reload();
    }
  });

  loadSession();
}
