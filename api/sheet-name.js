// Vercel function: returns the name of a published Google Sheet.
//
// Browsers can't read the name themselves: Google sends it in a download header
// that's hidden from web pages. Here on the server nothing is hidden, so we ask
// Google for the sheet and return just its name. Only Google Sheets links are
// accepted, so this can't be used to fetch anything else.

const GENERIC_TAB = /^(sheet|blad|feuille|hoja|planilha|página|pagina|tabelle|foglio|arkusz)\s*\d+$/i;

function nameFromDisposition(header) {
  if (!header) return null;
  const star = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const plain = header.match(/filename\s*=\s*"([^"]+)"/i) || header.match(/filename\s*=\s*([^;]+)/i);
  let raw = star ? decodeURIComponent(star[1]) : plain ? plain[1] : null;
  if (!raw) return null;
  raw = raw.trim().replace(/\.csv$/i, '');
  if (/^(data|export|output|download|sheet)$/i.test(raw)) return null; // not a real name
  // Google names the file "Spreadsheet name - Tab name". A tab is often the
  // most specific name (one tab per lesson), unless it's the default "Sheet1".
  const parts = raw.split(' - ');
  if (parts.length >= 2) {
    const tab = parts.pop().trim();
    const title = parts.join(' - ').trim();
    return GENERIC_TAB.test(tab) ? title : tab;
  }
  return raw;
}

function nameFromHtml(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return null;
  return m[1].replace(/\s*-\s*Google (Sheets|Drive|Spreadsheets)\s*$/i, '').trim() || null;
}

// Some Google pages answer differently to bare server requests; look like a browser.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Accept-Language': 'en',
};

export default async function handler(req, res) {
  const url = String(req.query.url || '');
  const debug = req.query.debug === '1';
  const trace = [];
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ name: null }); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'docs.google.com' || !parsed.pathname.startsWith('/spreadsheets/')) {
    return res.status(400).json({ name: null });
  }

  res.setHeader('Cache-Control', 's-maxage=300');
  try {
    // 1. The CSV download's file name: "Spreadsheet - Tab.csv"
    const csv = await fetch(url, { redirect: 'follow', headers: HEADERS });
    const disposition = csv.headers.get('content-disposition');
    trace.push({ step: 'csv', status: csv.status, finalUrl: csv.url, contentType: csv.headers.get('content-type'), disposition });
    const fromHeader = nameFromDisposition(disposition);
    if (fromHeader) return res.status(200).json(debug ? { name: fromHeader, trace } : { name: fromHeader });

    // 2. The published web page's title
    const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\//);
    const htmlUrl = /\/d\/e\//.test(url)
      ? url.replace(/\/pub\?[^#]*/, '/pubhtml')                       // published link
      : id ? `https://docs.google.com/spreadsheets/d/${id[1]}/htmlview` // shared link
        : url;
    if (htmlUrl !== url) {
      const page = await fetch(htmlUrl, { redirect: 'follow', headers: HEADERS });
      const html = page.ok ? await page.text() : '';
      const titleTag = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || null;
      trace.push({ step: 'html', url: htmlUrl, status: page.status, finalUrl: page.url, titleTag });
      const fromTitle = nameFromHtml(html);
      if (fromTitle) return res.status(200).json(debug ? { name: fromTitle, trace } : { name: fromTitle });
    }
  } catch (err) {
    trace.push({ step: 'error', message: String(err && err.message || err) });
  }
  return res.status(200).json(debug ? { name: null, trace } : { name: null });
}
