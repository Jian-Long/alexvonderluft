(function () {
  "use strict";
  const namespace = "alexvonderluft_site";
  const params = new URLSearchParams(window.location.search);
  const source = params.get("src") || "direct";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.documentElement.classList.add("motion-ready");

  function prepareInteractions() {
    document.querySelectorAll("a, button").forEach(element => element.classList.add("pressable"));

    const revealItems = document.querySelectorAll(".reveal");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach(element => element.classList.add("reveal-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px", threshold: 0.01 });

    revealItems.forEach(element => observer.observe(element));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prepareInteractions, { once: true });
  } else {
    prepareInteractions();
  }

  window.alexSite = {
    source,
    reducedMotion,
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
