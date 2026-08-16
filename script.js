(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ——— Seamless marquee (no restart jump) ——— */
  const track = document.getElementById("marqueeTrack");
  let marqueeOffset = 0;
  let marqueeWidth = 0;
  let marqueeRaf = 0;
  let marqueeLast = 0;
  const MARQUEE_SPEED = 38; // px per second

  const buildMarquee = () => {
    if (!track) return;
    const first = track.querySelector(".marquee__group");
    if (!first) return;

    cancelAnimationFrame(marqueeRaf);
    track.querySelectorAll(".marquee__group").forEach((node, i) => {
      if (i > 0) node.remove();
    });

    // Duplicate until content is wider than viewport * 2
    const viewport = track.parentElement?.clientWidth || window.innerWidth;
    let guard = 0;
    while (track.scrollWidth < viewport * 2 + 40 && guard < 8) {
      track.appendChild(first.cloneNode(true));
      guard += 1;
    }
    // Always keep at least 2 groups for seamless wrap
    if (track.querySelectorAll(".marquee__group").length < 2) {
      track.appendChild(first.cloneNode(true));
    }

    marqueeWidth = first.getBoundingClientRect().width;
    marqueeOffset = marqueeOffset % (marqueeWidth || 1);
    track.style.transform = `translate3d(${marqueeOffset}px, 0, 0)`;
    track.classList.add("is-ready");

    if (!reduceMotion && marqueeWidth > 0) {
      marqueeLast = performance.now();
      const tick = (now) => {
        const dt = Math.min(64, now - marqueeLast) / 1000;
        marqueeLast = now;
        marqueeOffset -= MARQUEE_SPEED * dt;
        if (marqueeOffset <= -marqueeWidth) {
          marqueeOffset += marqueeWidth;
        }
        track.style.transform = `translate3d(${marqueeOffset}px, 0, 0)`;
        marqueeRaf = requestAnimationFrame(tick);
      };
      marqueeRaf = requestAnimationFrame(tick);
    }
  };

  // Wait for fonts so widths are stable
  const startMarquee = () => {
    if (document.fonts?.ready) {
      document.fonts.ready.then(buildMarquee);
    } else {
      buildMarquee();
    }
  };
  startMarquee();
  window.addEventListener("resize", () => {
    window.clearTimeout(window.__marqueeTimer);
    window.__marqueeTimer = window.setTimeout(buildMarquee, 200);
  });

  /* ——— Reveal ——— */
  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = Number(el.getAttribute("data-delay") || 0);
          window.setTimeout(() => el.classList.add("is-visible"), delay);
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
    window.requestAnimationFrame(() => {
      document.querySelectorAll(".hero .reveal").forEach((el) => {
        const delay = Number(el.getAttribute("data-delay") || 0);
        window.setTimeout(() => el.classList.add("is-visible"), delay);
      });
    });
  }

  /* ——— Count-up ——— */
  const counters = document.querySelectorAll("[data-count]");
  const animateCount = (el) => {
    const target = Number(el.getAttribute("data-count") || 0);
    if (reduceMotion) {
      el.textContent = String(target);
      return;
    }
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          cio.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* ——— Category filter (instant + smooth, never locks) ——— */
  const filters = [...document.querySelectorAll(".filter")];
  const projects = [...document.querySelectorAll(".project")];
  let filterToken = 0;

  const applyFilter = (value) => {
    const token = ++filterToken;

    projects.forEach((card, i) => {
      const cat = card.getAttribute("data-cat");
      const show = value === "all" || cat === value;
      const wasHidden = card.classList.contains("is-hidden");

      card.style.animation = "none";
      card.classList.remove("is-leaving", "is-entering");

      if (!show) {
        card.classList.add("is-hidden");
        return;
      }

      card.classList.remove("is-hidden");

      if (reduceMotion || !wasHidden) return;

      card.style.setProperty("--enter-delay", `${i * 40}ms`);
      void card.offsetWidth;
      card.style.animation = "";
      card.classList.add("is-enter");
      window.setTimeout(() => {
        if (token !== filterToken) return;
        card.classList.remove("is-enter");
        card.style.removeProperty("--enter-delay");
      }, 500 + i * 40);
    });
  };

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-filter") || "all";
      filters.forEach((f) => {
        const on = f === btn;
        f.classList.toggle("is-active", on);
        f.setAttribute("aria-selected", on ? "true" : "false");
      });
      applyFilter(value);
    });
  });

  // Keyboard: 1–4 switch filters on desktop
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const map = { "1": "all", "2": "shop", "3": "service", "4": "brand" };
    const value = map[e.key];
    if (!value) return;
    const btn = filters.find((f) => f.getAttribute("data-filter") === value);
    if (btn) btn.click();
  });

  const showToast = (text) => {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-on");
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => toast.classList.remove("is-on"), 2200);
  };

  // Copy Telegram on contact CTA double-click
  document.querySelectorAll('a[href*="t.me/Zxci3user1337"]').forEach((link) => {
    link.addEventListener("dblclick", async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText("@Zxci3user1337");
        showToast("Telegram скопирован: @Zxci3user1337");
      } catch {
        showToast("@Zxci3user1337");
      }
    });
  });

  /* ——— Scroll progress ——— */
  const progress = document.getElementById("scrollProgress");
  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = `${p}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ——— Active nav section ——— */
  const sections = ["work", "craft", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const navLinks = document.querySelectorAll(".nav__links a, .dock a[data-section]");
  if (sections.length) {
    const sio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const href = link.getAttribute("href") || "";
            link.classList.toggle("is-active", href === `#${id}`);
          });
        });
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: 0.01 }
    );
    sections.forEach((s) => sio.observe(s));
  }

  /* ——— Desktop interactions ——— */
  if (!reduceMotion && finePointer) {
    document.body.classList.add("has-cursor");

    const cursor = document.querySelector(".cursor");
    const blobs = [
      document.querySelector(".mesh__blob--1"),
      document.querySelector(".mesh__blob--2"),
      document.querySelector(".mesh__blob--3"),
    ].filter(Boolean);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx;
    let cy = my;

    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        const nx = (mx / window.innerWidth - 0.5) * 2;
        const ny = (my / window.innerHeight - 0.5) * 2;
        if (blobs[0]) blobs[0].style.transform = `translate(${nx * 28}px, ${ny * 18}px)`;
        if (blobs[1]) blobs[1].style.transform = `translate(${nx * -34}px, ${ny * 22}px)`;
        if (blobs[2]) blobs[2].style.transform = `translate(${nx * 18}px, ${ny * -26}px)`;
      },
      { passive: true }
    );

    const loopCursor = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      if (cursor) cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loopCursor);
    };
    requestAnimationFrame(loopCursor);

    document.querySelectorAll("a, button").forEach((el) => {
      el.addEventListener("pointerenter", () => document.body.classList.add("is-hovering"));
      el.addEventListener("pointerleave", () => document.body.classList.remove("is-hovering"));
    });

    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });

    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 10;
        const ry = (px - 0.5) * 12;
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });

    // Spotlight over projects grid
    const spotlight = document.getElementById("projects");
    if (spotlight) {
      spotlight.addEventListener("pointermove", (e) => {
        const rect = spotlight.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        spotlight.style.setProperty("--spot-x", `${x}%`);
        spotlight.style.setProperty("--spot-y", `${y}%`);
        spotlight.classList.add("has-spot");
      });
      spotlight.addEventListener("pointerleave", () => {
        spotlight.classList.remove("has-spot");
      });
    }

    // Title scramble on project hover
    const scramble = (el) => {
      const original = el.dataset.original || el.textContent || "";
      el.dataset.original = original;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let frame = 0;
      const total = Math.min(12, original.length + 4);
      const id = window.setInterval(() => {
        el.textContent = original
          .split("")
          .map((ch, i) => {
            if (ch === " " || i < frame / 2) return original[i];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
        frame += 1;
        if (frame > total) {
          window.clearInterval(id);
          el.textContent = original;
        }
      }, 28);
    };

    document.querySelectorAll(".project__title").forEach((title) => {
      title.dataset.original = title.textContent || "";
      title.parentElement?.parentElement?.addEventListener("pointerenter", () => scramble(title));
    });

    // Hero parallax on scroll
    const hero = document.querySelector(".hero");
    window.addEventListener(
      "scroll",
      () => {
        if (!hero) return;
        const y = Math.min(120, window.scrollY * 0.22);
        hero.style.transform = `translate3d(0, ${y}px, 0)`;
        hero.style.opacity = String(Math.max(0.35, 1 - window.scrollY / 700));
      },
      { passive: true }
    );
  }
})();
