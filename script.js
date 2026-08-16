(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Reveal
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

  // Count-up stats
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

  // Filters
  const filters = document.querySelectorAll(".filter");
  const projects = document.querySelectorAll(".project");
  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-filter") || "all";
      filters.forEach((f) => {
        f.classList.toggle("is-active", f === btn);
        f.setAttribute("aria-selected", f === btn ? "true" : "false");
      });
      projects.forEach((card) => {
        const cat = card.getAttribute("data-cat");
        const show = value === "all" || cat === value;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  // Soft mesh parallax + custom cursor + magnetic + tilt
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

    // Magnetic buttons
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

    // 3D tilt on project media
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
