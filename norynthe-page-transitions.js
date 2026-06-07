(() => {
  const CLARITY_PROJECT_ID = 'x3hujsuxyc';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const normalizeHomepageUrl = () => {
    if (window.location.pathname !== '/index.html') return;

    const cleanUrl = window.location.origin + '/' + window.location.search + window.location.hash;
    window.history.replaceState(null, document.title, cleanUrl);
  };

  const isHomepage = () => window.location.pathname === '/' || window.location.pathname === '/index.html';

  const ensureFreshVisibilityStyles = () => {
    const visibilityStyles = document.querySelector('link[href*="norynthe-visibility-pages.css"]');
    if (!visibilityStyles || document.querySelector('link[data-norynthe-visibility-fresh]')) return;

    const freshStyles = document.createElement('link');
    freshStyles.rel = 'stylesheet';
    freshStyles.href = new URL('norynthe-visibility-pages.css?v=20260607-logo-fix', window.location.href).href;
    freshStyles.dataset.noryntheVisibilityFresh = 'true';
    visibilityStyles.insertAdjacentElement('afterend', freshStyles);
  };

  const createLink = (item) => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    if (item.primary) link.className = 'primary';
    return link;
  };

  const ensureLink = (container, item, beforeNode) => {
    if (!container) return null;

    const existing = container.querySelector(`a[href='${item.href}']`);
    if (existing) {
      if (item.primary) existing.classList.add('primary');
      return existing;
    }

    const link = createLink(item);
    container.insertBefore(link, beforeNode || null);
    return link;
  };

  const injectHomepageVisibilityLinks = () => {
    if (!isHomepage()) return;

    const links = [
      { label: 'AI Evaluation', href: 'independent-ai-model-evaluation.html', primary: true },
      { label: 'Trust Scoring', href: 'ai-trust-scoring.html' },
      { label: 'Score Board', href: 'https://reports.norynthe.com/' }
    ];

    const nav = document.querySelector('.topline-nav');
    const firstNavLink = nav ? nav.firstElementChild : null;
    links.forEach((item) => ensureLink(nav, item, firstNavLink));

    const heroActions = document.querySelector('.hero-actions');
    if (heroActions) {
      heroActions.querySelectorAll('a.primary').forEach((link) => link.classList.remove('primary'));
      const firstAction = heroActions.firstElementChild;
      links.forEach((item) => ensureLink(heroActions, item, firstAction));
    }

    const cardGrid = document.querySelector('.company-surface-grid');
    if (!cardGrid || cardGrid.querySelector(`a[href='independent-ai-model-evaluation.html']`)) return;

    cardGrid.insertAdjacentHTML('beforeend', `
      <a class='company-card' href='independent-ai-model-evaluation.html'>
        <span class='card-eyebrow'>Evaluation</span>
        <h3>Independent AI model evaluation.</h3>
        <p>External assessment of model behavior, evidence handling, uncertainty, and comparison context outside the model owner dashboard.</p>
        <span class='company-card-meta'>Evaluation layer</span>
      </a>
      <a class='company-card' href='ai-model-evaluation-benchmarks.html'>
        <span class='card-eyebrow'>Benchmark Bank</span>
        <h3>AI model evaluation benchmarks.</h3>
        <p>Governed evaluation systems for repeatable model comparison, evidence review, trust scoring, and readiness decisions.</p>
        <span class='company-card-meta'>Benchmark method</span>
      </a>
      <a class='company-card' href='ai-trust-scoring.html'>
        <span class='card-eyebrow'>Trust Signal</span>
        <h3>AI trust scoring.</h3>
        <p>A public trust signal that turns evaluation records into a score, trust band, and deeper review path.</p>
        <span class='company-card-meta'>Norynthe.Score</span>
      </a>
      <a class='company-card' href='ai-governance-readiness.html'>
        <span class='card-eyebrow'>Governance</span>
        <h3>AI governance readiness.</h3>
        <p>Evaluation records that help teams compare model credibility, preserve evidence, and support review decisions.</p>
        <span class='company-card-meta'>Governance context</span>
      </a>
    `);
  };

  const loadAnalytics = () => {
    if (document.querySelector(`script[src$='norynthe-analytics.js']`)) return;

    const analytics = document.createElement('script');
    analytics.src = new URL('norynthe-analytics.js', window.location.href).href;
    analytics.async = true;
    document.head.appendChild(analytics);
  };

  const loadClarity = () => {
    if (window.clarity || document.querySelector(`script[data-clarity-project='${CLARITY_PROJECT_ID}']`)) return;

    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    const clarity = document.createElement('script');
    clarity.async = true;
    clarity.src = 'https://www.clarity.ms/tag/' + CLARITY_PROJECT_ID;
    clarity.dataset.clarityProject = CLARITY_PROJECT_ID;
    document.head.appendChild(clarity);
  };

  const showPage = () => {
    window.requestAnimationFrame(() => {
      root.classList.remove('nt-transition-exiting');
      root.classList.add('nt-transition-ready');
    });
  };

  const onReady = () => {
    ensureFreshVisibilityStyles();
    injectHomepageVisibilityLinks();
    showPage();
  };

  normalizeHomepageUrl();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  loadAnalytics();
  loadClarity();
  window.addEventListener('pageshow', showPage);

  if (reduceMotion) return;

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (link.target && link.target !== '_self') return;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }

    const samePageHash = url.pathname === window.location.pathname && url.search === window.location.search && url.hash;
    if (url.origin !== window.location.origin || samePageHash) return;

    event.preventDefault();
    root.classList.remove('nt-transition-ready');
    root.classList.add('nt-transition-exiting');

    window.setTimeout(() => {
      window.location.href = url.href;
    }, 180);
  });
})();
