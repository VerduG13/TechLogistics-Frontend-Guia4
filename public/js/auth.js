// Este script usa funciones globales definidas en api.js y ui.js

// Maneja el envío de los formularios de autenticación
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const changePwdForm = document.getElementById('changePwdForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      const user = await login(email, password);
      setAuth(user);
      showToast('Bienvenido/a');
      // redirigir según rol
      if (user.role === 'CLIENTE') {
        window.location.href = 'cliente.html';
      } else if (user.role === 'TRANSPORTISTA') {
        window.location.href = 'transportista.html';
      } else {
        window.location.href = 'admin.html';
      }
    } catch (err) {
      showToast('Credenciales inválidas', 4000);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phoneNumber = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    try {
      await registerClient({ name, email, phoneNumber }, password);
      showToast('Cuenta creada correctamente');
      // cambiar pestaña a login
      document.querySelectorAll('.tab-btn').forEach((btn) => {
        if (btn.dataset.target === 'loginForm') {
          btn.click();
        }
      });
    } catch (err) {
      showToast(err.message || 'Error al registrar', 4000);
    }
  });
}

if (changePwdForm) {
  changePwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('changeEmail').value.trim();
    const oldPwd = document.getElementById('changeOldPwd').value;
    const newPwd = document.getElementById('changeNewPwd').value;
    try {
      // debemos autenticar para obtener el id del usuario
      const user = await login(email, oldPwd);
      await changePassword(user.id, newPwd);
      showToast('Contraseña actualizada con éxito');
      // volver a login
      document.querySelectorAll('.tab-btn').forEach((btn) => {
        if (btn.dataset.target === 'loginForm') btn.click();
      });
    } catch (err) {
      showToast(err.message || 'Error al cambiar contraseña', 4000);
    }
  });
}

// Si ya hay sesión, redirige automáticamente
const auth = getAuth();
if (auth && window.location.pathname.endsWith('index.html')) {
  if (auth.role === 'CLIENTE') {
    window.location.href = 'cliente.html';
  } else if (auth.role === 'TRANSPORTISTA') {
    window.location.href = 'transportista.html';
  } else {
    window.location.href = 'admin.html';
  }
}