/**
 * Research Wheel - Chrome Content Script
 * 8-octant single-ring radial menu with Proper Noun Engine integration.
 */

(function () {
  'use strict';

  // Prevent double-rendering by cleaning up any previous instances on reload
  const existingHost = document.getElementById('research-wheel-extension-root');
  if (existingHost) {
    existingHost.remove();
  }

  const HOLD_THRESHOLD_MS = 150;
  const NEUTRAL_RADIUS_PX = 35;

  let holdTimer = null;
  let isWheelActive = false;
  let originX = 0;
  let originY = 0;
  let currentSector = 'NEUTRAL';
  let preventNextAuxClick = false;

  let originalBodyOverflow = '';
  let originalDocOverflow = '';

  const hostDiv = document.createElement('div');
  hostDiv.id = 'research-wheel-extension-root';
  document.documentElement.appendChild(hostDiv);

  const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadowRoot.appendChild(styleLink);

  const wheelContainer = document.createElement('div');
  wheelContainer.className = 'wheel-overlay hidden';
  wheelContainer.innerHTML = `
    <div class="wheel-wrapper">
      <svg class="wheel-svg" viewBox="-200 -200 400 400">
        <!-- 8 EQUAL SINGLE-RING RADIAL OCTANTS (Radius 35px -> 160px) -->
        <path class="quadrant-slice" data-sector="N"  d="M -61.23 -147.82 A 160 160 0 0 1 61.23 -147.82 L 13.39 -32.34 A 35 35 0 0 0 -13.39 -32.34 Z" />
        <path class="quadrant-slice" data-sector="NE" d="M 61.23 -147.82 A 160 160 0 0 1 147.82 -61.23 L 32.34 -13.39 A 35 35 0 0 0 13.39 -32.34 Z" />
        <path class="quadrant-slice" data-sector="E"  d="M 147.82 -61.23 A 160 160 0 0 1 147.82 61.23 L 32.34 13.39 A 35 35 0 0 0 32.34 -13.39 Z" />
        <path class="quadrant-slice" data-sector="SE" d="M 147.82 61.23 A 160 160 0 0 1 61.23 147.82 L 13.39 32.34 A 35 35 0 0 0 32.34 13.39 Z" />
        <path class="quadrant-slice" data-sector="S"  d="M 61.23 147.82 A 160 160 0 0 1 -61.23 147.82 L -13.39 32.34 A 35 35 0 0 0 13.39 32.34 Z" />
        <path class="quadrant-slice" data-sector="SW" d="M -61.23 147.82 A 160 160 0 0 1 -147.82 61.23 L -32.34 13.39 A 35 35 0 0 0 -13.39 32.34 Z" />
        <path class="quadrant-slice" data-sector="W"  d="M -147.82 61.23 A 160 160 0 0 1 -147.82 -61.23 L -32.34 -13.39 A 35 35 0 0 0 -32.34 13.39 Z" />
        <path class="quadrant-slice" data-sector="NW" d="M -147.82 -61.23 A 160 160 0 0 1 -61.23 -147.82 L -13.39 -32.34 A 35 35 0 0 0 -32.34 -13.39 Z" />
      </svg>
      
      <div class="wheel-center">
        <span class="cancel-icon">✕</span>
      </div>

      <!-- 8 BALANCED RESEARCH OCTANT ITEMS -->
      <div class="wheel-item item-n" data-sector="N">
        <span>🎓 Scholar Search</span>
      </div>
      <div class="wheel-item item-ne" data-sector="NE">
        <span>🧬 PubMed</span>
      </div>
      <div class="wheel-item item-e" data-sector="E">
        <span>📝 Append Note</span>
      </div>
      <div class="wheel-item item-se" data-sector="SE">
        <span>Citation</span>
      </div>
      <div class="wheel-item item-s" data-sector="S">
        <span>📂 Workspace</span>
      </div>
      <div class="wheel-item item-sw" data-sector="SW">
        <span>🌐 Translate</span>
      </div>
      <div class="wheel-item item-w" data-sector="W">
        <span>🔗 Title + URL</span>
      </div>
      <div class="wheel-item item-nw" data-sector="NW">
        <span>📋 Quote + Source</span>
      </div>
    </div>
  `;

  const wheelWrapper = wheelContainer.querySelector('.wheel-wrapper');

  const toast = document.createElement('div');
  toast.className = 'action-wheel-toast hidden';

  shadowRoot.appendChild(wheelContainer);
  shadowRoot.appendChild(toast);

  const slices = shadowRoot.querySelectorAll('.quadrant-slice');
  const items = shadowRoot.querySelectorAll('.wheel-item');
  const centerCircle = shadowRoot.querySelector('.wheel-center');

  // --- PROPER NOUN ENGINE ---
  const ProperNounEngine = {
    lexicon: new Set([
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 
      'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 
      'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 
      'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 
      'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 
      'west virginia', 'wisconsin', 'wyoming', 'puerto rico', 'guam', 'silver state',

      'america', 'american', 'us', 'usa', 'united states', 'uk', 'united kingdom', 'britain', 'british', 'canada', 'canadian',
      'mexico', 'mexican', 'china', 'chinese', 'russia', 'russian', 'japan', 'japanese', 'germany', 'german', 'france', 'french',
      'italy', 'italian', 'spain', 'spanish', 'iran', 'iranian', 'iraq', 'iraqi', 'israel', 'israeli', 'palestine', 'palestinian',
      'morocco', 'moroccan', 'ceuta', 'ukraine', 'ukrainian', 'syria', 'syrian', 'turkey', 'turkish', 'india', 'indian',
      'midwest', 'middle east', 'strait of hormuz', 'hormuz', 'latin america', 'europe', 'european', 'asia', 'asian', 'africa', 'african',

      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',

      'trump', 'biden', 'harris', 'obama', 'bush', 'clinton', 'reagan', 'mcconnell', 'pelosi', 'schumer', 'vance', 'walz',
      'gop', 'republican', 'republicans', 'democrat', 'democrats', 'democratic', 'libertarian', 'conservative', 'liberal',
      'white house', 'congress', 'senate', 'house', 'supreme court', 'pentagon', 'kremlin', 'capitol', 'parliament',
      'un', 'united nations', 'nato', 'nasa', 'fbi', 'cia', 'epa', 'fda', 'cdc', 'who', 'gdpr',

      'reuters', 'associated press', 'ap news', 'nbc', 'cnn', 'bbc', 'fox', 'cbs', 'abc', 'bloomberg', 'forbes',
      'google', 'apple', 'microsoft', 'amazon', 'meta', 'facebook', 'instagram', 'twitter', 'tiktok', 'youtube',
      'openai', 'chatgpt', 'claude', 'gemini', 'anthropic', 'nvidia', 'tesla', 'intel', 'amd', 'github', 'reddit',

      'english', 'spanish', 'french', 'german', 'chinese', 'mandarin', 'japanese', 'russian', 'arabic', 'hindi',
      
      // Target case vocabulary and expansion rules
      'comey', 'cesar', 'gastelum', 'abdul', 'el-sayed', 'elsayed', 'michigan'
    ]),

    isProperNoun(word) {
      if (!word) return false;
      // Strip possessive apostrophes (supporting straight, curly, and standard backticks)
      let clean = word.replace(/['’‘`´]s$/i, '').replace(/s['’‘`´]$/i, '');
      clean = clean.replace(/[^a-zA-Z0-9]/g, '');
      if (!clean) return false;

      if (clean.length >= 2 && clean === clean.toUpperCase() && !/^\d+$/.test(clean)) {
        return true;
      }

      if (/[a-z][A-Z]/.test(clean) || /[A-Z].*[A-Z]/.test(clean)) {
        return true;
      }

      if (this.lexicon.has(clean.toLowerCase())) {
        return true;
      }

      return false;
    },

    toSentenceCase(str) {
      if (!str) return 'Source';
      const s = str.trim();
      if (s.length === 0) return 'Source';

      const words = s.split(/\s+/);
      const result = [];

      let capCount = 0;
      let eligibleWordsCount = 0;
      for (let i = 1; i < words.length; i++) {
        const w = words[i].replace(/[^a-zA-Z]/g, '');
        if (w.length > 0) {
          eligibleWordsCount++;
          if (w.charAt(0) === w.charAt(0).toUpperCase() && /[a-zA-Z]/.test(w.charAt(0))) {
            capCount++;
          }
        }
      }
      const isAlreadySentenceCase = eligibleWordsCount > 0 && (capCount / eligibleWordsCount) <= 0.40;

      for (let i = 0; i < words.length; i++) {
        const rawWord = words[i];

        if (i === 0) {
          result.push(rawWord.charAt(0).toUpperCase() + rawWord.slice(1));
          continue;
        }

        const prevWord = words[i - 1];
        const isAfterBoundary = /[:;?—!]$/.test(prevWord);
        if (isAfterBoundary) {
          result.push(rawWord.charAt(0).toUpperCase() + rawWord.slice(1));
          continue;
        }

        const cleanWord = rawWord.replace(/[^a-zA-Z0-9]/g, '');
        const isCapitalizedInSource = cleanWord.length > 0 && cleanWord.charAt(0) === cleanWord.charAt(0).toUpperCase() && /[a-zA-Z]/.test(cleanWord.charAt(0));

        if (this.isProperNoun(rawWord) || (isAlreadySentenceCase && isCapitalizedInSource)) {
          result.push(rawWord);
        } else {
          result.push(rawWord.toLowerCase());
        }
      }

      return result.join(' ');
    }
  };

  function toTitleCase(str) {
    if (!str) return '';
    const smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v\.|via)$/i;
    return String(str).replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, (match, index, title) => {
      if (index > 0 && index + match.length !== title.length && match.search(smallWords) !== -1) {
        return match.toLowerCase();
      }
      return match.charAt(0).toUpperCase() + match.slice(1);
    });
  }

  function getCleanDomain(hostname) {
    if (!hostname) return 'domain';
    let host = hostname.toLowerCase().replace('www.', '');
    const parts = host.split('.');
    if (parts.length >= 3) {
      const sub = parts[0];
      const genericSubs = ['news', 'press', 'blog', 'm', 'en', 'es', 'fr', 'edition', 'amp', 'world', 'releases', 'org', 'com', 'gov', 'net', 'edu'];
      if (genericSubs.includes(sub)) {
        return parts[1];
      }
    }
    return parts[0];
  }

  function cleanAuthorByline(authorStr) {
    if (!authorStr) return '';
    let str = authorStr.trim();
    str = str.replace(/\b(?:and\s+)?reuters\b/gi, '');
    str = str.replace(/\b(?:and\s+)?associated\s+press\b/gi, '');
    str = str.replace(/\b(?:and\s+)?ap\b/gi, '');
    str = str.replace(/[\/\s,;&]+$/, '').replace(/^[\/\s,;&]+/, '').trim();
    return str;
  }

  function isValidAuthorName(authorStr) {
    if (!authorStr) return false;
    const cleaned = authorStr.toLowerCase().trim();
    const bannedTerms = ['news', 'staff', 'admin', 'reporter', 'editor', 'com', 'http'];
    if (bannedTerms.some(term => cleaned.includes(term))) return false;
    if (cleaned.includes('.com') || cleaned.includes('-news')) return false;
    return true;
  }

  function isNewsWebsite(domain) {
    const newsDomains = ['nytimes', 'washingtonpost', 'cnn', 'reuters', 'apnews', 'nbcnews', 'foxnews', 'cbsnews', 'abcnews', 'bloomberg', 'forbes', 'theguardian', 'guardian', 'bbc', 'thehill'];
    return newsDomains.includes(domain.toLowerCase());
  }

  function getGroupAuthor(domain, url) {
    const d = domain.toLowerCase();
    const groupAuthorMap = {
      'un': 'United Nations',
      'whitehouse': 'The White House',
      'thehill': 'The Hill',
      'apnews': 'Associated Press',
      'reuters': 'Reuters',
      'nytimes': 'The New York Times',
      'washingtonpost': 'The Washington Post',
      'guardian': 'The Guardian',
      'theguardian': 'The Guardian',
      'bbc': 'BBC',
      'cnn': 'CNN',
      'nbcnews': 'NBC News',
      'foxnews': 'Fox News',
      'cbsnews': 'CBS News',
      'abcnews': 'ABC News',
      'wsj': 'The Wall Journal',
      'bloomberg': 'Bloomberg',
      'forbes': 'Forbes',
      'npr': 'NPR',
      'usnews': 'U.S. News & World Report'
    };
    return groupAuthorMap[d] || null;
  }

  function getCleanTitle() {
    const rawTitle = document.title || 'Source';
    const titleStr = String(rawTitle);
    // Expanded brand suffix regex replacement
    let clean = titleStr.replace(/\s*[:|–-]\s*(NPR|The White House|NBC News|The Hill|AP News|Reuters|Associated Press|BBC|CNN|The New York Times|The Washington Post|The Guardian).*$/i, '').trim();
    clean = clean.split(/\s+[\-\|–]\s+/)[0].trim();
    return clean || titleStr;
  }

  function getSiteName(domain, url) {
    if (!domain) return 'Web';
    let d = domain.toLowerCase();
    if (d.includes('.')) {
      d = getCleanDomain(d);
    }
    
    const siteMap = {
      'un': 'UN News',
      'apnews': 'AP News',
      'reuters': 'Reuters',
      'nbcnews': 'NBC News',
      'thehill': 'The Hill',
      'whitehouse': 'The White House',
      'theguardian': 'The Guardian',
      'guardian': 'The Guardian',
      'bbc': 'BBC',
      'nytimes': 'The New York Times',
      'washingtonpost': 'The Washington Post',
      'cnn': 'CNN',
      'foxnews': 'Fox News',
      'cbsnews': 'CBS News',
      'abcnews': 'ABC News',
      'wsj': 'The Wall Journal',
      'bloomberg': 'Bloomberg',
      'forbes': 'Forbes',
      'wired': 'Wired',
      'techcrunch': 'TechCrunch',
      'theverge': 'The Verge',
      'github': 'GitHub',
      'youtube': 'YouTube',
      'reddit': 'Reddit',
      'pubmed': 'PubMed',
      'ncbi': 'PubMed',
      'x': 'X',
      'twitter': 'X',
      'wikipedia': 'Wikipedia',
      'medium': 'Medium',
      'substack': 'Substack',
      'arxiv': 'arXiv',
      'google': 'Google',
      'googlescholar': 'Google Scholar',
      'npr': 'NPR',
      'usnews': 'U.S. News & World Report'
    };

    if (siteMap[d]) return siteMap[d];

    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes('thehill.com')) return 'The Hill';
      if (host.includes('whitehouse.gov')) return 'The White House';
      if (host.includes('apnews.com')) return 'AP News';
      if (host.includes('reuters.com')) return 'Reuters';
      if (host.includes('nbcnews.com')) return 'NBC News';
      if (host.includes('theguardian.com')) return 'The Guardian';
      if (host.includes('bbc.com') || host.includes('bbc.co.uk')) return 'BBC';
      if (host.includes('nytimes.com')) return 'The New York Times';
      if (host.includes('washingtonpost.com')) return 'The Washington Post';
      if (host.includes('cnn.com')) return 'CNN';
      if (host.includes('wsj.com')) return 'The Wall Journal';
      if (host.includes('npr.org')) return 'NPR';
      if (host.includes('usnews.com')) return 'U.S. News & World Report';
    } catch(e) {}

    return d.charAt(0).toUpperCase() + d.slice(1);
  }

  function extractRealAuthorFromPage() {
    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        const json = JSON.parse(script.textContent);
        const items = Array.isArray(json) ? json : (json['@graph'] || [json]);
        for (const item of items) {
          if (item.author) {
            let authorData = item.author;
            if (Array.isArray(authorData)) {
              const names = authorData.map(a => (typeof a === 'string' ? a : a.name)).filter(Boolean);
              if (names.length > 0) return names.join(' and ').replace(/^by\s+/i, '').trim();
            } else if (typeof authorData === 'string') {
              return authorData.replace(/^by\s+/i, '').trim();
            } else if (authorData.name) {
              return authorData.name.replace(/^by\s+/i, '').trim();
            }
          }
        }
      }
    } catch (e) {}

    const metaSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="parsely-author"]',
      'meta[name="sailthru.author"]',
      'meta[name="byl"]',
      'meta[name="byline"]',
      'meta[property="og:article:author"]',
      'meta[name="dc.creator"]'
    ];

    for (const selector of metaSelectors) {
      const el = document.querySelector(selector);
      if (el && el.content && el.content.trim().length > 1) {
        let name = el.content.trim().replace(/^by\s+/i, '').trim();
        if (name && name.length < 120) return name;
      }
    }

    const authorLinks = Array.from(document.querySelectorAll('a[href*="/authors/"], a[href*="/author/"], [data-testid*="Author" i], [aria-label*="author" i]'))
      .map(a => a.innerText ? a.innerText.trim() : '')
      .filter(txt => txt.length > 2 && txt.length < 60 && !txt.toLowerCase().includes('http'));

    if (authorLinks.length > 0) {
      const uniqueAuthors = [...new Set(authorLinks)];
      return uniqueAuthors.join(' and ').replace(/^by\s+/i, '').trim();
    }

    const domSelectors = [
      '[rel="author"]',
      '.byline',
      '.author-name',
      '.article-author',
      '[class*="byline" i]',
      '[class*="author-name" i]',
      '[id*="byline" i]'
    ];

    for (const selector of domSelectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText) {
        let text = el.innerText.trim().split('\n')[0].trim();
        if (text) {
          text = text.replace(/^by\s+/i, '').trim();
          if (text.length > 2 && text.length < 80 && !text.toLowerCase().includes('http')) {
            return text;
          }
        }
      }
    }

    const headingsAndParas = Array.from(document.querySelectorAll('p, div, span, header')).slice(0, 20);
    for (const el of headingsAndParas) {
      const txt = el.innerText ? el.innerText.trim() : '';
      const match = txt.match(/^by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)/i);
      if (match && match[1] && match[1].length < 80) {
        return match[1].trim();
      }
    }

    return null;
  }

  function createNotePayload(type, selectionText) {
    const rawTitle = document.title || 'Source';
    let cleanTitle = getCleanTitle();
    const url = window.location.href;
    const domain = getCleanDomain(window.location.hostname);
    
    const today = new Date();
    const year = today.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthDay = `${monthNames[today.getMonth()]} ${today.getDate()}`;
    const defaultFullDate = `${year}, ${monthDay}`;

    let pubDate = defaultFullDate;
    try {
      const dateMeta = document.querySelector('meta[property="article:published_time"], meta[name="date"], meta[name="publication_date"], time[datetime]');
      if (dateMeta) {
        const rawDate = dateMeta.content || dateMeta.getAttribute('datetime') || dateMeta.innerText;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const pYear = d.getFullYear();
            const pMonthDay = `${monthNames[d.getMonth()]} ${d.getDate()}`;
            pubDate = `${pYear}, ${pMonthDay}`;
          }
        }
      }
    } catch(e) {}

    let author = extractRealAuthorFromPage();

    if (author) {
      author = cleanAuthorByline(author);
      if (!isValidAuthorName(author)) {
        author = null;
      } else {
        const parsed = parseAuthorNames(author);
        if (parsed.length > 5) {
          author = null;
        }
      }
    }

    if (!author) {
      if (isNewsWebsite(domain)) {
        author = ''; // Forces title-first fallback for standard news websites
      } else {
        const groupAuth = getGroupAuthor(domain, url);
        if (groupAuth) {
          author = groupAuth;
        } else {
          author = domain;
        }
      }
    }

    // Homepage Root Detector: Identifies if we are on the homepage or localized path index
    let isHomepage = false;
    try {
      const urlObj = new URL(url);
      const pathClean = urlObj.pathname.trim().replace(/\/+$/, '');
      if (pathClean === '' || pathClean === '/' || /^\/(en|es|fr|de|ja|it|us|world)$/i.test(pathClean)) {
        isHomepage = true;
      }
    } catch(e) {}

    const siteName = getSiteName(domain, url);
    if (isHomepage) {
      cleanTitle = siteName;
      const groupAuth = getGroupAuthor(domain, url);
      author = groupAuth || siteName;
    }

    // Secondary sub-domain parsing to target specific profiles
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (domain === 'github' && pathParts.length > 0) {
        author = pathParts[0];
        if (pathParts.length >= 2) cleanTitle = pathParts[1];
        else cleanTitle = `GitHub Profile of ${author}`;
      } else if ((domain === 'x' || domain === 'twitter') && pathParts.length > 0) {
        author = pathParts[0];
      } else if (domain === 'youtube' && pathParts.length > 0 && pathParts[0].startsWith('@')) {
        author = pathParts[0].substring(1);
      }
    } catch(e) {}

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: type,
      text: selectionText || '',
      title: rawTitle,
      cleanTitle: cleanTitle,
      author: author,
      url: url,
      domain: domain,
      year: year,
      fullDate: pubDate,
      accessDate: `${today.getDate()} ${monthNames[today.getMonth()].slice(0, 3)}. ${year}`,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    };
  }

  function parseAuthorNames(authorStr) {
    if (!authorStr || !isValidAuthorName(authorStr)) return [];
    let str = authorStr.trim().replace(/^by\s+/i, '').replace(/\.$/, '');
    if (!str) return [];

    let names = [];
    if (str.includes(' and ') || str.includes(' & ')) {
      let temp = str.replace(/,?\s+(?:and|&)\s+/gi, ' ||| ');
      let parts = temp.split(' ||| ');
      
      parts.forEach(part => {
        if (part.includes(',')) {
          const commaParts = part.split(',').map(s => s.trim()).filter(Boolean);
          if (commaParts.length === 2 && !commaParts[0].includes(' ') && !commaParts[1].includes(' ')) {
            names.push(`${commaParts[1]} ${commaParts[0]}`);
          } else {
            commaParts.forEach(p => names.push(p));
          }
        } else {
          names.push(part.trim());
        }
      });
    } else if (str.includes(';')) {
      names = str.split(';').map(s => s.trim()).filter(Boolean);
    } else if (str.includes(',')) {
      const commaParts = str.split(',').map(s => s.trim()).filter(Boolean);
      if (commaParts.length % 2 === 0 && commaParts.every(p => !p.includes(' '))) {
        for (let i = 0; i < commaParts.length; i += 2) {
          names.push(`${commaParts[i+1]} ${commaParts[i]}`);
        }
      } else {
        names = commaParts;
      }
    } else {
      names = [str];
    }

    const uniqueNames = [...new Set(names)].filter(n => n.length > 1);
    
    if (uniqueNames.length > 5) {
      return [];
    }

    return uniqueNames;
  }

  function formatSingleAuthorAPA(name) {
    if (!name) return '';
    let trimmed = name.trim().replace(/^by\s+/i, '').replace(/\.$/, '');
    if (!trimmed) return '';

    const orgKeywords = ['white house', 'department', 'ministry', 'organization', 'commission', 'agency', 'foundation', 'center', 'institute', 'bureau', 'office', 'house', 'senate', 'parliament', 'government', 'association', 'society', 'staff', 'reuters', 'press', 'news', 'editorial', 'team', 'guardian', 'associated', 'bloomberg', 'times', 'post'];
    if (orgKeywords.some(kw => trimmed.toLowerCase().includes(kw)) || trimmed.toLowerCase().startsWith('the ')) {
      return trimmed;
    }

    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      const lastName = parts[0].trim();
      const firstParts = parts[1].trim().split(/[\s\.-]+/);
      const initials = firstParts.map(p => {
        const clean = p.replace(/[^a-zA-Z]/g, '');
        return clean ? clean.charAt(0).toUpperCase() + '.' : '';
      }).filter(Boolean).join(' ');
      return `${lastName}, ${initials}`;
    }

    const words = trimmed.split(/\s+/);
    if (words.length >= 2) {
      const lastName = words[words.length - 1];
      const initials = words.slice(0, -1).map(w => {
        const clean = w.replace(/[^a-zA-Z]/g, '');
        return clean ? clean.charAt(0).toUpperCase() + '.' : '';
      }).filter(Boolean).join(' ');

      return `${lastName}, ${initials}`;
    }

    return trimmed;
  }

  function formatAPAAuthor(authorStr) {
    if (!authorStr || authorStr.length < 2) return '';

    const orgKeywords = ['white house', 'department', 'ministry', 'organization', 'commission', 'agency', 'foundation', 'center', 'institute', 'bureau', 'office', 'house', 'senate', 'parliament', 'government', 'association', 'society', 'staff', 'reuters', 'press', 'news', 'editorial', 'team', 'guardian', 'associated', 'bloomberg', 'times', 'post'];
    if (orgKeywords.some(kw => authorStr.toLowerCase().includes(kw)) || authorStr.toLowerCase().startsWith('the ')) {
      return authorStr.replace(/\.$/, '');
    }

    const names = parseAuthorNames(authorStr);
    const formatted = names.map(formatSingleAuthorAPA).filter(Boolean);

    if (formatted.length === 0) return '';
    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;

    const allExceptLast = formatted.slice(0, -1).join(', ');
    const lastAuthor = formatted[formatted.length - 1];
    return `${allExceptLast}, & ${lastAuthor}`;
  }

  function formatSingleAuthorMLA(name) {
    if (!name) return '';
    let trimmed = name.trim().replace(/^by\s+/i, '').replace(/\.$/, '');
    if (!trimmed) return '';

    if (trimmed.includes(',')) return trimmed;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, parts.length - 1).join(' ');
      return `${lastName}, ${firstName}`;
    }

    return trimmed;
  }

  function formatMLAAuthor(authorStr) {
    if (!authorStr || authorStr.length < 2) return '';

    const orgKeywords = ['white house', 'department', 'staff', 'reuters', 'press', 'news', 'editorial', 'team', 'bureau', 'guardian', 'associated', 'bloomberg', 'times', 'post'];
    if (orgKeywords.some(kw => authorStr.toLowerCase().includes(kw)) || authorStr.toLowerCase().startsWith('the ')) {
      return `${authorStr.replace(/\.$/, '')}. `;
    }

    const names = parseAuthorNames(authorStr);
    if (names.length === 0) return '';

    if (names.length === 1) {
      const parts = names[0].split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}. `;
      }
      return `${names[0]}. `;
    }

    if (names.length === 2) {
      const parts1 = names[0].split(/\s+/);
      const firstAuthor = parts1.length >= 2 ? `${parts1[parts1.length - 1]}, ${parts1.slice(0, -1).join(' ')}` : names[0];
      return `${firstAuthor}, and ${names[1]}. `;
    }

    const firstAuthor = formatSingleAuthorMLA(names[0]);
    return `${firstAuthor}, et al. `;
  }

  function formatChicagoSingleAuthorFirst(name) {
    if (!name) return '';
    let trimmed = name.trim().replace(/^by\s+/i, '').replace(/\.$/, '');
    if (!trimmed) return '';
    if (trimmed.includes(',')) return trimmed;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, parts.length - 1).join(' ');
      return `${lastName}, ${firstName}`;
    }
    return trimmed;
  }

  function formatChicagoSingleAuthorNormal(name) {
    if (!name) return '';
    let trimmed = name.trim().replace(/^by\s+/i, '').replace(/\.$/, '');
    if (!trimmed) return '';
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      return `${parts[1].trim()} ${parts[0].trim()}`;
    }
    return trimmed;
  }

  function formatChicagoAuthor(authorStr) {
    if (!authorStr || authorStr.length < 2) return '';

    const orgKeywords = ['white house', 'department', 'staff', 'reuters', 'press', 'news', 'editorial', 'team', 'bureau', 'guardian', 'associated', 'bloomberg', 'times', 'post'];
    if (orgKeywords.some(kw => authorStr.toLowerCase().includes(kw)) || authorStr.toLowerCase().startsWith('the ')) {
      return `${authorStr.replace(/\.$/, '')}. `;
    }

    const names = parseAuthorNames(authorStr);
    if (names.length === 0) return '';

    if (names.length === 1) {
      const parts = names[0].split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}. `;
      }
      return `${names[0]}. `;
    }

    if (names.length === 2) {
      const first = formatChicagoSingleAuthorFirst(names[0]);
      const second = formatChicagoSingleAuthorNormal(names[1]);
      return `${first}, and ${second}. `;
    }

    const first = formatChicagoSingleAuthorFirst(names[0]);
    const middle = names.slice(1, -1).map(formatChicagoSingleAuthorNormal).join(', ');
    const last = formatChicagoSingleAuthorNormal(names[names.length - 1]);

    if (middle) {
      return `${first}, ${middle}, and ${last}. `;
    } else {
      return `${first}, and ${last}. `;
    }
  }

  function formatMLADate(fullDate) {
    if (!fullDate) return '';
    const fullDateStr = String(fullDate);
    const mShort = {
      'january': 'Jan.', 'february': 'Feb.', 'march': 'Mar.', 'april': 'Apr.',
      'may': 'May', 'june': 'June', 'july': 'July', 'august': 'Aug.',
      'september': 'Sept.', 'october': 'Oct.', 'november': 'Nov.', 'december': 'Dec.'
    };

    try {
      const d = new Date(fullDateStr.replace(',', ''));
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const monthFull = d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
        const monthAbbr = mShort[monthFull] || d.toLocaleDateString('en-US', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${monthAbbr} ${year}`;
      }
    } catch(e) {}

    return fullDateStr;
  }

  function formatChicagoDate(fullDate, fallbackYear) {
    if (!fullDate) return `${fallbackYear}.`;
    const fullDateStr = String(fullDate);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    try {
      const d = new Date(fullDateStr.replace(',', ''));
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear();
        return `${month} ${day}, ${year}.`;
      }
    } catch(e) {}

    return `${fullDateStr}.`;
  }

  function getMLAUrl(url) {
    if (!url) return '';
    return String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  }

  // --- Scroll & Pointer Lock Helpers ---

  function preventScrollEvent(e) {
    if (isWheelActive) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }

  function preventKeyboardScroll(e) {
    const keys = ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'End', 'Home'];
    if (isWheelActive && keys.includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  function lockScrollAndPointer() {
    if (document.body) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.setProperty('overflow', 'hidden', 'important');
    }
    if (document.documentElement) {
      originalDocOverflow = document.documentElement.style.overflow;
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    }

    document.documentElement.style.setProperty('cursor', 'pointer', 'important');
    if (document.body) document.body.style.setProperty('cursor', 'pointer', 'important');
    hostDiv.style.setProperty('cursor', 'pointer', 'important');

    // Add locking listeners globally across document and window structures
    window.addEventListener('wheel', preventScrollEvent, { capture: true, passive: false });
    document.addEventListener('wheel', preventScrollEvent, { capture: true, passive: false });
    window.addEventListener('touchmove', preventScrollEvent, { capture: true, passive: false });
    document.addEventListener('touchmove', preventScrollEvent, { capture: true, passive: false });
    window.addEventListener('keydown', preventKeyboardScroll, { capture: true, passive: false });
    
    // Add defensive fallback overlay listener directly inside the shadow root container
    wheelContainer.addEventListener('wheel', preventScrollEvent, { capture: true, passive: false });
  }

  function unlockScrollAndPointer() {
    if (document.body) {
      if (originalBodyOverflow) {
        document.body.style.setProperty('overflow', originalBodyOverflow);
      } else {
        document.body.style.removeProperty('overflow');
      }
      document.body.style.removeProperty('cursor');
    }
    if (document.documentElement) {
      if (originalDocOverflow) {
        document.documentElement.style.setProperty('overflow', originalDocOverflow);
      } else {
        document.documentElement.style.removeProperty('overflow');
      }
      document.documentElement.style.removeProperty('cursor');
    }
    hostDiv.style.removeProperty('cursor');

    window.removeEventListener('wheel', preventScrollEvent, { capture: true });
    document.removeEventListener('wheel', preventScrollEvent, { capture: true });
    window.removeEventListener('touchmove', preventScrollEvent, { capture: true });
    document.removeEventListener('touchmove', preventScrollEvent, { capture: true });
    window.removeEventListener('keydown', preventKeyboardScroll, { capture: true });
    
    wheelContainer.removeEventListener('wheel', preventScrollEvent, { capture: true });
  }

  // --- Mouse Event Listeners ---

  window.addEventListener('mousedown', (e) => {
    if (e.button !== 1) return;

    originX = e.clientX;
    originY = e.clientY;

    holdTimer = setTimeout(() => {
      isWheelActive = true;
      preventNextAuxClick = true;
      showWheel(originX, originY);
    }, HOLD_THRESHOLD_MS);
  }, true);

  window.addEventListener('mousemove', (e) => {
    if (!isWheelActive) return;

    e.preventDefault();
    e.stopPropagation();

    calculateSector(e.clientX, e.clientY);
  }, true);

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 1) return;

    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    if (isWheelActive) {
      e.preventDefault();
      e.stopPropagation();

      executeAction(currentSector);
      hideWheel();
      isWheelActive = false;
    }
  }, true);

  window.addEventListener('auxclick', (e) => {
    if (e.button === 1 && preventNextAuxClick) {
      e.preventDefault();
      e.stopPropagation();
      preventNextAuxClick = false;
    }
  }, true);

  // --- 8-Octant Radial Trigonometry Math ---

  function calculateSector(mouseX, mouseY) {
    const dx = mouseX - originX;
    const dy = originY - mouseY; // Invert Y axis

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= NEUTRAL_RADIUS_PX) {
      updateActiveUI('NEUTRAL');
      return;
    }

    const angleRad = Math.atan2(dy, dx);
    let deg = angleRad * (180 / Math.PI);
    if (deg < 0) deg += 360;

    let sector = 'N';
    if (deg >= 67.5 && deg < 112.5) {
      sector = 'N';
    } else if (deg >= 22.5 && deg < 67.5) {
      sector = 'NE';
    } else if (deg >= 337.5 || deg < 22.5) {
      sector = 'E';
    } else if (deg >= 292.5 && deg < 337.5) {
      sector = 'SE';
    } else if (deg >= 247.5 && deg < 292.5) {
      sector = 'S';
    } else if (deg >= 202.5 && deg < 247.5) {
      sector = 'SW';
    } else if (deg >= 157.5 && deg < 202.5) {
      sector = 'W';
    } else if (deg >= 112.5 && deg < 157.5) {
      sector = 'NW';
    }

    updateActiveUI(sector);
  }

  function updateActiveUI(sector) {
    currentSector = sector;

    slices.forEach(slice => {
      slice.classList.toggle('active', slice.dataset.sector === sector);
    });

    items.forEach(item => {
      item.classList.toggle('active', item.dataset.sector === sector);
    });

    centerCircle.classList.toggle('active', sector === 'NEUTRAL');
  }

  function showWheel(x, y) {
    wheelWrapper.style.left = `${x}px`;
    wheelWrapper.style.top = `${y}px`;
    wheelContainer.classList.remove('hidden');
    updateActiveUI('NEUTRAL');
    lockScrollAndPointer();
  }

  function hideWheel() {
    wheelContainer.classList.add('hidden');
    unlockScrollAndPointer();
  }

  // --- RESEARCH ACTIONS EXECUTION ---

  function executeAction(sector) {
    switch (sector) {
      case 'N': handleScholarSearch(); break;
      case 'NE': handlePubMedSearch(); break;
      case 'E': handleAppendNote(); break;
      case 'SE': handleFormatCitation(); break;
      case 'S': handleOpenWorkspace(); break;
      case 'SW': handleTranslate(); break;
      case 'W': handleTitleAndURL(); break;
      case 'NW': handleCopyPlusSource(); break;
      case 'NEUTRAL': default: break;
    }
  }

  function saveNoteToWorkspace(noteEntry, toastMessage) {
    chrome.storage.local.get({ researchNotes: [] }, (result) => {
      const notes = result.researchNotes;
      notes.push(noteEntry);
      chrome.storage.local.set({ researchNotes: notes }, () => {
        showToast(toastMessage || 'Note saved to Workspace!');
      });
    });
  }

  function handleScholarSearch() {
    const query = window.getSelection().toString().trim() || getCleanTitle();
    chrome.runtime.sendMessage({ type: 'SEARCH_SCHOLAR', payload: { query } });
    showToast('Searching Google Scholar...');
  }

  function handlePubMedSearch() {
    const query = window.getSelection().toString().trim() || getCleanTitle();
    chrome.runtime.sendMessage({ type: 'SEARCH_PUBMED', payload: { query } });
    showToast('Searching PubMed...');
  }

  function handleAppendNote() {
    const selection = window.getSelection().toString().trim();
    const cleanTitle = getCleanTitle();
    const noteText = selection || `Bookmark: ${cleanTitle}`;

    const payload = createNotePayload('NOTE', noteText);
    saveNoteToWorkspace(payload, 'Note appended to Workspace!');
  }

  function handleFormatCitation() {
    chrome.storage.local.get({ citationStyle: 'APA' }, (res) => {
      const style = res.citationStyle || 'APA';
      const payload = createNotePayload('CITATION', '');
      const siteName = getSiteName(payload.domain, payload.url);

      let citationText = '';
      if (style === 'MLA') {
        const mlaAuthor = formatMLAAuthor(payload.author);
        const mlaDate = formatMLADate(payload.fullDate);
        const mlaUrl = getMLAUrl(payload.url);
        const mlaDateStr = mlaDate ? `${mlaDate}, ` : '';
        const titleCasedTitle = toTitleCase(payload.cleanTitle);

        citationText = `${mlaAuthor}"${titleCasedTitle}." *${siteName}*, ${mlaDateStr}${mlaUrl}.`;
      } else if (style === 'Chicago') {
        const chicagoAuthor = formatChicagoAuthor(payload.author);
        const cleanChicagoAuthor = chicagoAuthor.replace(/\.+$/, '').trim();
        const chicagoDate = formatChicagoDate(payload.fullDate, payload.year);
        const titleCasedTitle = toTitleCase(payload.cleanTitle);

        const publisherString = (cleanChicagoAuthor.toLowerCase() === siteName.toLowerCase()) ? '' : `${siteName}, `;

        citationText = `${chicagoAuthor}"${titleCasedTitle}." ${publisherString}${chicagoDate} ${payload.url}`;
      } else if (style === 'BibTeX') {
        const cleanAuthorKey = payload.author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'source';
        const bibKey = `${cleanAuthorKey}_${payload.domain}_${payload.year}`;

        citationText = `@misc{${bibKey},\n  author       = {${payload.author}},\n  title        = {${payload.cleanTitle}},\n  year         = {${payload.year}},\n  url          = {${payload.url}},\n  howpublished = {\\url{${payload.url}}}\n}`;
      } else {
        // Official APA 7th Edition Format
        const rawApaAuthor = formatAPAAuthor(payload.author);
        const cleanApaAuthor = rawApaAuthor.replace(/\.+$/, '');
        const sentenceTitle = ProperNounEngine.toSentenceCase(payload.cleanTitle);

        if (!cleanApaAuthor) {
          citationText = `${sentenceTitle}. (${payload.fullDate}). *${siteName}*. ${payload.url}`;
        } else {
          const siteString = (cleanApaAuthor.toLowerCase() === siteName.toLowerCase()) ? '' : `*${siteName}*. `;
          citationText = `${cleanApaAuthor}. (${payload.fullDate}). ${sentenceTitle}. ${siteString}${payload.url}`;
        }
      }

      payload.text = citationText;

      navigator.clipboard.writeText(citationText).then(() => {
        saveNoteToWorkspace(payload, `${style} Citation copied & saved!`);
      });
    });
  }

  function handleOpenWorkspace() {
    chrome.runtime.sendMessage({ type: 'OPEN_RESEARCH_PANEL' });
    showToast('Opening Research Workspace...');
  }

  function handleTranslate() {
    const textSelectors = ['h1', 'h2', 'h3', 'p', 'article', 'span.title'];
    const elements = Array.from(document.querySelectorAll(textSelectors.join(',')))
      .filter(el => el.innerText && el.innerText.trim().length > 3 && el.offsetWidth > 0)
      .slice(0, 20);

    if (elements.length === 0) {
      showToast('No text found to translate.');
      return;
    }

    const textList = elements.map(el => el.innerText.trim());
    showToast('Translating page text under the hood...');

    chrome.runtime.sendMessage({
      type: 'TRANSLATE_PAGE_NODES',
      payload: { textList }
    }, (response) => {
      if (response && response.success && response.translations) {
        response.translations.forEach((translatedText, index) => {
          if (elements[index] && translatedText) {
            elements[index].textContent = translatedText;
          }
        });
        showToast('Page translated!');
      } else {
        showToast('Translation failed.');
      }
    });
  }

  function handleTitleAndURL() {
    const cleanTitle = getCleanTitle();
    const url = window.location.href;
    const markdownLink = `[${cleanTitle}](${url})`;

    navigator.clipboard.writeText(markdownLink).then(() => {
      showToast('Title + URL copied!');
    });
  }

  function handleCopyPlusSource() {
    const selection = window.getSelection().toString().trim();

    if (!selection) {
      showToast('Please select text on the page first to save a Quote!');
      return;
    }

    const payload = createNotePayload('QUOTE', selection);
    const textToCopy = `> ${selection}\n\nSource: [${payload.cleanTitle}](${payload.url})`;

    payload.text = textToCopy;

    navigator.clipboard.writeText(textToCopy).then(() => {
      saveNoteToWorkspace(payload, 'Quote + Source saved!');
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.add('hidden');
    }, 2200);
  }
})();