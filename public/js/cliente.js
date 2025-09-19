// cliente.js — flujo en 2 pasos: Crear orden (CREADA) → Confirmar (con carrito)
// Requiere funciones globales ya definidas en api.js, router.js y ui.js:
// getProducts, getOrdersByClient, createOrder, confirmOrder, cancelOrder, getOrder
// requireRole, showToast, openModal, closeModal, logout

const user = requireRole('CLIENTE');
if (!user) {
  // requireRole hace la redirección si no cumple
} else {
  // ====== Referencias DOM ======
  const productsTableBody = document.querySelector('#productsBody');
  const cartBody          = document.querySelector('#cartBody');
  const cartTotalEl       = document.querySelector('#cartTotal');
  const btnNuevaOrden     = document.querySelector('#btnNuevaOrden');
  const ordersBody        = document.querySelector('#ordersBody');
  const logoutBtn         = document.querySelector('#logoutBtn');

  // ====== Estado del carrito ======
  const cart = new Map(); // key: productId, value: { product, qty }

  // ====== Utilidades ======
  function fmtMoney(n){ return '$' + Number(n ?? 0).toLocaleString(); }
  function fmtDate(d){ return d ? new Date(d).toLocaleString() : ''; }

  function renderProducts(list) {
    productsTableBody.innerHTML = '';
    list.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.code}</td>
        <td>${p.name ?? ''}</td>
        <td>${p.description ?? ''}</td>
        <td>${p.stock}</td>
        <td>${fmtMoney(p.price)}</td>
        <td><button data-add="${p.id}">Agregar</button></td>
      `;
      productsTableBody.appendChild(tr);
    });

    productsTableBody.querySelectorAll('button[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-add'));
        const prod = list.find(x => x.id === id);
        if (!prod) return;
        const current = cart.get(id) || { product: prod, qty: 0 };
        current.qty += 1;
        cart.set(id, current);
        renderCart();
      });
    });
  }

  function renderCart() {
    cartBody.innerHTML = '';
    let total = 0;
    for (const { product, qty } of cart.values()) {
      const sub = Number(product.price) * qty;
      total += sub;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.code}</td>
        <td>${product.name ?? ''}</td>
        <td style="text-align:right">${qty}</td>
        <td style="text-align:right">${fmtMoney(product.price)}</td>
        <td style="text-align:right">${fmtMoney(sub)}</td>
        <td>
          <button data-plus="${product.id}">+</button>
          <button data-minus="${product.id}">-</button>
          <button data-remove="${product.id}">Quitar</button>
        </td>
      `;
      cartBody.appendChild(tr);
    }
    cartTotalEl.textContent = fmtMoney(total);

    cartBody.querySelectorAll('button[data-plus]').forEach(b => {
      b.addEventListener('click', () => {
        const id = Number(b.getAttribute('data-plus'));
        const row = cart.get(id); if (!row) return;
        row.qty += 1; renderCart();
      });
    });
    cartBody.querySelectorAll('button[data-minus]').forEach(b => {
      b.addEventListener('click', () => {
        const id = Number(b.getAttribute('data-minus'));
        const row = cart.get(id); if (!row) return;
        row.qty = Math.max(1, row.qty - 1); renderCart();
      });
    });
    cartBody.querySelectorAll('button[data-remove]').forEach(b => {
      b.addEventListener('click', () => {
        const id = Number(b.getAttribute('data-remove'));
        cart.delete(id); renderCart();
      });
    });
  }

  function itemsFromCart() {
    return Array.from(cart.values()).map(({ product, qty }) => ({
      productId: product.id,
      qty
    }));
  }

  async function loadProducts() {
    try {
      const products = await getProducts();
      renderProducts(products);
    } catch (e) {
      console.error(e);
      showToast('No se pudieron cargar los productos');
    }
  }

  async function loadOrders() {
    try {
      const orders = await getOrdersByClient(user.id);
      renderOrders(orders);
    } catch (e) {
      console.error(e);
      showToast('No se pudieron cargar tus órdenes');
    }
  }

  function renderOrders(orders) {
    ordersBody.innerHTML = '';
    orders.forEach(o => {
      const isCreada = o.status === 'CREADA';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${o.code}</td>
        <td><strong>${o.status}</strong></td>
        <td>${o.address ?? ''}</td>
        <td>${fmtDate(o.confirmationDate)}</td>
        <td>
          ${isCreada ? `
            <button data-confirm="${o.id}">Confirmar (con carrito)</button>
            <button data-cancel="${o.id}" class="danger">Cancelar</button>
          ` : `
            <button data-view="${o.id}">Ver</button>
          `}
        </td>
      `;
      ordersBody.appendChild(tr);
    });

    // Confirmar con carrito
    ordersBody.querySelectorAll('button[data-confirm]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const orderId = Number(btn.getAttribute('data-confirm'));
        const items = itemsFromCart();
        if (!items.length) {
          showToast('Tu carrito está vacío');
          return;
        }
        try {
          await confirmOrder(user.id, orderId, items);
          showToast('Orden confirmada');
          cart.clear();
          renderCart();
          await loadOrders();
        } catch (e) {
          console.error(e);
          showToast('No fue posible confirmar la orden');
        }
      });
    });

    // Cancelar si está CREADA
    ordersBody.querySelectorAll('button[data-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const orderId = Number(btn.getAttribute('data-cancel'));
        if (!confirm('¿Cancelar esta orden?')) return;
        try {
          await cancelOrder(orderId, user.id);
          showToast('Orden cancelada');
          await loadOrders();
        } catch (e) {
          console.error(e);
          showToast('No fue posible cancelar (verifica que esté CREADA)');
        }
      });
    });

    // Ver detalle (modal)
    ordersBody.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-view'));
        showOrderModal(id);
      });
    });
  }

  // ====== Modal de detalle de orden ======
  async function showOrderModal(orderId){
    try{
      const o = await getOrder(orderId); // GET /api/orders/{id}

      const rows = (o.items && o.items.length)
        ? o.items.map(it => `
            <tr>
              <td>${it.productCode ?? ''}</td>
              <td>${it.productName ?? ''}</td>
              <td style="text-align:right">${it.qty}</td>
              <td style="text-align:right">${fmtMoney(it.unitPrice)}</td>
              <td style="text-align:right">${fmtMoney(it.subtotal)}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="5" style="text-align:center;color:#64748b">Sin productos</td></tr>`;

      const html = `
        <h3 style="margin-top:0">Detalle de Orden</h3>
        <div class="grid-3" style="margin-bottom:8px">
          <div><strong>Código:</strong> ${o.code}</div>
          <div><strong>Estado:</strong> ${o.status}</div>
          <div><strong>Cliente:</strong> ${o.client?.email ?? ''}</div>
        </div>
        <div class="grid-3" style="margin-bottom:12px">
          <div><strong>Dirección:</strong> ${o.address ?? ''}</div>
          <div><strong>Confirmación:</strong> ${fmtDate(o.confirmationDate)}</div>
          <div><strong>Transportista:</strong> ${o.delivery?.courierEmail ?? '—'}</div>
        </div>

        <div class="table-wrap" style="max-height:300px">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th style="text-align:right">Cant.</th>
                <th style="text-align:right">Precio</th>
                <th style="text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right"><strong>Total</strong></td>
                <td style="text-align:right"><strong>${fmtMoney(o.total)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="footer" style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px">
          <button id="btnCloseDetail">Cerrar</button>
        </div>
      `;

      openModal(html);
      document.getElementById('btnCloseDetail')?.addEventListener('click', closeModal);
    }catch(e){
      console.error(e);
      showToast('No se pudo cargar el detalle de la orden');
    }
  }
  
  function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) backdrop.classList.add('hidden');
}


  // ====== Crear nueva orden (estado CREADA) ======
  btnNuevaOrden?.addEventListener('click', async () => {
    const address = prompt('Ingresa la dirección de entrega para esta orden:');
    if (!address || !address.trim()) return;
    try {
      await createOrder(user.id, address.trim());
      showToast('Orden creada. Ahora puedes cancelarla o confirmarla con tu carrito.');
      await loadOrders();
    } catch (e) {
      console.error(e);
      showToast('No fue posible crear la orden');
    }
  });

  // Logout
  logoutBtn?.addEventListener('click', () => {
    logout();
  });

  // ====== Inicio ======
  loadProducts();
  loadOrders();
}
