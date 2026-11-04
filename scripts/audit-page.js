/* Local-only axe harness, injected by scripts/audit-server.mjs. */
(async () => {
  'use strict';
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const originalTitle = document.title;
  const report = (value) => {
    window.__qaAudit = value;
    const output = document.createElement('pre');
    output.id = 'qa-audit';
    output.tabIndex = 0;
    output.setAttribute('aria-label', 'Local accessibility audit result');
    output.style.whiteSpace = 'pre-wrap';
    output.style.overflowWrap = 'anywhere';
    output.style.maxWidth = '100%';
    output.textContent = JSON.stringify(value, null, 2);
    document.body.append(output);
    document.documentElement.dataset.qaAudit = value.status;
    document.title = `QA ${value.status} | ${originalTitle}`;
  };
  try {
    if (document.readyState !== 'complete') {
      await Promise.race([
        new Promise((resolve) => window.addEventListener('load', resolve, { once: true })),
        delay(6000),
      ]);
    }
    await Promise.race([document.fonts.ready, delay(3000)]);
    const eagerImages = [...document.images].filter((image) => image.loading !== 'lazy');
    await Promise.race([
      Promise.allSettled(eagerImages.map((image) => image.decode())),
      delay(3000),
    ]);
    const motionToggle = document.querySelector('button[data-motion-toggle]');
    let motion = 'No decorative motion control on this route';
    if (motionToggle && !motionToggle.hidden && motionToggle.getAttribute('aria-pressed') === 'false') {
      motionToggle.click();
      motion = 'Paused using the existing decorative motion button';
    } else if (motionToggle) {
      motion = 'Decorative motion was already paused';
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!window.axe) throw new Error('Self-hosted axe-core did not load');
    const viewport = { width: innerWidth, height: innerHeight, devicePixelRatio };
    const page = {
      route: location.pathname,
      title: originalTitle,
      viewport,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      motion,
    };
    const results = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
    report({
      status: 'complete',
      engine: `axe-core ${axe.version}`,
      ...page,
      violationCount: results.violations.length,
      criticalOrSerious: results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact)).length,
      incompleteCount: results.incomplete.length,
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodeCount: violation.nodes.length,
        nodes: violation.nodes.slice(0, 12).map((node) => ({
          target: node.target,
          summary: (node.failureSummary ?? '').slice(0, 420),
        })),
      })),
      incomplete: results.incomplete.map((item) => ({ id: item.id, impact: item.impact, nodeCount: item.nodes.length, nodes: item.nodes.slice(0, 5).map(node => ({ target: node.target, summary: node.failureSummary })) })),
    });
  } catch (error) {
    report({ status: 'error', route: location.pathname, title: originalTitle, error: String(error.message ?? error) });
  }
})();
