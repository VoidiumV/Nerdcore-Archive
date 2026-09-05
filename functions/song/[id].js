// functions/song/[id].js
//
// Handles requests to  /song/:id

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(API_BASE_URL + '?action=lyricMeta&id=' + encodeURIComponent(id), {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
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
