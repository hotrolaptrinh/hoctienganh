const ATTR_REGEX = /(\w+)="([^"]*)"|(\w+)=([^\s]+)/g;

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderMarkdownBasic(markdown = '') {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let inList = false;
  let inQuote = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      closeQuote();
      continue;
    }

    if (line.startsWith('>')) {
      if (!inQuote) {
        closeList();
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(`<p>${formatInline(escapeHtml(line.replace(/^>\s?/, '')))}</p>`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        closeQuote();
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${formatInline(escapeHtml(line.slice(2).trim()))}</li>`);
      continue;
    }

    closeList();
    closeQuote();

    if (line.startsWith('### ')) {
      html.push(`<h3>${formatInline(escapeHtml(line.slice(4).trim()))}</h3>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${formatInline(escapeHtml(line.slice(3).trim()))}</h2>`);
    } else if (line.startsWith('# ')) {
      html.push(`<h1>${formatInline(escapeHtml(line.slice(2).trim()))}</h1>`);
    } else {
      html.push(`<p>${formatInline(escapeHtml(line.trim()))}</p>`);
    }
  }

  closeList();
  closeQuote();

  return html.join('\n');
}

function parseAttributes(input = '') {
  const attrs = {};
  let match;
  while ((match = ATTR_REGEX.exec(input)) !== null) {
    if (match[1]) {
      attrs[match[1]] = match[2];
    } else if (match[3]) {
      attrs[match[3]] = match[4];
    }
  }
  ATTR_REGEX.lastIndex = 0;
  return attrs;
}

function renderCallouts(markdown) {
  const pattern = /:::callout([^\n]*)\n([\s\S]*?):::\s*/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    result += renderMarkdownBasic(markdown.slice(lastIndex, match.index));
    const attrs = parseAttributes(match[1] || '');
    const color = attrs.color || 'blue';
    const label = attrs.label ? escapeHtml(attrs.label) : '';
    const note = attrs.note ? escapeHtml(attrs.note) : '';
    const body = renderMarkdownBasic(match[2].trim());
    result += `
      <div class="grammar-callout" data-color="${escapeHtml(color)}">
        ${label ? `<div class="callout-title"><h3>${label}</h3></div>` : ''}
        <div class="callout-body markdown">${body}</div>
        ${note ? `<button class="note-toggle" type="button" aria-expanded="false">Chú thích</button>` : ''}
        ${note ? `<div class="note-content"><p>${formatInline(note)}</p></div>` : ''}
      </div>
    `;
    lastIndex = pattern.lastIndex;
  }

  result += renderMarkdownBasic(markdown.slice(lastIndex));
  return result;
}

export function renderMarkdown(markdown = '') {
  if (!markdown) return '';
  return renderCallouts(markdown);
}
