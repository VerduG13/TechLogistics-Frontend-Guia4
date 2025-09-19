// Este script utiliza funciones globales definidas en api.js, router.js y ui.js.
// Por lo tanto, no importamos módulos; todas las funciones están disponibles en window.

const user = requireRole('TRANSPORTISTA');
if (!user) {
  // Redirigido por requireRole
} else {
  const confirmedBody = document.querySelector('#confirmedTable tbody');
  const deliveriesBody = document.querySelector('#deliveriesTable tbody');
  const logoutBtn = document.getElementById('logoutBtn');

  logoutBtn.addEventListener('click', () => logout());

  loadConfirmed();
  loadDeliveries();

  async function loadConfirmed() {
    try {
      const orders = await getConfirmedOrders();
      confirmedBody.innerHTML = '';
      const available = orders.filter((o) => !o.delivery);
      if (available.length === 0) {
        confirmedBody.innerHTML = '<tr><td colspan="5">No hay órdenes confirmadas sin asignar.</td></tr>';
        return;
      }
      available.forEach((o) => {
        const tr = document.createElement('tr');
        const total = o.total ? Number(o.total).toLocaleString() : '-';
        tr.innerHTML = `
          <td>${o.code}</td>
          <td>${o.client.email}</td>
          <td>${o.address}</td>
          <td>$${total}</td>
          <td><button>Tomar</button></td>
        `;
        tr.querySelector('button').addEventListener('click', async () => {
          try {
            await assignDelivery(o.id, user.id);
            showToast('Orden asignada');
            loadConfirmed();
            loadDeliveries();
          } catch (err) {
            showToast(err.message || 'No se pudo asignar', 4000);
          }
        });
        confirmedBody.appendChild(tr);
      });
    } catch (err) {
      showToast('Error al cargar órdenes confirmadas');
    }
  }

  async function loadDeliveries() {
    try {
      const orders = await getCourierOrders(user.id);
      deliveriesBody.innerHTML = '';
      if (!orders || orders.length === 0) {
        deliveriesBody.innerHTML = '<tr><td colspan="5">No tienes entregas asignadas.</td></tr>';
        return;
      }
      orders.forEach((o) => {
        const tr = document.createElement('tr');
        const actionTd = document.createElement('td');
        // Si orden está en camino, mostrar botón para marcar como entregada
        if (o.status === 'EN_CAMINO' && o.delivery && o.delivery.id) {
          const btn = document.createElement('button');
          btn.textContent = 'Marcar entregada';
          btn.addEventListener('click', async () => {
            try {
              await markDeliveryAsDelivered(o.delivery.id);
              showToast('Entrega marcada');
              loadDeliveries();
            } catch (err) {
              showToast(err.message || 'No se pudo entregar', 4000);
            }
          });
          actionTd.appendChild(btn);
        } else {
          actionTd.textContent = '-';
        }
        tr.innerHTML = `
          <td>${o.code}</td>
          <td>${o.client.email}</td>
          <td>${o.address}</td>
          <td>${o.status}</td>
        `;
        tr.appendChild(actionTd);
        deliveriesBody.appendChild(tr);
      });
    } catch (err) {
      showToast('Error al cargar tus entregas');
    }
  }
}