// Lightweight, professional toast notification.
// Avoids the browser's native alert() which shows the unprofessional "localhost says" prefix.
export function notify(message, type = 'info') {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.style.cssText =
      'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(container);
  }

  const colors = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#4f46e5' };
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText =
    `pointer-events:auto;min-width:240px;max-width:360px;background:#ffffff;color:#0f172a;` +
    `border-left:4px solid ${colors[type] || colors.info};box-shadow:0 8px 24px rgba(0,0,0,0.12);` +
    `border-radius:10px;padding:12px 16px;font-size:14px;font-weight:500;font-family:inherit;` +
    `opacity:0;transform:translateX(20px);transition:all .25s ease;`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}
