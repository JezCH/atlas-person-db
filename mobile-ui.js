(() => {
  "use strict";

  const mq = window.matchMedia("(max-width: 760px)");
  const menuButton = document.getElementById("mobileMenuButton");
  const menuClose = document.getElementById("mobileMenuClose");
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("mobileDrawerBackdrop");

  function setMenu(open) {
    if (!drawer || !backdrop || !menuButton) return;
    drawer.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    backdrop.hidden = !open;
    drawer.setAttribute("aria-hidden", String(!open));
    menuButton.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("mobile-menu-open", open);
  }

  menuButton?.addEventListener("click", () => setMenu(true));
  menuClose?.addEventListener("click", () => setMenu(false));
  backdrop?.addEventListener("click", () => setMenu(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  mq.addEventListener("change", (event) => {
    if (!event.matches) setMenu(false);
  });

})();
