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
  closeButton.innerHTML = '✕';
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
