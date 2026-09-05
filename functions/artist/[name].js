// functions/artist/[name].js
//
// Handles requests to  /artist/:name
//
// Same idea as functions/song/[id].js -- see the comment block there for
// why this needs to be a real, crawlable path rather than a "#/artist-..."
// hash link. This one looks the artist up by name and embeds their photo,
// name, and a short blurb, then redirects real visitors into the SPA.
//
// Share THIS link ( /artist/Some%20Artist ), not #/artist-Some%20Artist.

const SITE_URL = 'https://nerdcore-archive.pages.dev';
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwCQAbSTBwiHTJCyDRZlSd0e4DGUGK4gG-3seRRHPjjyYjRTLj2Lbb4pVTl2-WdsLPe/exec';

export async function onRequest(context) {
  const rawName = context.params.name;
  const name = safeDecode_(rawName);
  const hashUrl = SITE_URL + '/#/artist-' + encodeURIComponent(name);
  const shareUrl = SITE_URL + '/artist/' + encodeURIComponent(name);

  let title = name || 'Nerdcore Archive';
  let description = name
    ? ('Songs, releases, and info for ' + name + ' on Nerdcore Archive.')
    : "BritishJuggernaut's Unofficial Nerdcore Site";
  let image = '';

  try {
    const resp = await fetch(API_BASE_URL + '?action=artists');
    if (resp.ok) {
      const list = await resp.json();
      const key = normKey_(name);
      const match = Array.isArray(list) ? list.find(function (a) { return normKey_(a.artist) === key; }) : null;
      if (match) {
        title = match.artist;
        description = 'Songs, releases, and info for ' + match.artist + ' on Nerdcore Archive.';
        image = optimizeArt_(match.pfpCached || match.pfp || '');
      }
    }
  } catch (err) {
    // Fall back to the generic card below.
  }

  return new Response(buildEmbedHtml_(title, description, image, shareUrl, hashUrl, 'profile'), {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=300'
    }
  });
}

function safeDecode_(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

function normKey_(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
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
