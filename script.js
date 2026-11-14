// Fallback values used if Supabase cannot load. Supabase holiday_mode overrides these on the public homepage.
// Instructor keys map to the matching data-instructor-whatsapp attributes in the instructor cards.

const instructorAvailability = {
  ali: {
    whatsappEnabled: true,
    holidayMode: false,
  },
  mehmet: {
    whatsappEnabled: true,
    holidayMode: false,
  },
  mehmetUmut: {
    whatsappEnabled: true,
    holidayMode: false,
  },
};

const initSite = () => {
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const navLinks = document.querySelector("[data-nav-links]");
  const contactForm = document.querySelector("[data-contact-form]");
  const publicGallery = document.querySelector("[data-public-gallery]");
  const revealElements = document.querySelectorAll(".reveal");
  const instructorWhatsappButtons = document.querySelectorAll("[data-instructor-whatsapp]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 560px)").matches;

  if (header) {
    const setHeaderState = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 18);
    };

    setHeaderState();
    window.addEventListener("scroll", setHeaderState, { passive: true });
  }

  if (header && menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("nav-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });
  }

  if (header && menuToggle && navLinks) {
    navLinks.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.matches("a")) {
        header.classList.remove("nav-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  const showAllRevealElements = () => {
    revealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
  };

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    showAllRevealElements();
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -5% 0px",
        threshold: 0.05,
      }
    );

    revealElements.forEach((element, index) => {
      const delay = isMobile ? 0 : Math.min(index % 4, 3) * 70;
      element.style.transitionDelay = `${delay}ms`;
      revealObserver.observe(element);
    });
  }

  const getCurrentUkHour = () => {
    // Availability uses UK time via Europe/London, not the visitor's local timezone.
    const hour = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(new Date());

    return Number(hour);
  };

  const updateInstructorWhatsappAvailability = () => {
    const ukHour = getCurrentUkHour();
    const isWithinWhatsappHours = ukHour >= 8 && ukHour < 20;
    const timeUnavailableMessage =
      "WhatsApp enquiries are available from 8am-8pm daily. Please use the contact form.";
    const instructorUnavailableMessage =
      "WhatsApp enquiries for this instructor are temporarily unavailable. Please use the contact form.";

    instructorWhatsappButtons.forEach((button) => {
      const instructorKey = button.getAttribute("data-instructor-whatsapp");
      const message = instructorKey
        ? document.querySelector(`[data-instructor-whatsapp-message="${instructorKey}"]`)
        : null;
      const settings = instructorKey ? instructorAvailability[instructorKey] : null;
      const isInstructorEnabled = Boolean(settings && settings.whatsappEnabled);
      const isInstructorOnHoliday = Boolean(settings && settings.holidayMode);
      const isAvailable = isWithinWhatsappHours && isInstructorEnabled && !isInstructorOnHoliday;

      button.hidden = !isAvailable;
      button.setAttribute("aria-disabled", String(!isAvailable));

      if (message instanceof HTMLElement) {
        message.hidden = isAvailable;
        message.textContent =
          isWithinWhatsappHours && (!isInstructorEnabled || isInstructorOnHoliday)
            ? instructorUnavailableMessage
            : timeUnavailableMessage;
      }
    });
  };

  const loadInstructorHolidayModes = async () => {
    if (typeof createGoodLuckSupabaseClient !== "function") {
      console.warn("Supabase config is not loaded. Using time-only WhatsApp availability.");
      return;
    }

    let supabase = null;

    try {
      supabase = createGoodLuckSupabaseClient();
    } catch (error) {
      console.warn("Unable to create Supabase client. Using time-only WhatsApp availability.", error);
      return;
    }

    const { data, error } = await supabase.from("instructors").select("whatsapp_key,holiday_mode");

    if (error) {
      console.warn("Unable to load instructor holiday modes. Using time-only WhatsApp availability.", error);
      return;
    }

    data.forEach((instructor) => {
      if (instructorAvailability[instructor.whatsapp_key]) {
        instructorAvailability[instructor.whatsapp_key].holidayMode = Boolean(instructor.holiday_mode);
      }
    });

    updateInstructorWhatsappAvailability();
  };

  if (instructorWhatsappButtons.length > 0) {
    updateInstructorWhatsappAvailability();
    loadInstructorHolidayModes();
    window.setInterval(updateInstructorWhatsappAvailability, 60 * 1000);
    window.setInterval(loadInstructorHolidayModes, 5 * 60 * 1000);
  }

  const createGalleryTile = (image) => {
    const tile = document.createElement("article");
    tile.className = "gallery-tile reveal is-visible";

    const imageElement = document.createElement("img");
    imageElement.src = image.image_url;
    imageElement.alt = image.alt_text || image.caption || "Good Luck Driving School passed student";
    imageElement.loading = "lazy";

    const caption = document.createElement("div");
    caption.className = "gallery-caption";

    const label = document.createElement("span");
    label.textContent = "Passed student";

    const title = document.createElement("strong");
    title.textContent = image.caption || "Student success";

    caption.append(label, title);
    tile.append(imageElement, caption);

    return tile;
  };

  const loadPublicGallery = async () => {
    if (!publicGallery) {
      return;
    }

    if (typeof createGoodLuckSupabaseClient !== "function") {
      console.warn("Supabase config is not loaded. Keeping fallback gallery images.");
      return;
    }

    let supabase = null;

    try {
      supabase = createGoodLuckSupabaseClient();
    } catch (error) {
      console.warn("Unable to create Supabase client. Keeping fallback gallery images.", error);
      return;
    }

    const { data, error } = await supabase
      .from("gallery_images")
      .select("image_url,caption,alt_text,created_at")
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Unable to load gallery images. Keeping fallback gallery images.", error);
      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    publicGallery.replaceChildren();
    data.forEach((image) => {
      publicGallery.append(createGalleryTile(image));
    });
  };

  loadPublicGallery();

  if (contactForm) {
    const instructorSelect = contactForm.elements.instructor;
    const messageField = contactForm.elements.message;
    const messageByInstructor = {
      "No preference": "Hi Good Luck Driving School, I would like to enquire about driving lessons.",
      Ali: "Hi Ali, I would like to enquire about driving lessons.",
      Mehmet: "Hi Mehmet, I would like to enquire about driving lessons.",
      "Mehmet Umut": "Hi Mehmet Umut, I would like to enquire about driving lessons.",
    };
    let hasCustomMessage = false;

    const getInstructorMessage = (instructorPreference) =>
      messageByInstructor[instructorPreference] || messageByInstructor["No preference"];

    if (messageField instanceof HTMLTextAreaElement && instructorSelect instanceof HTMLSelectElement) {
      messageField.addEventListener("input", () => {
        hasCustomMessage = true;
      });

      instructorSelect.addEventListener("change", () => {
        if (!hasCustomMessage) {
          messageField.value = getInstructorMessage(instructorSelect.value);
        }
      });
    }

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = new FormData(contactForm);
      const instructorPreference = String(data.get("instructor") || "No preference");
      const recipientByInstructor = {
        "No preference": "adar348@outlook.com",
        Ali: "adar348@outlook.com",
        Mehmet: "Memztank@gmail.com",
        "Mehmet Umut": "Goodluckmehmet@gmail.com",
      };
      const recipient = recipientByInstructor[instructorPreference] || recipientByInstructor["No preference"];
      const subject = "Good Luck Driving School enquiry";
      const body = [
        `Name: ${data.get("name")}`,
        `Contact: ${data.get("contact")}`,
        `Lesson type: ${data.get("lesson")}`,
        `Instructor preference: ${instructorPreference}`,
        "",
        data.get("message"),
      ].join("\n");

      window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSite);
} else {
  initSite();
}
