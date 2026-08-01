window.ATLAS_CONFIG = {
  SUPABASE_URL: "https://wfrbxltvpmlprgwfysxq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_W2y0WbNhOVj8eWrTWTRqJw_WLregXP0"
};

window.addEventListener("load", () => {
  ["person-locales.js", "status-summary.js"].forEach((file) => {
    const script = document.createElement("script");
    script.src = `./${file}?v=${Date.now()}`;
    script.defer = true;
    document.body.appendChild(script);
  });
});
