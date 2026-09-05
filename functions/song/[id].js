// functions/song/[id].js
//
// Handles requests to  /song/:id

import { SITE_URL, API_BASE_URL } from '../_shared/config.js';

export async function onRequest(context) {
  const rawId = context.params.id;
  const id = safeDecode_(rawId);
  const hashUrl = SITE_URL + '/#/lyric-' + encodeURIComponent(id);
  const shareUrl = SITE_URL + '/song/' + encodeURIComponent(id);

  let title = 'Nerdcore Archive';
  let description = "BritishJuggernaut's Nerdcore Archive";
  let image = '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(API_BASE_URL + '?action=lyrics', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (resp.ok) {
      const list = await resp.json();
      let post = Array.isArray(list) ? list.find(function (p) { return String(p.id) === String(id); }) : null;

      // Alternate-version rows ("(Sped Up)", "[Remix]", etc.) redirect to
      // their main song for lyrics content -- use the main song's data
      // for the embed too, so a variant's share link doesn't show a blank
      // card just because the variant row itself is thin on data.
      if (post && post.isVariant && post.mainId) {
        const main = list.find(function (p) { return String(p.id) === String(post.mainId); });
        if (main) post = main;
      }

      if (post && !post.isLocked && post.title) {
        title = post.artist ? (post.title + ' — ' + post.artist) : post.title;
        description = post.artist
          ? ('Lyrics for "' + post.title + '" by ' + post.artist + ' on Nerdcore Archive.')
          : ('Lyrics for "' + post.title + '" on Nerdcore Archive.');
        if (post.featured && !isBlankish_(post.featured)) description += ' Feat. ' + post.featured + '.';
        if (post.franchise && !isBlankish_(post.franchise)) description += ' Franchise: ' + post.franchise + '.';
        image = optimizeArt_(post.cover || '');
      }
    }
  } catch (err) {
    // Fall back to the generic site card below rather than failing the request.
  }

  const found = title !== 'Nerdcore Archive';
  return new Response(buildEmbedHtml_(title, description, image, shareUrl, hashUrl, 'music.song'), {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': found ? 'public, max-age=300' : 'no-store'
    }
  });
}

function safeDecode_(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
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
