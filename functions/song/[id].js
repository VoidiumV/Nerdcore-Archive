// functions/song/[id].js
//
// Handles requests to  /song/:id
//
// Link-preview bots (Discord, Twitter/X, Slack, iMessage, etc.) fetch a
// URL's raw HTML and read its <meta property="og:..."> tags. They do NOT
// run JavaScript, and they never see anything after a "#" in a URL
// (fragments are never sent to the server). That's why the site's normal
// "https://nerdcore-archive.pages.dev/#/lyric-10267" links can never embed
// -- the crawler only ever sees "/", with no idea which song it was.
//
// This function gives each song a real, crawlable path. It:
//   1. Looks the song up via the existing Apps Script API.
//   2. Returns a small HTML page stamped with that song's title, artist,
//      and cover art as Open Graph / Twitter Card meta tags.
//   3. Instantly redirects real visitors (via JS, with a <meta
//      http-equiv="refresh"> fallback for anything without JS) into the
//      actual single-page app at "/#/lyric-<id>".
//
// Bots read step 2 and stop there (no JS = no redirect), so they see the
// song-specific embed. Humans get redirected before they'd ever notice.
//
// Share THIS link ( /song/10267 ), not the old #/lyric-10267 one.

const SITE_URL = 'https://nerdcore-archive.pages.dev';
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwCQAbSTBwiHTJCyDRZlSd0e4DGUGK4gG-3seRRHPjjyYjRTLj2Lbb4pVTl2-WdsLPe/exec';

export async function onRequest(context) {
  const id = context.params.id;
  const hashUrl = SITE_URL + '/#/lyric-' + encodeURIComponent(id);
  const shareUrl = SITE_URL + '/song/' + encodeURIComponent(id);

  let title = 'Nerdcore Archive';
  let description = "BritishJuggernaut's Unofficial Nerdcore Site";
  let image = '';

  try {
    const resp = await fetch(API_BASE_URL + '?action=lyric&id=' + encodeURIComponent(id));
    if (resp.ok) {
      const data = await resp.json();
      if (data && !data.error && !data.isLocked && data.title) {
        title = data.artist ? (data.title + ' — ' + data.artist) : data.title;
        description = data.artist
          ? ('Lyrics for "' + data.title + '" by ' + data.artist + ' on Nerdcore Archive.')
          : ('Lyrics for "' + data.title + '" on Nerdcore Archive.');
        if (data.featured && !isBlankish_(data.featured)) description += ' Feat. ' + data.featured + '.';
        if (data.franchise && !isBlankish_(data.franchise)) description += ' Franchise: ' + data.franchise + '.';
        image = optimizeArt_(data.cover || '');
      }
    }
  } catch (err) {
    // Fall back to the generic site card below rather than failing the request.
  }

  return new Response(buildEmbedHtml_(title, description, image, shareUrl, hashUrl, 'music.song'), {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=300'
    }
  });
}

function isBlankish_(val) {
  const s = String(val || '').trim();
  if (!s) return true;
  return /^(n\/?a|tbd|none|-)$/i.test(s);
}

function optimizeArt_(url) {
  if (!url) return '';
  if (/\.mzstatic\.com\//i.test(url)) {
    return url.replace(/\d+x\d+bb\.(jpg|jpeg|png)(\?.*)?$/i, '1200x1200bb.$1$2');
  }
  return url;
}

function esc_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmbedHtml_(title, description, image, shareUrl, hashUrl, ogType) {
  const t = esc_(title);
  const d = esc_(description);
  const u = esc_(shareUrl);
  const h = esc_(hashUrl);

  const imageTags = image
    ? ('<meta property="og:image" content="' + esc_(image) + '">\n' +
       '<meta name="twitter:image" content="' + esc_(image) + '">\n' +
       '<meta name="twitter:card" content="summary_large_image">')
    : '<meta name="twitter:card" content="summary">';

  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8">\n' +
    '<title>' + t + '</title>\n' +
    '<meta name="description" content="' + d + '">\n' +
    '<meta property="og:type" content="' + esc_(ogType || 'website') + '">\n' +
    '<meta property="og:site_name" content="Nerdcore Archive">\n' +
    '<meta property="og:title" content="' + t + '">\n' +
    '<meta property="og:description" content="' + d + '">\n' +
    '<meta property="og:url" content="' + u + '">\n' +
    imageTags + '\n' +
    '<meta name="twitter:title" content="' + t + '">\n' +
    '<meta name="twitter:description" content="' + d + '">\n' +
    '<link rel="canonical" href="' + h + '">\n' +
    '<meta http-equiv="refresh" content="0; url=' + h + '">\n' +
    '<script>window.location.replace(' + JSON.stringify(hashUrl) + ');</script>\n' +
    '</head><body>\n' +
    '<p>Redirecting to <a href="' + h + '">' + t + '</a>&hellip;</p>\n' +
    '</body></html>';
}
