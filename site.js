(function () {
  "use strict";
  const namespace = "alexvonderluft_site";
  const params = new URLSearchParams(window.location.search);
  const source = params.get("src") || "direct";

  window.alexSite = {
    source,
    hit(key) {
      const url = "https://api.countapi.xyz/hit/" + namespace + "/" + encodeURIComponent(key);
      fetch(url, { mode: "no-cors", keepalive: true }).catch(() => {});
    },
    internalUrl(path) {
      const next = new URL(path, window.location.href);
      next.searchParams.set("src", source);
      return next.toString();
    }
  };
})();
