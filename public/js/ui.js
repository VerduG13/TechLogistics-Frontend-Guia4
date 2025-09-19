// Módulo de utilidades de interfaz: toasts, modals y tema.

// Toasts
const toastEl = document.getElementById('toast');

/**
 * Muestra un mensaje toast temporal.
 * @param {string} message
 * @param {number} duration Milisegundos (default 3000)
 */
function showToast(message, duration = 3000) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

// Modals
const modalContainer = document.getElementById('modalContainer');

/**
 * Abre un modal con contenido arbitrario. Devuelve una función para cerrarlo.
 * @param {string|Node} content
 */
function openModal(htmlOrNode) {
  const backdrop = document.getElementById('modalBackdrop');
  const content  = document.getElementById('modalContent');
  if (!backdrop || !content) {
    console.warn('Modal containers not found');
    return;
  }

  // Limpia el contenido anterior
  content.innerHTML = '';

  // Si te pasan un Node (HTMLElement), se inserta con appendChild.
  // Si te pasan una cadena (HTML), se asigna con innerHTML.
  if (htmlOrNode instanceof Element) {
    content.appendChild(htmlOrNode);
  } else {
    content.innerHTML = String(htmlOrNode ?? '');
  }

  backdrop.classList.remove('hidden');
}


// Tema oscuro / claro
const THEME_KEY = 'theme';
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') {
    document.body.classList.add('dark');
    updateToggleIcon(true);
  }
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      updateToggleIcon(isDark);
    });
  }
}

function updateToggleIcon(isDark) {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;
  toggleBtn.textContent = isDark ? '☀️' : '🌙';
  toggleBtn.setAttribute('aria-label', isDark ? 'Modo claro' : 'Modo oscuro');
}

// Exponer utilidades en el objeto global
window.showToast = showToast;
window.openModal = openModal;
window.initTheme = initTheme;

// Inicializa tema al cargar el script
initTheme();