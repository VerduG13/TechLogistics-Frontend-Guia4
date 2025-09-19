// Funciones para consumir la API de TechLogistics.
// Todas las llamadas suponen que el backend se ejecuta en localhost:8080

const API_BASE = "http://localhost:8080/api";

/**
 * Constructor genérico de peticiones. Gestiona query params, body y parseo de respuesta.
 * @param {string} path Ruta relativa al API_BASE.
 * @param {object} opts
 * @param {string} opts.method Método HTTP (GET, POST, etc.).
 * @param {object|null} opts.body Objeto a enviar como JSON en el cuerpo.
 * @param {object|null} opts.params Objeto de parámetros de consulta.
 * @returns {Promise<any|null>} Respuesta JSON o null para códigos 204.
 */
async function request(path, { method = 'GET', body = null, params = null } = {}) {
  let url = `${API_BASE}${path}`;
  // añadir parámetros de consulta
  if (params && typeof params === 'object') {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        search.append(key, value);
      }
    }
    const qs = search.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status}`);
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

// -------- Autenticación y usuarios --------

/**
 * Registra un nuevo cliente. El rol se fija a CLIENTE.
 * @param {object} data { name, email, phoneNumber }
 * @param {string} password
 */
async function registerClient(data, password) {
  return await request('/users/register', {
    method: 'POST',
    params: { password },
    body: {
      id: null,
      email: data.email,
      role: 'CLIENTE',
      phoneNumber: data.phoneNumber,
      name: data.name
    }
  });
}

/**
 * Registra un nuevo transportista. Para uso de administrador.
 * @param {object} data { name, email, phoneNumber }
 * @param {string} password Contraseña inicial
 */
async function registerCourier(data, password) {
  return await request('/users/register', {
    method: 'POST',
    params: { password },
    body: {
      id: null,
      email: data.email,
      role: 'TRANSPORTISTA',
      phoneNumber: data.phoneNumber,
      name: data.name
    }
  });
}

/**
 * Inicia sesión con email y contraseña. Devuelve UserDTO.
 */
async function login(email, password) {
  return await request('/users/login', {
    method: 'POST',
    params: { email, password }
  });
}

/**
 * Actualiza datos de usuario. Para uso interno (perfil, admin).
 */
async function updateUser(id, dto) {
  return await request(`/users/${id}`, {
    method: 'PUT',
    body: dto
  });
}

/**
 * Cambia la contraseña de un usuario.
 */
async function changePassword(id, newPassword) {
  return await request(`/users/${id}/password`, {
    method: 'PATCH',
    params: { newPassword }
  });
}

/**
 * Obtiene todos los usuarios.
 */
async function getUsers() {
  return await request('/users');
}

/**
 * Obtiene la lista de transportistas.
 */
async function getCouriers() {
  return await request('/users/couriers');
}

// -------- Productos --------

async function createProduct(dto) {
  return await request('/products', {
    method: 'POST',
    body: dto
  });
}

async function getProducts() {
  return await request('/products');
}

async function getProductByCode(code) {
  return await request(`/products/${code}`);
}

async function adjustProductStock(id, delta) {
  // Este endpoint no retorna cuerpo (204), así que no devolvemos nada.
  return await request(`/products/${id}/stock`, {
    method: 'PATCH',
    params: { delta }
  });
}

// -------- Órdenes --------

/**
 * Crea una nueva orden en estado CREADA y devuelve OrderDTO.
 */
async function createOrder(clientId, address) {
  return await request('/orders/create', {
    method: 'POST',
    params: { clientId, address }
  });
}

/**
 * Confirma una orden existente. items debe ser arreglo de { productId, qty }.
 */
async function confirmOrder(clientId, orderId, items) {
  return await request('/orders/confirm', {
    method: 'POST',
    params: { clientId, orderId },
    body: items
  });
}

async function getOrder(id) {
  return await request(`/orders/${id}`);
}

async function getOrderByCode(code) {
  return await request(`/orders/code/${code}`);
}

async function getOrdersByClient(clientId) {
  return await request(`/orders/client/${clientId}`);
}

async function getConfirmedOrders() {
  return await request('/orders/confirmed');
}

async function getPendingOrders() {
  return await request('/orders/pending');
}

async function cancelOrder(orderId, clientId) {
  return await request(`/orders/${orderId}/cancel`, {
    method: 'POST',
    params: { clientId }
  });
}

// -------- Entregas --------

async function assignDelivery(orderId, courierId) {
  return await request('/deliveries/assign', {
    method: 'POST',
    params: { orderId, courierId }
  });
}

async function markDeliveryAsDelivered(deliveryId) {
  return await request(`/deliveries/${deliveryId}/delivered`, {
    method: 'POST'
  });
}

async function getCourierOrders(courierId) {
  return await request(`/deliveries/orders/${courierId}`);
}

// -------- Sesión local --------

const AUTH_KEY = 'auth';

function getAuth() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setAuth(user) {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

/**
 * Limpia la sesión y redirige a index.
 */
function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

// Exponer funciones en el objeto global para acceso sin ES modules
window.request = request;
window.registerClient = registerClient;
window.registerCourier = registerCourier;
window.login = login;
window.updateUser = updateUser;
window.changePassword = changePassword;
window.getUsers = getUsers;
window.getCouriers = getCouriers;
window.createProduct = createProduct;
window.getProducts = getProducts;
window.getProductByCode = getProductByCode;
window.adjustProductStock = adjustProductStock;
window.createOrder = createOrder;
window.confirmOrder = confirmOrder;
window.getOrder = getOrder;
window.getOrderByCode = getOrderByCode;
window.getOrdersByClient = getOrdersByClient;
window.getConfirmedOrders = getConfirmedOrders;
window.getPendingOrders = getPendingOrders;
window.cancelOrder = cancelOrder;
window.assignDelivery = assignDelivery;
window.markDeliveryAsDelivered = markDeliveryAsDelivered;
window.getCourierOrders = getCourierOrders;
window.getAuth = getAuth;
window.setAuth = setAuth;
window.logout = logout;