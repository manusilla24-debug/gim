/* Antes del primer pintado: fija el tema guardado y decide qué pantalla se ve,
   para que no haya destello ni salto entre el selector de atleta y el registro. */
(function () {
  var root = document.documentElement;
  var view = 'gate';
  try {
    var theme = localStorage.getItem('gim.theme');
    if (theme === 'dark' || theme === 'light') root.dataset.theme = theme;

    // Dentro de la misma pestaña no se vuelve a pedir el atleta: recargar a
    // media sesión no debe echarte fuera.
    var open = sessionStorage.getItem('gim.session');
    if (open) {
      var raw = localStorage.getItem('gim.v3');
      if (raw && JSON.parse(raw).users.some(function (u) { return u.id === open; })) view = 'app';
    }
  } catch (e) { /* almacenamiento bloqueado: se empieza por el selector */ }
  root.dataset.view = view;
})();
