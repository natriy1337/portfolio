(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const track = document.getElementById("marqueeTrack");
  let marqueeOffset = 0;
  let marqueeWidth = 0;
  let marqueeRaf = 0;
  let marqueeLast = 0;
  const MARQUEE_SPEED = 38;

  const buildMarquee = () => {
    if (!track) return;
    const first = track.querySelector(".marquee__group");
    if (!first) return;

    cancelAnimationFrame(marqueeRaf);
    track.querySelectorAll(".marquee__group").forEach((node, i) => {
      if (i > 0) node.remove();
    });

    const viewport = track.parentElement?.clientWidth || window.innerWidth;
    let guard = 0;
    while (track.scrollWidth < viewport * 2 + 40 && guard < 8) {
      track.appendChild(first.cloneNode(true));
      guard += 1;
    }

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
        if (!document.hidden) {
          const dt = Math.min(64, now - marqueeLast) / 1000;
          marqueeLast = now;
          marqueeOffset -= MARQUEE_SPEED * dt;
          if (marqueeOffset <= -marqueeWidth) {
            marqueeOffset += marqueeWidth;
          }
          track.style.transform = `translate3d(${marqueeOffset}px, 0, 0)`;
        } else {
          marqueeLast = now;
        }
        marqueeRaf = requestAnimationFrame(tick);
      };
      marqueeRaf = requestAnimationFrame(tick);
    }
  };

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

  const revealNodes = [...document.querySelectorAll(".reveal")].filter(
    (el) => !el.closest(".hero")
  );

  if (reduceMotion) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  } else {
    const showReveal = (el) => {
      const delay = Number(el.getAttribute("data-delay") || 0);
      window.setTimeout(() => el.classList.add("is-visible"), delay);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          showReveal(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );

    revealNodes.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        showReveal(el);
      } else {
        io.observe(el);
      }
    });
  }

  const counters = document.querySelectorAll("[data-count]");
  const animateCount = (el) => {
    const target = Number(el.getAttribute("data-count") || 0);
    if (reduceMotion) {
      el.textContent = String(target);
      return;
    }
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
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
      card.classList.remove("is-enter");

      if (!show) {
        card.classList.add("is-hidden");
        return;
      }

      card.classList.remove("is-hidden");
      card.classList.add("is-visible");

      if (reduceMotion || !wasHidden) return;

      card.style.setProperty("--enter-delay", `${i * 40}ms`);
      void card.offsetWidth;
      card.style.animation = "";
      card.classList.add("is-enter");
      window.setTimeout(() => {
        if (token !== filterToken) return;
        card.classList.remove("is-enter");
        card.style.removeProperty("--enter-delay");
      }, 520 + i * 40);
    });
  };

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-filter") || "all";
      filters.forEach((f) => {
        const on = f === btn;
        f.classList.toggle("is-active", on);
        f.setAttribute("aria-pressed", on ? "true" : "false");
      });
      applyFilter(value);
    });
  });

  const toast = document.getElementById("toast");
  const showToast = (text) => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-on");
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => toast.classList.remove("is-on"), 2200);
  };

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

  const progress = document.getElementById("scrollProgress");
  if (progress) {
    let max = 1;
    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    const updateProgress = () => {
      progress.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

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

  if (!reduceMotion && finePointer) {
    const enhance = () => {
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
        if (!document.hidden) {
          cx += (mx - cx) * 0.18;
          cy += (my - cy) * 0.18;
          if (cursor) cursor.style.transform = `translate(${cx}px, ${cy}px)`;
        }
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
          card.style.transform = `rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 12}deg)`;
        });
        card.addEventListener("pointerleave", () => {
          card.style.transform = "";
        });
      });

      const spotlight = document.getElementById("projects");
      if (spotlight) {
        spotlight.addEventListener("pointermove", (e) => {
          const rect = spotlight.getBoundingClientRect();
          spotlight.style.setProperty("--spot-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
          spotlight.style.setProperty("--spot-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
          spotlight.classList.add("has-spot");
        });
        spotlight.addEventListener("pointerleave", () => {
          spotlight.classList.remove("has-spot");
        });
      }

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
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(enhance, { timeout: 1200 });
    } else {
      window.setTimeout(enhance, 200);
    }
  }
})();
