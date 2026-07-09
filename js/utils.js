/**
 * Truncate filename for captions, excluding extension.
 * @param {string} name 
 * @param {number} maxChars 
 * @returns {string}
 */
export function truncateName(name, maxChars) {
  if (!name) return '';
  const noExt = name.replace(/\.[^.]+$/, '');
  if (noExt.length <= maxChars) return noExt;
  if (maxChars <= 3) return name.substring(0, maxChars);
  return noExt.substring(0, maxChars - 3) + '...';
}

/**
 * Escape HTML special characters.
 * @param {string} str 
 * @returns {string}
 */
export function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * Generate the inner HTML (icon + label) for the contextual delete/clear document button.
 * @param {boolean} isDelete true → trash icon + "Eliminar Documento", false → refresh icon + "Limpiar Documento"
 * @returns {string}
 */
export function deleteButtonInnerHtml(isDelete) {
  if (isDelete) {
    return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Eliminar Documento';
  }
  return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Limpiar Documento';
}

/**
 * Show a toast notification using modern Popover API.
 * @param {string} message 
 * @param {'info'|'success'|'warning'|'error'} type 
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.setAttribute('popover', 'manual');
  toast.className = `toast toast-${type}`;

  const textNode = document.createElement('span');
  textNode.className = 'toast-text';
  textNode.textContent = message;
  toast.appendChild(textNode);

  const closeButton = document.createElement('button');
  closeButton.className = 'toast-close';
  closeButton.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeButton.onclick = () => {
    try {
      toast.hidePopover();
    } catch (err) {
      toast.style.display = 'none';
    }
    toast.remove();
  };
  toast.appendChild(closeButton);

  container.appendChild(toast);

  try {
    toast.showPopover();
  } catch (err) {
    // Fallback if Popover API is not supported in the environment/browser
    toast.style.display = 'flex';
  }

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      try {
        toast.hidePopover();
      } catch (err) {
        toast.style.display = 'none';
      }
      toast.remove();
    }
  }, 4000);
}
