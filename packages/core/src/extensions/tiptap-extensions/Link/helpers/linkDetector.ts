/**
 * Lightweight URL detection module replacing linkifyjs.
 *
 * Provides two functions:
 * - findLinks(): find all URLs/emails in arbitrary text (replaces linkifyjs find())
 * - tokenizeLink(): tokenize a single word for autolink validation (replaces linkifyjs tokenize())
 */

export interface LinkMatch {
  type: string;
  value: string;
  isLink: boolean;
  href: string;
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// TLD set – used only for schemeless URL validation.
// Protocol URLs (http://, https://, etc.) skip TLD checks.
// ---------------------------------------------------------------------------

// prettier-ignore
const CC_TLDS =
  "ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg er es et eu fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st su sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug uk us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw";

// prettier-ignore
const G_TLDS =
  "com org net edu gov mil int aero asia biz cat coop info jobs mobi museum name post pro tel travel xxx academy accountant accountants actor adult agency airforce apartments app army associates attorney auction auto band bank bar bargains beer best bet bid bike bingo bio black blog blue boutique broker build builders business buzz cab cafe cam camera camp capital car cards care career careers casa cash casino catering center ceo chat cheap church city claims cleaning click clinic clothing cloud club coach codes coffee college community company computer condos construction consulting contractors cooking cool country coupons courses credit creditcard cruise dad dance date dating day dealer deals degree delivery democrat dental dentist design dev diamonds diet digital direct directory discount doctor dog domains download earth eat education email energy engineer engineering enterprises equipment estate events exchange expert exposed express fail faith family fan fans farm fashion film final finance financial fish fishing fit fitness flights florist flowers fly foo football forex forsale forum foundation fun fund furniture futbol fyi gallery game games garden gift gifts gives glass global gmbh gold golf graphics gratis green gripe group guide guru hair haus health healthcare help hiphop hockey holdings holiday homes horse hospital host hosting hot house how inc industries ink institute insurance insure international investments irish jewelry jetzt jot joy kim kitchen land law lawyer lease legal life lighting limited limo link live llc loan loans lol love ltd luxury maison management map market marketing mba media memorial men menu miami moda mom money monster mortgage movie music navy network new news ninja now observer one online ooo organic page partners parts party pay pet pharmacy photo photography photos pink pizza place plumbing plus poker porn press productions promo properties property pub quest racing radio realestate realty recipes red rehab rent rentals repair report republican rest restaurant review reviews rich rip rocks rodeo run sale salon sarl save school science search security select services sex sexy shoes shop shopping show singles site ski skin social software solar solutions space sport spot srl storage store stream studio style sucks supplies supply support surf surgery systems tax taxi team tech technology tennis theater theatre tips tires today tools top tours town toys trade trading training tube university uno vacations vegas ventures vet video villas vin vip vision vodka vote voyage wang watch webcam website wedding whoswho wiki win wine work works world wtf xyz yoga you zone";

const TLD_SET = new Set([...CC_TLDS.split(" "), ...G_TLDS.split(" ")]);

// Special hostnames recognized without a TLD
const SPECIAL_HOSTS = new Set(["localhost"]);

// ---------------------------------------------------------------------------
// Regex building blocks
// ---------------------------------------------------------------------------

// Characters that are unlikely to be part of a URL when they appear at the end
const TRAILING_PUNCT = /[.,;:!?"']+$/;

// Protocol URLs: http:// https:// ftp:// ftps://
const PROTOCOL_RE =
  /(?:https?|ftp|ftps):\/\/[^\s]+/g;

// Mailto URLs: mailto:...
const MAILTO_RE = /mailto:[^\s]+/g;

// Bare email addresses: user@domain.tld
const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;

// Schemeless URLs: domain.tld with optional port and path
// Hostname: one or more labels separated by dots, TLD is alpha-only 2+ chars
const SCHEMELESS_RE =
  /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?/g;

// ---------------------------------------------------------------------------
// Post-processing helpers
// ---------------------------------------------------------------------------

/**
 * Trim trailing punctuation and unbalanced closing brackets from a URL match.
 */
function trimTrailing(value: string): string {
  let v = value;

  // Iteratively trim trailing punctuation and unbalanced brackets
  let changed = true;
  while (changed) {
    changed = false;

    // Trim trailing punctuation chars
    const before = v;
    v = v.replace(TRAILING_PUNCT, "");
    if (v !== before) {
      changed = true;
    }

    // Trim unbalanced closing brackets from the end
    for (const [open, close] of [
      ["(", ")"],
      ["[", "]"],
    ] as const) {
      while (v.endsWith(close)) {
        const openCount = countChar(v, open);
        const closeCount = countChar(v, close);
        if (closeCount > openCount) {
          v = v.slice(0, -1);
          changed = true;
        } else {
          break;
        }
      }
    }
  }

  return v;
}

function countChar(str: string, ch: string): number {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ch) {
      count++;
    }
  }
  return count;
}

