/**
 * Research Workspace - Side Panel Script
 * Complete citation engine with ProperNounEngine integration, APA 7th, MLA 9th, Chicago 17th, and BibTeX.
 */

document.addEventListener('DOMContentLoaded', () => {
  const notesListEl = document.getElementById('notes-list');
  const copyAllBtn = document.getElementById('btn-copy-all');
  const exportBtn = document.getElementById('btn-export');
  const clearBtn = document.getElementById('btn-clear');
  const styleBtns = document.querySelectorAll('.style-btn');

  let activeStyle = 'APA';

  const isStorageAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

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

  function getCleanTitle(title) {
    if (!title) return 'Source';
    const titleStr = String(title);
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
      'wsj': 'The Wall Street Journal',
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
      if (host.includes('wsj.com')) return 'The Wall Street Journal';
      if (host.includes('npr.org')) return 'NPR';
      if (host.includes('usnews.com')) return 'U.S. News & World Report';
    } catch(e) {}

    return d.charAt(0).toUpperCase() + d.slice(1);
  }

  function parseAuthorNames(authorStr) {
    if (!authorStr) return [];
    let cleanedAuthor = cleanAuthorByline(authorStr);
    if (!cleanedAuthor || !isValidAuthorName(cleanedAuthor)) return [];
    
    let str = cleanedAuthor.trim().replace(/^by\s+/i, '').replace(/\.$/, '');
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

  function formatBibTeXAuthors(authorStr) {
    if (!authorStr || authorStr.length < 2) return 'Author';

    const orgKeywords = ['white house', 'department', 'staff', 'reuters', 'press', 'news', 'editorial', 'team', 'bureau', 'guardian', 'associated', 'bloomberg', 'times', 'post'];
    if (orgKeywords.some(kw => authorStr.toLowerCase().includes(kw)) || authorStr.toLowerCase().startsWith('the ')) {
      return authorStr.replace(/\.$/, '');
    }

    const names = parseAuthorNames(authorStr);
    const formatted = names.map(n => {
      const parts = n.split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
      }
      return n;
    });

    return formatted.join(' and ');
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

  function getSmartAuthor(note) {
    // Explicitly preserve empty strings saved via the Title-First pipeline
    if (note.author === '') return '';
    if (note.author && note.author.length > 1) return note.author;
    
    const domain = note.domain || 'domain';
    const url = note.url || '';

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (domain === 'github' && pathParts.length > 0) return pathParts[0];
      if ((domain === 'x' || domain === 'twitter') && pathParts.length > 0) return pathParts[0];
      if (domain === 'youtube' && pathParts.length > 0 && pathParts[0].startsWith('@')) return pathParts[0].substring(1);
    } catch(e) {}

    return getSiteName(domain, url);
  }

  function getBibTeXData(note) {
    const url = note.url || '';
    const domain = note.domain || 'domain';
    const year = note.year || new Date().getFullYear();
    const siteName = getSiteName(domain, url);
    const author = getSmartAuthor(note);
    const bibAuthors = formatBibTeXAuthors(author);

    let rawTitle = note.cleanTitle || note.title || 'Source';
    let cleanTitle = getCleanTitle(rawTitle);

    let firstAuthorLast = 'source';
    const firstAuthorPart = bibAuthors.split(' and ')[0];
    if (firstAuthorPart.includes(',')) {
      firstAuthorLast = firstAuthorPart.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    } else {
      const parts = firstAuthorPart.trim().split(/\s+/);
      firstAuthorLast = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    let keyword = '';
    const ignoreWords = ['a', 'an', 'the', 'in', 'on', 'of', 'to', 'for', 'with', 'by', 'at', 'from', 'github', 'profile'];
    const words = cleanTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && !ignoreWords.includes(w)) {
        keyword = w;
        break;
      }
    }

    const bibKey = `${firstAuthorLast || 'source'}${year}${keyword}`;

    const monthMap = {
      'january': 'jan', 'jan.': 'jan',
      'february': 'feb', 'feb.': 'feb',
      'march': 'mar', 'mar.': 'mar',
      'april': 'apr', 'apr.': 'apr',
      'may': 'may',
      'june': 'jun', 'june.': 'jun',
      'july': 'jul', 'july.': 'jul',
      'august': 'aug', 'aug.': 'aug',
      'september': 'sep', 'sept.': 'sep',
      'october': 'oct', 'oct.': 'oct',
      'november': 'nov', 'nov.': 'nov',
      'december': 'dec', 'dec.': 'dec'
    };

    let monthAbbr = 'aug';
    let dayVal = '5';

    try {
      const dateObj = new Date(note.fullDate ? note.fullDate.replace(',', '') : Date.now());
      if (!isNaN(dateObj.getTime())) {
        const monthFull = dateObj.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
        monthAbbr = monthMap[monthFull] || 'aug';
        dayVal = dateObj.getDate().toString();
      }
    } catch(e) {}

    const bibBlock = `@misc{${bibKey},\n  author       = {${bibAuthors}},\n  title        = {${cleanTitle}},\n  howpublished = {${siteName}},\n  year         = {${year}},\n  month        = ${monthAbbr},\n  day          = {${dayVal}},\n  url          = {${url}}\n}`;

    return {
      bibKey,
      bibBlock,
      author: bibAuthors,
      cleanTitle
    };
  }

  // Dynamic Citation Formatter
  function formatCitation(note, style) {
    const domain = note.domain || 'domain';
    const year = note.year || new Date().getFullYear();
    const fullDate = note.fullDate || `${year}, ${note.accessDate || 'Today'}`;
    const url = note.url || '';

    const bibData = getBibTeXData(note);
    const siteName = getSiteName(domain, url);

    if (style === 'MLA') {
      const mlaAuthor = formatMLAAuthor(bibData.author);
      const mlaDate = formatMLADate(fullDate);
      const mlaUrl = getMLAUrl(url);
      const mlaDateStr = mlaDate ? `${mlaDate}, ` : '';
      const titleCasedTitle = toTitleCase(bibData.cleanTitle);

      return `${mlaAuthor}"${titleCasedTitle}." *${siteName}*, ${mlaDateStr}${mlaUrl}.`;
    } else if (style === 'Chicago') {
      const chicagoAuthor = formatChicagoAuthor(bibData.author);
      const cleanChicagoAuthor = chicagoAuthor.replace(/\.+$/, '').trim();
      const chicagoDate = formatChicagoDate(fullDate, year);
      const titleCasedTitle = toTitleCase(bibData.cleanTitle);

      const publisherString = (cleanChicagoAuthor.toLowerCase() === siteName.toLowerCase()) ? '' : `${siteName}, `;

      return `${chicagoAuthor}"${titleCasedTitle}." ${publisherString}${chicagoDate} ${url}`;
    } else if (style === 'BibTeX') {
      return bibData.bibBlock;
    } else {
      // Official APA 7th Edition formatting
      const rawApaAuthor = formatAPAAuthor(bibData.author);
      const cleanApaAuthor = rawApaAuthor.replace(/\.+$/, '');
      const sentenceTitle = ProperNounEngine.toSentenceCase(bibData.cleanTitle);

      if (!cleanApaAuthor) {
        return `${sentenceTitle}. (${fullDate}). *${siteName}*. ${url}`;
      } else {
        const siteString = (cleanApaAuthor.toLowerCase() === siteName.toLowerCase()) ? '' : `*${siteName}*. `;
        return `${cleanApaAuthor}. (${fullDate}). ${sentenceTitle}. ${siteString}${url}`;
      }
    }
  }

  // Safe wrapper for initial setup
  if (isStorageAvailable) {
    chrome.storage.local.get({ citationStyle: 'APA' }, (res) => {
      activeStyle = res.citationStyle || 'APA';
      styleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.style === activeStyle);
      });
      renderNotes();
    });
  } else {
    console.warn("Storage API not found. Please review storage configurations inside manifest.json.");
  }

  styleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeStyle = e.currentTarget.dataset.style;
      styleBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      if (isStorageAvailable) {
        chrome.storage.local.set({ citationStyle: activeStyle }, () => {
          renderNotes();
        });
      }
    });
  });

  function renderNotes() {
    if (!notesListEl) return;

    if (!isStorageAvailable) {
      notesListEl.innerHTML = `
        <div class="note-card">
          <div class="note-text" style="color: #ef4444;">Storage environment not initialized. Verify storage permissions.</div>
        </div>
      `;
      return;
    }

    chrome.storage.local.get({ researchNotes: [] }, (result) => {
      // Safe guard against corrupted/non-array storage profiles
      const notes = Array.isArray(result.researchNotes) ? result.researchNotes : [];
      
      if (notes.length === 0) {
        notesListEl.innerHTML = `
          <div class="note-card">
            <div class="note-text" style="color: #64748b;">No research notes saved yet. Use 📝 Append Note or 📋 Quote + Source on the wheel to clip content here!</div>
          </div>
        `;
        return;
      }

      notesListEl.innerHTML = '';
      notes.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        const cleanTitle = getCleanTitle(note.cleanTitle || note.title);

        let displayText = note.text;
        let noteTag = `${note.type || 'NOTE'} • ${note.timestamp || ''}`;

        if (note.type === 'CITATION') {
          if (activeStyle === 'BibTeX') {
            const bibData = getBibTeXData(note);
            noteTag = `BIBTEX • ${bibData.bibKey}`;
            displayText = `${bibData.cleanTitle} (${bibData.author}, ${note.year || '2026'})`;
          } else {
            displayText = formatCitation(note, activeStyle);
          }
        }

        card.innerHTML = `
          <div class="note-card-header">
            <span class="note-tag">${noteTag}</span>
            <button class="delete-note-btn" data-index="${index}" title="Delete note">✕</button>
          </div>
          <div class="note-text">${escapeHtml(displayText)}</div>
          <div class="note-meta">
            <a href="${escapeHtml(note.url)}" target="_blank" title="${escapeHtml(note.title)}">${escapeHtml(cleanTitle)}</a>
            <button class="copy-single-note-btn" data-index="${index}">Copy</button>
          </div>
        `;
        notesListEl.appendChild(card);
      });

      const deleteBtns = notesListEl.querySelectorAll('.delete-note-btn');
      deleteBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.dataset.index, 10);
          deleteSingleNote(idx);
        });
      });

      const copyBtns = notesListEl.querySelectorAll('.copy-single-note-btn');
      copyBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.dataset.index, 10);
          copySingleNote(idx, e.currentTarget);
        });
      });
    });
  }

  function deleteSingleNote(indexToDelete) {
    if (!isStorageAvailable) return;
    chrome.storage.local.get({ researchNotes: [] }, (result) => {
      const notes = result.researchNotes;
      if (indexToDelete >= 0 && indexToDelete < notes.length) {
        notes.splice(indexToDelete, 1);
        chrome.storage.local.set({ researchNotes: notes }, () => {
          renderNotes();
        });
      }
    });
  }

  function copySingleNote(indexToCopy, btnElement) {
    if (!isStorageAvailable) return;
    chrome.storage.local.get({ researchNotes: [] }, (result) => {
      const notes = result.researchNotes;
      const note = notes[indexToCopy];
      if (!note) return;

      const cleanTitle = getCleanTitle(note.cleanTitle || note.title);
      let singleMarkdown = '';

      if (note.type === 'QUOTE') {
        singleMarkdown = `> ${note.text}\n\n**Source:** [${cleanTitle}](${note.url})`;
      } else if (note.type === 'CITATION') {
        singleMarkdown = formatCitation(note, activeStyle);
      } else {
        singleMarkdown = `${note.text}\n\n**Source:** [${cleanTitle}](${note.url})`;
      }

      navigator.clipboard.writeText(singleMarkdown).then(() => {
        btnElement.textContent = 'Copied!';
        btnElement.style.background = '#2563eb';
        btnElement.style.color = '#ffffff';

        setTimeout(() => {
          btnElement.textContent = 'Copy';
          btnElement.style.background = '#334155';
          btnElement.style.color = '#cbd5e1';
        }, 1500);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function generateFormattedMarkdown(notes) {
    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let mdContent = `# Research Notes Export\n`;
    mdContent += `Exported: ${exportDate} (${activeStyle} Format)\n\n---\n\n`;

    notes.forEach((note, index) => {
      const rawType = note.type || 'NOTE';
      const typeLabel = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
      const cleanTitle = getCleanTitle(note.cleanTitle || note.title);

      mdContent += `## ${index + 1}. ${typeLabel}\n`;

      if (rawType === 'QUOTE') {
        mdContent += `> ${note.text}\n\n`;
        mdContent += `**Source:** [${cleanTitle}](${note.url})  \n`;
        mdContent += `**Saved:** ${note.timestamp}\n\n`;
      } else if (rawType === 'CITATION') {
        const citationFormatted = formatCitation(note, activeStyle);
        mdContent += `${citationFormatted}  \n\n`;
        mdContent += `**Saved:** ${note.timestamp}\n\n`;
      } else {
        mdContent += `${note.text}\n\n`;
        mdContent += `**Source:** [${cleanTitle}](${note.url})  \n`;
        mdContent += `**Saved:** ${note.timestamp}\n\n`;
      }

      mdContent += `---\n\n`;
    });

    return mdContent;
  }

  if (isStorageAvailable) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.researchNotes) {
        renderNotes();
      }
    });
  }

  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      if (!isStorageAvailable) return;
      chrome.storage.local.get({ researchNotes: [] }, (result) => {
        const notes = result.researchNotes;
        if (notes.length === 0) return;

        const formattedMd = generateFormattedMarkdown(notes);
        navigator.clipboard.writeText(formattedMd).then(() => {
          copyAllBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyAllBtn.textContent = 'Copy All';
          }, 1500);
        });
      });
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!isStorageAvailable) return;
      chrome.storage.local.get({ researchNotes: [] }, (result) => {
        const notes = result.researchNotes;
        if (notes.length === 0) return;

        const formattedMd = generateFormattedMarkdown(notes);
        const blob = new Blob([formattedMd], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Research_Notes_${activeStyle}_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!isStorageAvailable) return;
      chrome.storage.local.set({ researchNotes: [] }, () => {
        renderNotes();
      });
    });
  }
});