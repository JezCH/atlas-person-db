(() => {
  "use strict";

  function syncDetailPanelState() {
    const grid = document.querySelector(".content-grid");
    const panel = document.getElementById("detailPanel");
    const content = document.getElementById("detailContent");
    if (!grid || !panel || !content) return;

    const hasSelection = !content.hidden;
    grid.classList.toggle("detail-open", hasSelection);
    panel.hidden = !hasSelection;
  }

  const style = document.createElement("style");
  style.textContent = `
    .content-grid{grid-template-columns:minmax(0,1fr)}
    .content-grid.detail-open{grid-template-columns:minmax(0,1fr) 340px}
    #detailPanel[hidden]{display:none!important}
    @media(max-width:1300px){
      .content-grid.detail-open{grid-template-columns:minmax(0,1fr) 300px}
    }
    @media(max-width:760px){
      .content-grid,.content-grid.detail-open{display:flex;grid-template-columns:none}
      #detailPanel[hidden]{display:none!important}
    }
  `;
  document.head.appendChild(style);

  function start() {
    const content = document.getElementById("detailContent");
    if (!content) return;
    syncDetailPanelState();
    new MutationObserver(syncDetailPanelState).observe(content, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
