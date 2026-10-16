// Splits a heading into word and character spans while keeping its accessible name.
// Layout is unchanged (inline spans), so the WebGL layer can read each character's
// exact position from the DOM, and the DOM fallback can animate the same characters.

export function splitHeading(el) {
  if (el.dataset.split === 'done') return [...el.querySelectorAll('.gl-c')];
  const label = el.innerText.replace(/\s+/g, ' ').trim();
  el.setAttribute('aria-label', label);

  const process = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          fragment.append(document.createTextNode(' '));
          continue;
        }
        const word = document.createElement('span');
        word.className = 'gl-w';
        word.setAttribute('aria-hidden', 'true');
        for (const char of part) {
          const span = document.createElement('span');
          span.className = 'gl-c';
          span.textContent = char;
          word.append(span);
        }
        fragment.append(word);
      }
      node.replaceWith(fragment);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
      [...node.childNodes].forEach(process);
    }
  };

  [...el.childNodes].forEach(process);
  el.dataset.split = 'done';
  return [...el.querySelectorAll('.gl-c')];
}

// Headings that get the scroll-in / scroll-out letter treatment.
export const HEADING_SELECTOR = 'main h1, main h2.h2, main .statement';
