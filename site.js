(() => {
  const menuButton = document.querySelector("#menu-toggle");
  const siteNav = document.querySelector("#site-nav");

  if (menuButton && siteNav) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menú");
      siteNav.classList.remove("is-open");
    };

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
      siteNav.classList.toggle("is-open", !isOpen);
    });

    siteNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) closeMenu();
    });
  }

  const slider = document.querySelector("[data-brand-slider]");
  if (slider) {
    const viewport = slider.querySelector("[data-brand-viewport]");
    const slides = Array.from(slider.querySelectorAll("[data-brand-slide]"));
    const previousButton = slider.querySelector("[data-slider-prev]");
    const nextButton = slider.querySelector("[data-slider-next]");
    const rotationButton = slider.querySelector("[data-slider-rotation]");
    const dotsHost = slider.querySelector("#brand-dots");
    const status = slider.querySelector("#brand-status");
    const progress = slider.querySelector("#brand-progress-fill");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentIndex = 0;
    let scrollFrame = 0;
    let rotationTimer = 0;
    let userPaused = false;
    let pointerInside = false;
    let pointerDown = false;
    let focusInside = false;

    const slideName = (slide) => slide?.getAttribute("aria-label")?.replace(/^Marca:\s*/, "") ?? "Marca";
    const isRotationActive = () => !userPaused && !pointerInside && !pointerDown && !focusInside && !document.hidden;

    const updateRotationControl = () => {
      const label = userPaused ? "Reanudar avance automático" : "Pausar avance automático";
      rotationButton?.setAttribute("aria-pressed", String(userPaused));
      rotationButton?.setAttribute("aria-label", label);
      rotationButton?.setAttribute("title", label);
      status?.setAttribute("aria-live", isRotationActive() ? "off" : "polite");
    };

    const scheduleRotation = () => {
      if (rotationTimer) window.clearTimeout(rotationTimer);
      rotationTimer = 0;
      updateRotationControl();
      if (!isRotationActive() || slides.length < 2) return;
      rotationTimer = window.setTimeout(() => {
        rotationTimer = 0;
        goTo(currentIndex + 1, true);
        scheduleRotation();
      }, 3000);
    };

    const updateControls = (index) => {
      currentIndex = Math.max(0, Math.min(index, slides.length - 1));
      if (status) status.textContent = `Marca actual: ${slideName(slides[currentIndex])}`;
      dots.forEach((dot, dotIndex) => dot.setAttribute("aria-current", dotIndex === currentIndex ? "true" : "false"));
      if (progress) progress.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;
    };

    const goTo = (index, automatic = false) => {
      if (!slides.length || !viewport) return;
      const targetIndex = ((index % slides.length) + slides.length) % slides.length;
      const target = slides[targetIndex];
      if (!target) return;
      viewport.scrollTo({
        left: target.offsetLeft - slides[0].offsetLeft,
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
      updateControls(targetIndex);
      if (!automatic) scheduleRotation();
    };

    const dots = slides.map((slide, index) => {
      const dot = document.createElement("button");
      dot.className = "slider-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `Ver ${slideName(slide)}`);
      dot.setAttribute("aria-current", index === 0 ? "true" : "false");
      dot.addEventListener("click", () => goTo(index));
      dotsHost?.append(dot);
      return dot;
    });

    previousButton?.addEventListener("click", () => goTo(currentIndex - 1));
    nextButton?.addEventListener("click", () => goTo(currentIndex + 1));
    rotationButton?.addEventListener("click", () => {
      userPaused = !userPaused;
      scheduleRotation();
    });

    viewport?.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(currentIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(slides.length - 1);
      }
    });

    slider.addEventListener("mouseenter", () => {
      pointerInside = true;
      scheduleRotation();
    });
    slider.addEventListener("mouseleave", () => {
      pointerInside = false;
      scheduleRotation();
    });
    slider.addEventListener("pointerdown", () => {
      pointerDown = true;
      scheduleRotation();
    });
    window.addEventListener("pointerup", () => {
      if (!pointerDown) return;
      pointerDown = false;
      scheduleRotation();
    });
    window.addEventListener("pointercancel", () => {
      pointerDown = false;
      scheduleRotation();
    });
    slider.addEventListener("focusin", () => {
      focusInside = true;
      scheduleRotation();
    });
    slider.addEventListener("focusout", () => {
      window.setTimeout(() => {
        focusInside = slider.contains(document.activeElement);
        scheduleRotation();
      }, 0);
    });
    document.addEventListener("visibilitychange", scheduleRotation);

    viewport?.addEventListener("scroll", () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(() => {
        const viewportLeft = viewport.scrollLeft;
        let nearest = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        slides.forEach((slide, index) => {
          const distance = Math.abs(slide.offsetLeft - slides[0].offsetLeft - viewportLeft);
          if (distance < nearestDistance) {
            nearest = index;
            nearestDistance = distance;
          }
        });
        updateControls(nearest);
        scheduleRotation();
      });
    }, { passive: true });

    updateControls(0);
    scheduleRotation();
  }

  const contactForm = document.querySelector("#contact-form");
  const formStatus = document.querySelector("#form-status");
  const formFallback = document.querySelector("#form-fallback");
  if (contactForm && formStatus) {
    let submitting = false;
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting || !contactForm.reportValidity()) return;
      formStatus.hidden = false;
      formStatus.removeAttribute("data-error");
      if (formFallback) formFallback.hidden = true;

      const payload = Object.fromEntries(new FormData(contactForm).entries());
      const isProductionDomain = ["grupoinmarca.com", "www.grupoinmarca.com"].includes(window.location.hostname.toLowerCase());

      if (isProductionDomain) {
        const submitButton = contactForm.querySelector('button[type="submit"]');
        submitting = true;
        if (submitButton) submitButton.disabled = true;
        contactForm.setAttribute("aria-busy", "true");
        formStatus.textContent = "Enviando tu mensaje…";
        try {
          const response = await fetch("/backend/index.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (!response.ok || result?.success !== true) throw new Error("La solicitud no pudo completarse.");
          formStatus.textContent = "Mensaje enviado correctamente.";
          contactForm.reset();
        } catch (error) {
          formStatus.textContent = "No pudimos confirmar el envío. Si no recibes respuesta, escríbenos directamente por WhatsApp.";
          formStatus.setAttribute("data-error", "true");
          if (formFallback) formFallback.hidden = false;
        } finally {
          submitting = false;
          if (submitButton) submitButton.disabled = false;
          contactForm.removeAttribute("aria-busy");
        }
        return;
      }

      const message = [
        `Hola, soy ${payload.nombre}.`,
        `Correo: ${payload.email}`,
        `Teléfono: ${payload.telefono}`,
        `Mensaje: ${payload.mensaje}`,
      ].join("\n");
      const whatsappUrl = `https://wa.me/50661549331?text=${encodeURIComponent(message)}`;
      formStatus.textContent = "Preparamos tu consulta en WhatsApp. Revisa el chat y envía el mensaje para completar el contacto.";
      if (formFallback) {
        formFallback.href = whatsappUrl;
        formFallback.hidden = false;
      }
      const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (whatsappWindow) whatsappWindow.opener = null;
    });
  }

  const footerTopLink = document.querySelector(".footer-top");
  footerTopLink?.addEventListener("click", (event) => {
    event.preventDefault();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  });

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
