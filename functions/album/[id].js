// functions/album/[id].js
//
// Handles requests to  /album/:id

import { SITE_URL, API_BASE_URL } from '../_shared/config.js';

export async function onRequest(context) {
  const rawId = context.params.id;
  const id = safeDecode_(rawId);
  const hashUrl = SITE_URL + '/#/album-' + encodeURIComponent(id);
  const shareUrl = SITE_URL + '/album/' + encodeURIComponent(id);

  let title = 'Nerdcore Archive';
  let description = "BritishJuggernaut's Nerdcore Archive";
  let image = '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(API_BASE_URL + '?action=albums', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (resp.ok) {
      const list = await resp.json();
      const key = normKey_(id);
      const match = Array.isArray(list) ? list.find(function (a) { return normKey_(a.id) === key; }) : null;
      if (match) {
        title = match.artist ? (match.title + ' — ' + match.artist) : match.title;
        description = match.artist
          ? ('Tracklist for "' + match.title + '" by ' + match.artist + ' on Nerdcore Archive.')
          : ('Tracklist for "' + match.title + '" on Nerdcore Archive.');
        image = optimizeArt_(match.cover || '');
      }
    }
  } catch (err) {
    // Fall back to the generic card below.
  }

  const found = title !== 'Nerdcore Archive';
  return new Response(buildEmbedHtml_(title, description, image, shareUrl, hashUrl, 'music.album'), {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': found ? 'public, max-age=300' : 'no-store'
    }
  });
}

function safeDecode_(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

function normKey_(s) {
  return String(s || '').trim().toLowerCase();
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
