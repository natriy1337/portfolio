(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

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

  /* ——— Smooth category filter ——— */
  const filters = document.querySelectorAll(".filter");
  const projects = [...document.querySelectorAll(".project")];
  let filterBusy = false;

  const applyFilter = async (value) => {
    if (filterBusy) return;
    filterBusy = true;

    const toHide = [];
    const toShow = [];
    projects.forEach((card) => {
      const cat = card.getAttribute("data-cat");
      const show = value === "all" || cat === value;
      if (show) toShow.push(card);
      else toHide.push(card);
    });

    if (reduceMotion) {
      projects.forEach((card) => {
        const show = toShow.includes(card);
        card.classList.toggle("is-hidden", !show);
        card.classList.remove("is-leaving", "is-entering");
      });
      filterBusy = false;
      return;
    }

    // Leave animation
    toHide.forEach((card, i) => {
      card.style.transitionDelay = `${i * 35}ms`;
      card.classList.add("is-leaving");
      card.classList.remove("is-entering");
    });

    await wait(320 + toHide.length * 35);

    toHide.forEach((card) => {
      card.classList.add("is-hidden");
      card.classList.remove("is-leaving");
      card.style.transitionDelay = "";
    });

    toShow.forEach((card) => {
      card.classList.remove("is-hidden");
      card.classList.add("is-entering");
    });

    // Force reflow then enter
    void document.getElementById("projects")?.offsetHeight;

    toShow.forEach((card, i) => {
      card.style.transitionDelay = `${i * 45}ms`;
      requestAnimationFrame(() => card.classList.remove("is-entering"));
    });

    await wait(420 + toShow.length * 45);
    toShow.forEach((card) => {
      card.style.transitionDelay = "";
    });
    filterBusy = false;
  };

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-filter") || "all";
      filters.forEach((f) => {
        f.classList.toggle("is-active", f === btn);
        f.setAttribute("aria-selected", f === btn ? "true" : "false");
      });
      applyFilter(value);
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
  }
})();
