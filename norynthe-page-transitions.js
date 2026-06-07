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

  const linkMarkup = (item) => (
    `<a${item.primary ? " class='primary'" : ''} href='${item.href}'>${item.label}</a>`
  );

  const ensureHomepageCardStyles = () => {
    if (!isHomepage() || document.querySelector('style[data-norynthe-home-cards]')) return;

    const styles = document.createElement('style');
    styles.dataset.noryntheHomeCards = 'equalized';
    styles.textContent = `
      .company-surface-grid {
        align-items: stretch;
      }

      .company-surface-grid .company-card {
        min-height: 230px;
        height: 100%;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        align-content: stretch;
      }

      .company-surface-grid .company-card p {
        align-self: start;
      }

      .company-surface-grid .company-card-meta {
        align-self: end;
      }

      @media (max-width: 720px) {
        .company-surface-grid .company-card {
          min-height: 0;
        }
      }
    `;
    document.head.appendChild(styles);
  };

  const refineHomepageExperience = () => {
    if (!isHomepage()) return;

    ensureHomepageCardStyles();

    const navLinks = [
      { label: 'AI Evaluation', href: 'independent-ai-model-evaluation.html', primary: true },
      { label: 'Score Board', href: 'https://reports.norynthe.com/' },
      { label: 'Market Position', href: 'market-position.html' },
      { label: 'Contact', href: '#contact' }
    ];

    const actionLinks = [
      { label: 'AI Evaluation', href: 'independent-ai-model-evaluation.html', primary: true },
      { label: 'Score Board', href: 'https://reports.norynthe.com/' }
    ];

    const nav = document.querySelector('.topline-nav');
    if (nav) nav.innerHTML = navLinks.map(linkMarkup).join('');

    const heroActions = document.querySelector('.hero-actions');
    if (heroActions) heroActions.innerHTML = actionLinks.map(linkMarkup).join('');

    const surfaceTitle = document.querySelector('.company-surface h2');
    if (surfaceTitle) surfaceTitle.textContent = 'A focused path into AI credibility.';

    const surfaceLead = document.querySelector('.company-surface-secondary');
    if (surfaceLead) {
      surfaceLead.textContent = 'Norynthe turns independent AI evaluation into a readable trust signal: the evaluation method, the public score board, and the market position behind the standard.';
    }

    const cardGrid = document.querySelector('.company-surface-grid');
    if (!cardGrid) return;

    cardGrid.innerHTML = `
      <a class='company-card' href='independent-ai-model-evaluation.html'>
        <span class='card-eyebrow'>Start here</span>
        <h3>Independent AI model evaluation.</h3>
        <p>How Norynthe evaluates model behavior, evidence handling, uncertainty, and comparison context outside the model owner dashboard.</p>
        <span class='company-card-meta'>Evaluation layer</span>
      </a>

      <a class='company-card' href='https://reports.norynthe.com/'>
        <span class='card-eyebrow'>Public signal</span>
        <h3>Norynthe.Score board.</h3>
        <p>A public preview of the score record concept: model credibility, benchmark context, trust band, and evidence path.</p>
        <span class='company-card-meta'>Norynthe.Score</span>
      </a>

      <a class='company-card' href='market-position.html'>
        <span class='card-eyebrow capital'>Positioning</span>
        <h3>The missing trust layer.</h3>
        <p>Why Norynthe is not another internal dashboard, and how external evaluation becomes a market-facing trust standard.</p>
        <span class='company-card-meta'>Market position</span>
      </a>
    `;
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
    refineHomepageExperience();
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