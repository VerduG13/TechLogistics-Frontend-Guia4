// Este script utiliza funciones globales definidas en api.js, router.js y ui.js.
// Por lo tanto, no importamos módulos; todas las funciones están disponibles en window.

const user = requireRole('ADMIN');
if (!user) {
  // Redirige
} else {
  const inventoryBody = document.querySelector('#inventoryTable tbody');
  const couriersBody = document.querySelector('#couriersTable tbody');
  const confirmedBody = document.querySelector('#adminConfirmedTable tbody');
  const pendingBody = document.querySelector('#adminPendingTable tbody');
  const assignedBody = document.querySelector('#adminAssignedTable tbody');
  const logoutBtn = document.getElementById('logoutBtn');

  // botones para crear elementos
  const newProductBtn = document.getElementById('newProductBtn');
  const newCourierBtn = document.getElementById('newCourierBtn');

  logoutBtn.addEventListener('click', () => logout());

  newProductBtn.addEventListener('click', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>Nuevo producto</h3>
      <div class="field"><label>Código</label><input type="text" id="pCode" required /></div>
      <div class="field"><label>Nombre</label><input type="text" id="pName" required /></div>
      <div class="field"><label>Descripción</label><input type="text" id="pDesc" /></div>
      <div class="field"><label>Precio (COP)</label><input type="number" step="0.01" min="0" id="pPrice" required /></div>
      <div class="field"><label>Stock inicial</label><input type="number" min="0" id="pStock" required /></div>
      <div class="footer actions"><button type="button" id="cancelBtn">Cancelar</button><button type="submit">Crear</button></div>
    `;
    const close = openModal(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dto = {
        id: null,
        code: document.getElementById('pCode').value.trim(),
        name: document.getElementById('pName').value.trim(),
        description: document.getElementById('pDesc').value.trim(),
        price: parseFloat(document.getElementById('pPrice').value),
        stock: parseInt(document.getElementById('pStock').value, 10)
      };
      try {
        await createProduct(dto);
        showToast('Producto creado');
        closeModal();
        loadProducts();
      } catch (err) {
        showToast(err.message || 'Error al crear', 4000);
      }
    });
    form.querySelector('#cancelBtn').addEventListener('click', () => closeModal());
  });

  newCourierBtn.addEventListener('click', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>Nuevo transportista</h3>
      <div class="field"><label>Nombre</label><input type="text" id="cName" required /></div>
      <div class="field"><label>Correo</label><input type="email" id="cEmail" required /></div>
      <div class="field"><label>Teléfono</label><input type="text" id="cPhone" required /></div>
      <div class="field"><label>Contraseña inicial</label><input type="text" id="cPwd" value="TechLogi1!" required /></div>
      <div class="footer actions"><button type="button" id="cancelCourier">Cancelar</button><button type="submit">Crear</button></div>
    `;
    const close = openModal(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dto = {
        name: document.getElementById('cName').value.trim(),
        email: document.getElementById('cEmail').value.trim(),
        phoneNumber: document.getElementById('cPhone').value.trim()
      };
      const password = document.getElementById('cPwd').value;
      try {
        await registerCourier(dto, password);
        showToast('Transportista creado');
        closeModal();
        loadCouriers();
      } catch (err) {
        showToast(err.message || 'Error al crear transportista', 4000);
      }
    });
    form.querySelector('#cancelCourier').addEventListener('click', () => closeModal());
  });

  // carga datos
  loadProducts();
  loadCouriers();
  loadOrders();

  async function loadProducts() {
    try {
      const list = await getProducts();
      inventoryBody.innerHTML = '';
      list.forEach((p) => {
        const tr = document.createElement('tr');
        const price = Number(p.price).toLocaleString();
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.code}</td>
          <td>${p.name}</td>
          <td>${p.description || ''}</td>
          <td>$${price}</td>
          <td>${p.stock}</td>
        `;
        // celda de modificación de stock
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.value = 0;
        input.style.width = '80px';
        const btn = document.createElement('button');
        btn.textContent = 'Aplicar';
        btn.addEventListener('click', async () => {
          const delta = parseInt(input.value, 10);
          if (!delta) return;
          try {
            await adjustProductStock(p.id, delta);
            showToast('Stock actualizado');
            loadProducts();
          } catch (err) {
            showToast(err.message || 'Error al actualizar', 4000);
          }
        });
        td.appendChild(input);
        td.appendChild(btn);
        tr.appendChild(td);
        inventoryBody.appendChild(tr);
      });
    } catch (err) {
      showToast('Error al cargar productos');
    }
  }

  async function loadCouriers() {
    try {
      const list = await getCouriers();
      couriersBody.innerHTML = '';
      list.forEach((c) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.id}</td>
          <td>${c.name}</td>
          <td>${c.email}</td>
          <td>${c.phoneNumber}</td>
        `;
        couriersBody.appendChild(tr);
      });
    } catch (err) {
      showToast('Error al cargar transportistas');
    }
  }

  async function loadOrders() {
    try {
      // confirmadas sin asignar
      const conf = await getConfirmedOrders();
      confirmedBody.innerHTML = '';
      const unassigned = conf.filter((o) => !o.delivery);
      if (unassigned.length === 0) {
        confirmedBody.innerHTML = '<tr><td colspan="5">No hay órdenes confirmadas sin asignar.</td></tr>';
      } else {
        unassigned.forEach((o) => {
          const total = o.total ? Number(o.total).toLocaleString() : '-';
          const tr = document.createElement('tr');
          const actionsTd = document.createElement('td');
          tr.innerHTML = `
            <td>${o.code}</td>
            <td>${o.client.email}</td>
            <td>${o.address}</td>
            <td>$${total}</td>
          `;
          tr.appendChild(actionsTd);
          confirmedBody.appendChild(tr);
        });
      }
      // Creadas sin confirmar
      const created = await getPendingOrders();
      pendingBody.innerHTML = '';
      const pending = created.filter((o) => !o.delivery);
      if (pending.length === 0) {
        pendingBody.innerHTML = '<tr><td colspan="5">No hay órdenes confirmadas sin asignar.</td></tr>';
      } else {
        pending.forEach((o) => {
          const total = o.total ? Number(o.total).toLocaleString() : '-';
          const tr = document.createElement('tr');
          const actionsTd = document.createElement('td');
          // permitir cancelación de admin en estado CREADA
          const btnCancel = document.createElement('button');
          btnCancel.textContent = 'Cancelar';
          btnCancel.addEventListener('click', async () => {
            try {
              await cancelOrder(o.id, user.id);
              showToast('Orden cancelada');
              loadOrders();
            } catch (err) {
              showToast(err.message || 'Error al cancelar', 4000);
            }
          });
          actionsTd.appendChild(btnCancel);
          tr.innerHTML = `
            <td>${o.code}</td>
            <td>${o.client.email}</td>
            <td>${o.address}</td>
            <td>$${total}</td>
          `;
          tr.appendChild(actionsTd);
          pendingBody.appendChild(tr);
        });
      }
      // Asignadas a transportistas
      assignedBody.innerHTML = '';
      const couriers = await getCouriers();
      // para cada transportista obtenemos sus órdenes
      for (const c of couriers) {
        const list = await getCourierOrders(c.id);
        list.forEach((o) => {
          const tr = document.createElement('tr');
          const total = o.total ? Number(o.total).toLocaleString() : '-';
          tr.innerHTML = `
            <td>${o.code}</td>
            <td>${o.client.email}</td>
            <td>${c.email}</td>
            <td>${o.address}</td>
            <td>${o.status}</td>
            <td>$${total}</td>
          `;
          assignedBody.appendChild(tr);
        });
      }
    } catch (err) {
      showToast('Error al cargar órdenes');
    }
  }
  
  function closeModal() {
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
  }
  
}