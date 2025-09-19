// Utilidades requeridas: getAuth y logout son funciones globales definidas en api.js

/**
 * Exige que el usuario esté autenticado y tenga alguno de los roles permitidos.
 * Si no lo está, redirige a index.html.
 * @param {...string} roles Roles permitidos (ej: 'CLIENTE').
 * @returns {object|null} El usuario autenticado o null si no cumple.
 */
function requireRole(...roles) {
  const auth = getAuth();
  if (!auth) {
    window.location.href = 'index.html';
    return null;
  }
  if (!roles.includes(auth.role)) {
    // Si no tiene rol adecuado, cerrar sesión
    logout();
    return null;
  }
  return auth;
}

// Exponer requireRole globalmente para evitar módulos
window.requireRole = requireRole;