/**
 * Extract the TLD from a hostname string.
 * Returns the last dot-separated segment.
 */
function extractTld(hostname: string): string {
  const parts = hostname.split(".");
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Extract hostname from a URL value (no protocol).
 */
function extractHostname(value: string): string {
  // Remove protocol if present
  let s = value;
  const protoIdx = s.indexOf("://");
  if (protoIdx !== -1) {
    s = s.slice(protoIdx + 3);
  } else if (s.startsWith("mailto:")) {
    s = s.slice(7);
  }

  // Remove path, query, fragment
  s = s.split(/[/?#]/)[0];
  // Remove port
  s = s.split(":")[0];
  // Remove userinfo
  if (s.includes("@")) {
    s = s.split("@").pop()!;
  }

  return s;
}

function isValidTld(hostname: string): boolean {
  const tld = extractTld(hostname);
  return TLD_SET.has(tld);
}

/**
 * Build the href for a URL value, prepending the default protocol if needed.
 */
function buildHref(
  value: string,
  type: string,
  defaultProtocol: string
): string {
  if (type === "email") {
    return "mailto:" + value;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) || /^mailto:/i.test(value)) {
    // Already has a protocol
    return value;
  }
  return defaultProtocol + "://" + value;
}

// ---------------------------------------------------------------------------
// findLinks()
// ---------------------------------------------------------------------------

export interface FindOptions {
  defaultProtocol?: string;
}

interface RawMatch {
  type: string;
  value: string;
  start: number;
  end: number;
}

/**
 * Find all URLs and email addresses in the given text.
 * Drop-in replacement for linkifyjs find().
 */
export function findLinks(
  text: string,
  options?: FindOptions
): LinkMatch[] {
  if (!text) {
    return [];
  }

  const defaultProtocol = options?.defaultProtocol || "http";
  const rawMatches: RawMatch[] = [];

  // 1. Protocol URLs
  for (const m of text.matchAll(PROTOCOL_RE)) {
    rawMatches.push({
      type: "url",
      value: m[0],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }

  // 2. Mailto URLs
  for (const m of text.matchAll(MAILTO_RE)) {
    rawMatches.push({
      type: "url",
      value: m[0],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }

  // 3. Bare email addresses
  for (const m of text.matchAll(EMAIL_RE)) {
    rawMatches.push({
      type: "email",
      value: m[0],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }

  // 4. Schemeless URLs
  for (const m of text.matchAll(SCHEMELESS_RE)) {
    rawMatches.push({
      type: "url",
      value: m[0],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }

  // Sort by start position
  rawMatches.sort((a, b) => a.start - b.start || b.end - a.end);

  // Deduplicate overlapping matches (prefer earlier & longer)
  const deduped: RawMatch[] = [];
  let lastEnd = -1;
  for (const match of rawMatches) {
    if (match.start >= lastEnd) {
      deduped.push(match);
      lastEnd = match.end;
    }
  }

  // Post-process each match
  const results: LinkMatch[] = [];
  for (const raw of deduped) {
    const value = trimTrailing(raw.value);
    if (!value) {
      continue;
    }

    const start = raw.start;
    const end = start + value.length;

    // For schemeless URLs, validate TLD
    if (raw.type === "url" && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
      const hostname = extractHostname(value);
      if (!isValidTld(hostname)) {
        continue;
      }
    }

    // For emails, validate TLD
    if (raw.type === "email") {
      const hostname = value.split("@")[1];
      if (!isValidTld(hostname)) {
        continue;
      }
    }

    const href = buildHref(value, raw.type, defaultProtocol);

    results.push({
      type: raw.type,
      value,
      isLink: true,
      href,
      start,
      end,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// tokenizeLink()
// ---------------------------------------------------------------------------

/**
 * Tokenize a single word for autolink validation.
 * Drop-in replacement for: tokenize(word).map(t => t.toObject(defaultProtocol))
 *
 * Returns an array of LinkMatch tokens. The autolink code checks:
 * - 1 token with isLink=true → valid single link
 * - 3 tokens with middle isLink=true and outer brackets → valid wrapped link
 */
export function tokenizeLink(
  text: string,
  defaultProtocol = "http"
): LinkMatch[] {
  if (!text) {
    return [nonLinkToken(text, 0, 0)];
  }

  // Check for bracket wrapping: (url), [url], {url}
  const brackets: Array<[string, string]> = [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ];
  for (const [open, close] of brackets) {
    if (text.startsWith(open) && text.endsWith(close) && text.length > 2) {
      const inner = text.slice(1, -1);
      if (isSingleUrl(inner)) {
        return [
          nonLinkToken(open, 0, 1),
          linkToken(inner, 1, 1 + inner.length, defaultProtocol),
          nonLinkToken(close, 1 + inner.length, text.length),
        ];
      }
    }
  }

  // Check for trailing punctuation (e.g., "example.com." → link + dot)
  if (text.endsWith(".") && text.length > 1) {
    const withoutDot = text.slice(0, -1);
    if (isSingleUrl(withoutDot)) {
      return [
        linkToken(withoutDot, 0, withoutDot.length, defaultProtocol),
        nonLinkToken(".", withoutDot.length, text.length),
      ];
    }
  }

  // Check if the whole text is a single URL
  if (isSingleUrl(text)) {
    return [linkToken(text, 0, text.length, defaultProtocol)];
  }

  // Not a link
  return [nonLinkToken(text, 0, text.length)];
}

/**
 * Check if a string is a single complete URL (no extra chars).
 */
function isSingleUrl(text: string): boolean {
  // Protocol URLs
  if (/^(?:https?|ftp|ftps):\/\/[^\s]+$/.test(text)) {
    return true;
  }

  // Mailto URLs
  if (/^mailto:[^\s]+$/.test(text)) {
    return true;
  }

  // Special hosts (e.g., localhost)
  if (SPECIAL_HOSTS.has(text.toLowerCase())) {
    return true;
  }

  // Schemeless URLs: hostname.tld with optional port and path
  const schemelessFull =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+([a-zA-Z]{2,})(?::\d{1,5})?(?:[/?#][^\s]*)?$/;
  const match = text.match(schemelessFull);
  if (match) {
    const tld = match[1].toLowerCase();
    // TLD must be a-z only (no numbers) and recognized
    if (TLD_SET.has(tld)) {
      return true;
    }
  }

  return false;
}

function linkToken(
  value: string,
  start: number,
  end: number,
  defaultProtocol: string
): LinkMatch {
  const type =
    value.includes("@") && !value.includes("://") && !value.startsWith("mailto:")
      ? "email"
      : "url";
  return {
    type,
    value,
    isLink: true,
    href: buildHref(value, type, defaultProtocol),
    start,
    end,
  };
}

function nonLinkToken(value: string, start: number, end: number): LinkMatch {
  return {
    type: "text",
    value,
    isLink: false,
    href: value,
    start,
    end,
  };
}
