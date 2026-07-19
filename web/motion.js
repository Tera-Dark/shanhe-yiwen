/* 山河异闻 · 雾金动效
   燕云感：雾中现形 · 金线描出 · 方帖错峰 · 忌弹跳花哨
*/
(function (global) {
  "use strict";

  const reduce =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hasGsap() {
    return typeof global.gsap !== "undefined" && global.gsap && !reduce;
  }

  function q(sel, root) {
    return (root || document).querySelector(sel);
  }

  function enterView(opts) {
    opts = opts || {};
    const root = q("#mainView");
    if (!root) return;
    if (!hasGsap()) {
      root.style.opacity = "1";
      return;
    }
    const gsap = global.gsap;
    gsap.killTweensOf(root);
    try {
      gsap.killTweensOf(root.querySelectorAll("*"));
    } catch (_) { /* ignore */ }

    const hero = root.querySelector('[data-motion="hero"]');
    const staggers = root.querySelectorAll('[data-motion="stagger"] > *');
    const rail = root.querySelector('[data-motion="rail"]');
    const heads = root.querySelectorAll(
      ".section-head, .page-title, .lead, .volume-note, .ink-divider, .kicker, .vol-tabs, .kernel"
    );

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set(root, { opacity: 1 });

    if (hero) {
      const title = hero.querySelector(".region-title");
      const quote = hero.querySelector(".region-quote");
      const kicker = hero.querySelector(".region-kicker");
      const side = hero.querySelector(".region-side");
      const cta = hero.querySelector(".hero-cta-row");
      const parts = [kicker, title, quote, cta, side].filter(Boolean);
      gsap.set(parts, { opacity: 0, y: 20 });
      if (title) gsap.set(title, { y: 28, letterSpacing: "0.32em" });
      tl.to(kicker, { opacity: 1, y: 0, duration: 0.4 }, 0.05);
      if (title) {
        tl.to(
          title,
          { opacity: 1, y: 0, letterSpacing: "0.18em", duration: 0.7, ease: "power3.out" },
          0.12
        );
      }
      if (quote) tl.to(quote, { opacity: 1, y: 0, duration: 0.45 }, 0.32);
      if (cta) tl.to(cta, { opacity: 1, y: 0, duration: 0.4 }, 0.42);
      if (side) tl.to(side, { opacity: 1, y: 0, duration: 0.5 }, 0.28);
    }

    if (heads.length) {
      gsap.set(heads, { opacity: 0, y: 12 });
      tl.to(heads, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04 }, hero ? 0.4 : 0.06);
    }

    if (staggers.length) {
      gsap.set(staggers, { opacity: 0, y: 18, scale: 0.98 });
      tl.to(
        staggers,
        { opacity: 1, y: 0, scale: 1, duration: 0.48, stagger: 0.055, ease: "power3.out" },
        hero ? 0.48 : 0.1
      );
    }

    if (rail) {
      const stroke = rail.querySelector(".gp-stroke");
      const nodes = rail.querySelectorAll(".gp-node");
      if (stroke && stroke.getTotalLength) {
        const len = stroke.getTotalLength();
        gsap.set(stroke, { strokeDasharray: len, strokeDashoffset: len, opacity: 0.85 });
        tl.to(stroke, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, hero ? 0.55 : 0.15);
      } else if (stroke) {
        // pathLength="100" fallback
        gsap.set(stroke, { strokeDasharray: 100, strokeDashoffset: 100 });
        tl.to(stroke, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, hero ? 0.55 : 0.15);
      }
      if (nodes.length) {
        gsap.set(nodes, { opacity: 0, y: 14 });
        tl.to(
          nodes,
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" },
          hero ? 0.75 : 0.3
        );
      }
    }

    // 进度条宽度入场
    const bars = root.querySelectorAll(".ec-bar > i");
    if (bars.length) {
      bars.forEach((bar) => {
        const w = bar.style.width || "0%";
        gsap.fromTo(
          bar,
          { width: "0%" },
          { width: w, duration: 0.7, ease: "power2.out", delay: hero ? 0.6 : 0.2 }
        );
      });
    }
  }

  function openSearch() {
    const layer = q("#searchLayer");
    const panel = layer && layer.querySelector(".search-panel");
    const input = q("#searchInput");
    if (!layer) return;
    if (!hasGsap() || !panel) {
      if (input) setTimeout(() => input.focus(), 20);
      return;
    }
    const gsap = global.gsap;
    gsap.killTweensOf([layer, panel]);
    gsap.set(layer, { opacity: 0 });
    gsap.set(panel, { opacity: 0, y: -16, scale: 0.988 });
    gsap.to(layer, { opacity: 1, duration: 0.22, ease: "power1.out" });
    gsap.to(panel, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: "power3.out",
      onComplete: () => {
        if (input) input.focus();
      }
    });
  }

  function closeSearch(done) {
    const layer = q("#searchLayer");
    const panel = layer && layer.querySelector(".search-panel");
    if (!hasGsap() || !layer || !panel) {
      if (typeof done === "function") done();
      return;
    }
    const gsap = global.gsap;
    gsap.killTweensOf([layer, panel]);
    gsap.to(panel, { opacity: 0, y: -8, duration: 0.18, ease: "power2.in" });
    gsap.to(layer, {
      opacity: 0,
      duration: 0.2,
      ease: "power1.in",
      onComplete: () => {
        if (typeof done === "function") done();
      }
    });
  }

  function openReader() {
    const reader = q("#reader");
    if (!reader || !hasGsap()) return;
    const gsap = global.gsap;
    const bar = reader.querySelector(".reader-bar");
    const body = reader.querySelector(".reader-scroll");
    const foot = reader.querySelector(".reader-foot");
    gsap.killTweensOf([reader, bar, body, foot].filter(Boolean));
    gsap.set(reader, { opacity: 0 });
    gsap.set([bar, body, foot].filter(Boolean), { opacity: 0, y: 14 });
    gsap.to(reader, { opacity: 1, duration: 0.28, ease: "power1.out" });
    gsap.to(bar, { opacity: 1, y: 0, duration: 0.38, ease: "power2.out", delay: 0.04 });
    gsap.to(body, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.1 });
    if (foot) gsap.to(foot, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", delay: 0.16 });
  }

  function closeReaderMotion(done) {
    const reader = q("#reader");
    if (!reader || !hasGsap()) {
      if (typeof done === "function") done();
      return;
    }
    const gsap = global.gsap;
    gsap.to(reader, {
      opacity: 0,
      duration: 0.2,
      ease: "power1.in",
      onComplete: () => {
        if (typeof done === "function") done();
      }
    });
  }

  function turnPage() {
    const body = q("#readerBody");
    if (!body || !hasGsap()) return;
    const gsap = global.gsap;
    gsap.fromTo(
      body,
      { opacity: 0.3, y: 10 },
      { opacity: 1, y: 0, duration: 0.34, ease: "power2.out" }
    );
  }

  /** 金线局部翻页：只动本条 rail */
  function pulseRail(rail) {
    if (!rail || !hasGsap()) return;
    const gsap = global.gsap;
    const stroke = rail.querySelector(".gp-stroke");
    const nodes = rail.querySelectorAll(".gp-node");
    if (stroke) {
      if (stroke.getTotalLength) {
        const len = stroke.getTotalLength();
        gsap.fromTo(
          stroke,
          { strokeDasharray: len, strokeDashoffset: len * 0.35, opacity: 0.5 },
          { strokeDashoffset: 0, opacity: 0.85, duration: 0.55, ease: "power2.out" }
        );
      } else {
        gsap.fromTo(stroke, { opacity: 0.35 }, { opacity: 0.85, duration: 0.35 });
      }
    }
    if (nodes.length) {
      gsap.fromTo(
        nodes,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.32, stagger: 0.04, ease: "power2.out" }
      );
    }
  }

  global.ShanheMotion = {
    enterView,
    openSearch,
    closeSearch,
    openReader,
    closeReaderMotion,
    turnPage,
    pulseRail,
    reduced: reduce
  };
})(typeof window !== "undefined" ? window : globalThis);
