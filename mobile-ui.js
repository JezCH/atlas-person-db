(() => {
  "use strict";

  const mq = window.matchMedia("(max-width: 760px)");
  const menuButton = document.getElementById("mobileMenuButton");
  const menuClose = document.getElementById("mobileMenuClose");
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("mobileDrawerBackdrop");
  const dataBody = document.getElementById("dataBody");

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

  dataBody?.addEventListener("click", (event) => {
    if (!mq.matches || event.target.closest("button[data-id]")) return;
    const row = event.target.closest("tr[data-id]");
    if (!row) return;

    event.stopImmediatePropagation();
    const wasOpen = row.classList.contains("mobile-expanded");
    dataBody.querySelectorAll("tr.mobile-expanded").forEach((item) => {
      item.classList.remove("mobile-expanded");
      item.setAttribute("aria-expanded", "false");
    });
    if (!wasOpen) {
      row.classList.add("mobile-expanded");
      row.setAttribute("aria-expanded", "true");
    }
  }, true);
})();
