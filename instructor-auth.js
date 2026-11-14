const getAuthStatusElement = () => document.querySelector("[data-auth-status]");
const GALLERY_BUCKET = "passed-students";
const GALLERY_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const GALLERY_MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const setAuthStatus = (message, type = "error") => {
  const status = getAuthStatusElement();

  if (!status) {
    return;
  }

  status.textContent = message;
  status.hidden = !message;
  status.dataset.status = type;
};

const getPasswordResetRedirectUrl = () => new URL("reset-password.html", window.location.href).href;

const sendPasswordResetEmail = (supabase, email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: getPasswordResetRedirectUrl() });

const getSupabaseAuthClient = () => {
  try {
    return createGoodLuckSupabaseClient();
  } catch (error) {
    setAuthStatus(error.message);
    return null;
  }
};

const initLoginPage = async () => {
  const loginForm = document.querySelector("[data-login-form]");
  const supabase = getSupabaseAuthClient();

  if (!loginForm || !supabase) {
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    window.location.href = "instructor-dashboard.html";
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthStatus("");

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const submitButton = loginForm.querySelector("button[type='submit']");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Signing in...";
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    window.location.href = "instructor-dashboard.html";
  });

  const forgotPasswordButton = document.querySelector("[data-forgot-password]");

  if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", async () => {
      setAuthStatus("");

      const emailField = loginForm.elements.email;
      const email = emailField instanceof HTMLInputElement ? emailField.value.trim() : "";

      if (!email || (emailField instanceof HTMLInputElement && !emailField.checkValidity())) {
        setAuthStatus('Enter your email address above first, then click "Forgot your password?" again.');

        if (emailField instanceof HTMLInputElement) {
          emailField.focus();
        }

        return;
      }

      forgotPasswordButton.disabled = true;
      forgotPasswordButton.textContent = "Sending reset link...";

      const { error } = await sendPasswordResetEmail(supabase, email);

      forgotPasswordButton.disabled = false;
      forgotPasswordButton.textContent = "Forgot your password?";

      if (error) {
        setAuthStatus(error.message || "Unable to send a password reset email. Please try again later.");
        return;
      }

      setAuthStatus(
        "If an instructor account exists for that email, a password reset link has been sent. Check your inbox and spam folder.",
        "success"
      );
    });
  }
};

const initDashboardPage = async () => {
  const dashboard = document.querySelector("[data-dashboard]");
  const emailOutput = document.querySelector("[data-instructor-email]");
  const instructorNameOutput = document.querySelector("[data-dashboard-instructor-name]");
  const instructorEmailOutput = document.querySelector("[data-dashboard-instructor-email]");
  const holidayStatusOutput = document.querySelector("[data-holiday-status]");
  const holidayToggle = document.querySelector("[data-holiday-toggle]");
  const galleryForm = document.querySelector("[data-gallery-upload-form]");
  const galleryStatus = document.querySelector("[data-gallery-status]");
  const galleryList = document.querySelector("[data-gallery-admin-list]");
  const adminSettingsPanel = document.querySelector("[data-admin-settings]");
  const pauseSettingsForm = document.querySelector("[data-pause-settings-form]");
  const pauseStatusOutput = document.querySelector("[data-pause-status]");
  const pauseStatusMessage = document.querySelector("[data-pause-status-message]");
  const pauseConfirmModal = document.querySelector("[data-pause-confirm-modal]");
  const pauseConfirmCancel = document.querySelector("[data-pause-confirm-cancel]");
  const pauseConfirmAccept = document.querySelector("[data-pause-confirm-accept]");
  const confirmTitle = document.querySelector("[data-confirm-title]");
  const confirmMessage = document.querySelector("[data-confirm-message]");
  const activityLogPanel = document.querySelector("[data-activity-log-panel]");
  const activityLogList = document.querySelector("[data-activity-log-list]");
  const activityStatus = document.querySelector("[data-activity-status]");
  const activityRefresh = document.querySelector("[data-activity-refresh]");
  const activityClear = document.querySelector("[data-activity-clear]");
  const logoutButton = document.querySelector("[data-logout]");
  const instructorAccountsPanel = document.querySelector("[data-instructor-accounts-panel]");
  const instructorAccountsList = document.querySelector("[data-instructor-accounts-list]");
  const instructorAccountsStatus = document.querySelector("[data-instructor-accounts-status]");
  const supabase = getSupabaseAuthClient();
  let dashboardInstructor = null;

  if (!dashboard || !supabase) {
    return;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    window.location.href = "instructor-login.html";
    return;
  }

  if (emailOutput) {
    emailOutput.textContent = session.user.email || "Instructor";
  }

  const setGalleryStatus = (message, type = "error") => {
    if (!galleryStatus) {
      return;
    }

    galleryStatus.textContent = message;
    galleryStatus.hidden = !message;
    galleryStatus.dataset.status = type;
  };

  const setPauseStatusMessage = (message, type = "error") => {
    if (!pauseStatusMessage) {
      return;
    }

    pauseStatusMessage.textContent = message;
    pauseStatusMessage.hidden = !message;
    pauseStatusMessage.dataset.status = type;
  };

  const setActivityStatus = (message, type = "error") => {
    if (!activityStatus) {
      return;
    }

    activityStatus.textContent = message;
    activityStatus.hidden = !message;
    activityStatus.dataset.status = type;
  };

  const logActivity = async ({ action, targetType = null, targetId = null, details = null }) => {
    try {
      const { error: logError } = await supabase.from("activity_log").insert({
        actor_email: dashboardInstructor?.email || session.user.email || null,
        actor_name: dashboardInstructor?.name || null,
        action,
        target_type: targetType,
        target_id: targetId ? String(targetId) : null,
        details,
      });

      if (logError) {
        console.warn("Unable to write activity log entry.", logError);
      }
    } catch (logError) {
      console.warn("Unable to write activity log entry.", logError);
    }
  };

  const showConfirmation = ({
    title,
    message,
    confirmLabel,
    confirmDanger = false,
    fallbackMessage,
  }) =>
    new Promise((resolve) => {
      if (!pauseConfirmModal || !pauseConfirmCancel || !pauseConfirmAccept) {
        resolve(window.confirm(fallbackMessage || message));
        return;
      }

      const closeModal = (confirmed) => {
        pauseConfirmModal.hidden = true;
        pauseConfirmCancel.removeEventListener("click", handleCancel);
        pauseConfirmAccept.removeEventListener("click", handleAccept);
        document.removeEventListener("keydown", handleKeydown);
        resolve(confirmed);
      };

      const handleCancel = () => closeModal(false);
      const handleAccept = () => closeModal(true);
      const handleKeydown = (event) => {
        if (event.key === "Escape") {
          closeModal(false);
        }
      };

      if (confirmTitle) {
        confirmTitle.textContent = title;
      }

      if (confirmMessage) {
        confirmMessage.textContent = message;
      }

      pauseConfirmAccept.textContent = confirmLabel;
      pauseConfirmAccept.classList.toggle("danger", confirmDanger);
      pauseConfirmAccept.classList.toggle("primary", !confirmDanger);
      pauseConfirmModal.hidden = false;
      pauseConfirmCancel.addEventListener("click", handleCancel);
      pauseConfirmAccept.addEventListener("click", handleAccept);
      document.addEventListener("keydown", handleKeydown);
      pauseConfirmAccept.focus();
    });

  const showPauseConfirmation = () =>
    showConfirmation({
      title: "Pause the public website?",
      message:
        "The public website will be paused and visitors will see the maintenance page. Instructor login and dashboard will remain accessible.",
      confirmLabel: "Yes, pause website",
      fallbackMessage:
        "The public website will be paused and visitors will see the maintenance page. Instructor login and dashboard will remain accessible. Continue?",
    });

  const showClearLogConfirmation = () =>
    showConfirmation({
      title: "Clear Activity Log?",
      message: "This will permanently delete all activity log entries. This action cannot be undone.",
      confirmLabel: "Yes, Clear Log",
      confirmDanger: true,
      fallbackMessage: "This will permanently delete all activity log entries. This action cannot be undone. Continue?",
    });

  const cleanFileName = (fileName) =>
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const createGalleryCard = (image) => {
    const card = document.createElement("article");
    card.className = "gallery-admin-card";

    const imageElement = document.createElement("img");
    imageElement.src = image.image_url;
    imageElement.alt = image.alt_text || image.caption || "Passed student photo";

    const content = document.createElement("div");
    content.className = "gallery-admin-card-content";

    const captionInput = document.createElement("input");
    captionInput.type = "text";
    captionInput.value = image.caption || "";
    captionInput.maxLength = 120;
    captionInput.setAttribute("aria-label", "Gallery image caption");

    const actions = document.createElement("div");
    actions.className = "gallery-admin-actions";

    const saveButton = document.createElement("button");
    saveButton.className = "button";
    saveButton.type = "button";
    saveButton.textContent = "Save caption";

    const deleteButton = document.createElement("button");
    deleteButton.className = "button ghost";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
      setGalleryStatus("");

      const caption = captionInput.value.trim() || "Passed student";
      const { error: updateError } = await supabase
        .from("gallery_images")
        .update({
          caption,
          alt_text: `${caption} - Good Luck Driving School passed student`,
        })
        .eq("id", image.id);

      saveButton.disabled = false;
      saveButton.textContent = "Save caption";

      if (updateError) {
        setGalleryStatus(updateError.message || "Unable to update caption.");
        return;
      }

      if (caption !== (image.caption || "")) {
        await logActivity({
          action: "gallery_caption_updated",
          targetType: "gallery_image",
          targetId: image.id,
          details: {
            previous_caption: image.caption || "",
            new_caption: caption,
          },
        });

        if (dashboardInstructor?.is_admin) {
          loadActivityLog();
        }
      }

      setGalleryStatus("Caption updated.", "success");
      loadGalleryImages();
    });

    deleteButton.addEventListener("click", async () => {
      const shouldDelete = window.confirm("Delete this gallery image?");

      if (!shouldDelete) {
        return;
      }

      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting...";
      setGalleryStatus("");

      // Hide first so the public gallery cannot show a broken image if later deletion steps fail.
      const { error: hideError } = await supabase
        .from("gallery_images")
        .update({ is_visible: false })
        .eq("id", image.id);

      if (hideError) {
        setGalleryStatus(hideError.message || "Unable to hide gallery image before deletion.");
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
        return;
      }

      const { error: storageError } = await supabase.storage.from(GALLERY_BUCKET).remove([image.file_path]);

      if (storageError) {
        await supabase.from("gallery_images").update({ is_visible: true }).eq("id", image.id);
        setGalleryStatus(storageError.message || "Unable to delete image file.");
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
        return;
      }

      const { error: deleteError } = await supabase.from("gallery_images").delete().eq("id", image.id);

      if (deleteError) {
        setGalleryStatus(deleteError.message || "Unable to delete gallery record.");
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
        loadGalleryImages();
        return;
      }

      await logActivity({
        action: "gallery_image_deleted",
        targetType: "gallery_image",
        targetId: image.id,
        details: {
          caption: image.caption || "",
          file_path: image.file_path,
        },
      });

      if (dashboardInstructor?.is_admin) {
        loadActivityLog();
      }

      setGalleryStatus("Gallery image deleted.", "success");
      loadGalleryImages();
    });

    actions.append(saveButton, deleteButton);
    content.append(captionInput, actions);
    card.append(imageElement, content);

    return card;
  };

  const renderGalleryImages = (images) => {
    if (!galleryList) {
      return;
    }

    galleryList.replaceChildren();

    if (!images.length) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "gallery-admin-empty";
      emptyMessage.textContent = "No uploaded gallery images yet.";
      galleryList.append(emptyMessage);
      return;
    }

    images.forEach((image) => {
      galleryList.append(createGalleryCard(image));
    });
  };

  async function loadGalleryImages() {
    if (!galleryList) {
      return;
    }

    const { data, error: galleryError } = await supabase
      .from("gallery_images")
      .select("id,image_url,file_path,caption,alt_text,is_visible,created_at")
      .order("created_at", { ascending: false });

    if (galleryError) {
      setGalleryStatus(galleryError.message || "Unable to load gallery images.");
      return;
    }

    renderGalleryImages(data || []);
  }

  const loadInstructor = async () => {
    const { data, error: instructorError } = await supabase
      .from("instructors")
      .select("id,name,email,whatsapp_key,holiday_mode,is_admin")
      .ilike("email", session.user.email)
      .single();

    if (instructorError || !data) {
      throw instructorError || new Error("No instructor profile was found for this account.");
    }

    return data;
  };

  const renderPauseSettings = (settings) => {
    if (!pauseSettingsForm) {
      return;
    }

    const pauseToggle = pauseSettingsForm.elements.sitePaused;
    const messageField = pauseSettingsForm.elements.pausedMessage;
    const isPaused = Boolean(settings.site_paused);

    if (pauseStatusOutput) {
      pauseStatusOutput.textContent = isPaused ? "Website is paused" : "Website is live";
    }

    if (pauseToggle instanceof HTMLInputElement) {
      pauseToggle.checked = isPaused;
    }

    if (messageField instanceof HTMLTextAreaElement) {
      messageField.value = settings.paused_message || "We're currently making improvements to our website.";
    }

    pauseSettingsForm.dataset.sitePaused = String(isPaused);
    pauseSettingsForm.dataset.pausedMessage = settings.paused_message || "We're currently making improvements to our website.";
  };

  const loadPauseSettings = async () => {
    const { data, error: settingsError } = await supabase
      .from("site_settings")
      .select("site_paused,paused_message")
      .eq("id", "global")
      .single();

    if (settingsError || !data) {
      throw settingsError || new Error("Unable to load website pause settings.");
    }

    renderPauseSettings(data);
  };

  const formatActivityAction = (action) =>
    action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const formatActivityDetails = (entry) => {
    const details = entry.details || {};

    if (entry.action === "maintenance_message_changed") {
      return "Maintenance message updated.";
    }

    if (entry.action === "gallery_caption_updated") {
      return `Caption: ${details.new_caption || "Updated"}`;
    }

    if (entry.action === "gallery_image_uploaded" || entry.action === "gallery_image_deleted") {
      return details.caption || details.file_path || "Gallery image";
    }

    if (entry.action === "holiday_mode_enabled" || entry.action === "holiday_mode_disabled") {
      return details.instructor_name || "Instructor holiday mode";
    }

    if (entry.action === "password_reset_email_sent") {
      return `Password email sent to ${details.instructor_name || details.instructor_email || "instructor"}`;
    }

    if (entry.action === "website_paused" || entry.action === "website_resumed") {
      return details.paused_message || "Website pause mode";
    }

    return "Dashboard action";
  };

  const renderActivityLog = (entries) => {
    if (!activityLogList) {
      return;
    }

    activityLogList.replaceChildren();

    if (!entries.length) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "gallery-admin-empty";
      emptyMessage.textContent = "No activity has been logged yet.";
      activityLogList.append(emptyMessage);
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "activity-log-item";

      const date = document.createElement("time");
      date.dateTime = entry.created_at;
      date.textContent = new Date(entry.created_at).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const content = document.createElement("div");

      const title = document.createElement("strong");
      title.textContent = formatActivityAction(entry.action);

      const meta = document.createElement("span");
      meta.textContent = `${entry.actor_name || entry.actor_email || "Instructor"} - ${formatActivityDetails(entry)}`;

      content.append(title, meta);
      item.append(date, content);
      activityLogList.append(item);
    });
  };

  const loadActivityLog = async () => {
    if (!activityLogList) {
      return;
    }

    setActivityStatus("");

    const { data, error: activityError } = await supabase
      .from("activity_log")
      .select("actor_email,actor_name,action,target_type,target_id,details,created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (activityError) {
      console.error("Unable to load activity log.", activityError);
      setActivityStatus(activityError.message || "Unable to load activity log.");
      return;
    }

    renderActivityLog(data || []);
  };

  const clearActivityLog = async () => {
    const confirmedClear = await showClearLogConfirmation();

    if (!confirmedClear) {
      return;
    }

    if (activityClear) {
      activityClear.disabled = true;
      activityClear.textContent = "Clearing...";
    }

    setActivityStatus("");

    const { error: deleteError } = await supabase
      .from("activity_log")
      .delete()
      .not("id", "is", null);

    if (activityClear) {
      activityClear.disabled = false;
      activityClear.textContent = "Clear Log";
    }

    if (deleteError) {
      console.error("Unable to clear activity log.", deleteError);
      setActivityStatus(deleteError.message || "Unable to clear activity log.");
      return;
    }

    await loadActivityLog();
    setActivityStatus("Activity log cleared successfully.", "success");
  };

  const setInstructorAccountsStatus = (message, type = "error") => {
    if (!instructorAccountsStatus) {
      return;
    }

    instructorAccountsStatus.textContent = message;
    instructorAccountsStatus.hidden = !message;
    instructorAccountsStatus.dataset.status = type;
  };

  const sendInstructorPasswordEmail = async (account, button) => {
    setInstructorAccountsStatus("");
    button.disabled = true;
    button.textContent = "Sending...";

    const { error: resetError } = await sendPasswordResetEmail(supabase, account.email);

    button.disabled = false;
    button.textContent = "Send password email";

    if (resetError) {
      console.error("Unable to send password email.", resetError);
      setInstructorAccountsStatus(resetError.message || "Unable to send password email. Please try again later.");
      return;
    }

    setInstructorAccountsStatus(
      `Password email sent to ${account.name || account.email}. Ask them to check their inbox and spam folder.`,
      "success"
    );

    await logActivity({
      action: "password_reset_email_sent",
      targetType: "instructor",
      targetId: account.id,
      details: {
        instructor_name: account.name,
        instructor_email: account.email,
      },
    });

    loadActivityLog();
  };

  const renderInstructorAccounts = (accounts) => {
    if (!instructorAccountsList) {
      return;
    }

    instructorAccountsList.replaceChildren();

    if (!accounts.length) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "gallery-admin-empty";
      emptyMessage.textContent = "No instructor accounts found.";
      instructorAccountsList.append(emptyMessage);
      return;
    }

    accounts.forEach((account) => {
      const row = document.createElement("div");
      row.className = "instructor-account-row";

      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = account.name || "Instructor";
      const email = document.createElement("span");
      email.textContent = account.email || "No email saved";
      info.append(name, email);

      const button = document.createElement("button");
      button.className = "button ghost";
      button.type = "button";
      button.textContent = "Send password email";
      button.disabled = !account.email;
      button.addEventListener("click", () => sendInstructorPasswordEmail(account, button));

      row.append(info, button);
      instructorAccountsList.append(row);
    });
  };

  const loadInstructorAccounts = async () => {
    const { data, error: accountsError } = await supabase
      .from("instructors")
      .select("id,name,email")
      .order("name", { ascending: true });

    if (accountsError) {
      console.error("Unable to load instructor accounts.", accountsError);
      setInstructorAccountsStatus(accountsError.message || "Unable to load instructor accounts.");
      return;
    }

    renderInstructorAccounts(data || []);
  };

  const initAdminSettings = async (instructor) => {
    if (!instructor.is_admin || !adminSettingsPanel || !pauseSettingsForm) {
      return;
    }

    if (instructorAccountsPanel) {
      instructorAccountsPanel.hidden = false;
      instructorAccountsPanel.classList.add("is-visible");
      loadInstructorAccounts();
    }

    adminSettingsPanel.hidden = false;
    adminSettingsPanel.classList.add("is-visible");

    if (activityLogPanel) {
      activityLogPanel.hidden = false;
      activityLogPanel.classList.add("is-visible");
      loadActivityLog();
    }

    if (activityRefresh) {
      activityRefresh.addEventListener("click", loadActivityLog);
    }

    if (activityClear) {
      activityClear.addEventListener("click", clearActivityLog);
    }

    try {
      await loadPauseSettings();
    } catch (settingsError) {
      console.error("Unable to load website pause settings.", settingsError);
      setPauseStatusMessage(settingsError.message || "Unable to load website pause settings.");

      if (pauseStatusOutput) {
        pauseStatusOutput.textContent = "Unavailable";
      }
    }

    pauseSettingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setPauseStatusMessage("");

      const pauseToggle = pauseSettingsForm.elements.sitePaused;
      const messageField = pauseSettingsForm.elements.pausedMessage;
      const submitButton = pauseSettingsForm.querySelector("button[type='submit']");
      const isPaused = pauseToggle instanceof HTMLInputElement ? pauseToggle.checked : false;
      const previousPaused = pauseSettingsForm.dataset.sitePaused === "true";
      const previousMessage = pauseSettingsForm.dataset.pausedMessage || "We're currently making improvements to our website.";
      const message =
        messageField instanceof HTMLTextAreaElement
          ? messageField.value.trim()
          : "";
      const pausedMessage = message || "We're currently making improvements to our website.";

      if (!previousPaused && isPaused) {
        const confirmedPause = await showPauseConfirmation();

        if (!confirmedPause) {
          if (pauseToggle instanceof HTMLInputElement) {
            pauseToggle.checked = previousPaused;
          }

          if (messageField instanceof HTMLTextAreaElement) {
            messageField.value = previousMessage;
          }

          setPauseStatusMessage("Website pause cancelled.", "success");
          return;
        }
      }

      if (messageField instanceof HTMLTextAreaElement && !message) {
        messageField.value = pausedMessage;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
      }

      const { error: updateError } = await supabase
        .from("site_settings")
        .update({
          site_paused: isPaused,
          paused_message: pausedMessage,
          updated_at: new Date().toISOString(),
          updated_by: session.user.id,
        })
        .eq("id", "global");

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save pause settings";
      }

      if (updateError) {
        console.error("Unable to save website pause settings.", updateError);
        setPauseStatusMessage(updateError.message || "Unable to save website pause settings.");
        return;
      }

      const { data: savedSettings, error: verifyError } = await supabase
        .from("site_settings")
        .select("site_paused,paused_message,updated_at,updated_by")
        .eq("id", "global")
        .maybeSingle();

      if (verifyError || !savedSettings) {
        console.error("Unable to verify website pause settings after save.", verifyError);
        setPauseStatusMessage(verifyError?.message || "Unable to verify website pause settings after save.");
        return;
      }

      if (savedSettings.site_paused !== isPaused || savedSettings.paused_message !== pausedMessage) {
        const mismatchError = new Error("Website pause settings were not saved. Please check admin permissions.");
        console.error("Website pause settings verification failed.", {
          expected: {
            site_paused: isPaused,
            paused_message: pausedMessage,
          },
          saved: savedSettings,
        });
        setPauseStatusMessage(mismatchError.message);
        return;
      }

      renderPauseSettings(savedSettings);
      if (!previousPaused && savedSettings.site_paused) {
        await logActivity({
          action: "website_paused",
          targetType: "site_settings",
          targetId: "global",
          details: {
            paused_message: savedSettings.paused_message,
          },
        });
      }

      if (previousPaused && !savedSettings.site_paused) {
        await logActivity({
          action: "website_resumed",
          targetType: "site_settings",
          targetId: "global",
          details: {
            paused_message: savedSettings.paused_message,
          },
        });
      }

      if (previousMessage !== savedSettings.paused_message) {
        await logActivity({
          action: "maintenance_message_changed",
          targetType: "site_settings",
          targetId: "global",
          details: {
            previous_message: previousMessage,
            new_message: savedSettings.paused_message,
          },
        });
      }

      if (dashboardInstructor?.is_admin) {
        loadActivityLog();
      }

      setPauseStatusMessage("Website pause settings saved.", "success");
    });
  };

  const renderHolidayMode = (instructor) => {
    if (instructorNameOutput) {
      instructorNameOutput.textContent = instructor.name;
    }

    if (instructorEmailOutput) {
      instructorEmailOutput.textContent = instructor.email;
    }

    if (holidayStatusOutput) {
      holidayStatusOutput.textContent = instructor.holiday_mode ? "Holiday mode is on" : "Holiday mode is off";
    }

    if (holidayToggle) {
      holidayToggle.disabled = false;
      holidayToggle.textContent = instructor.holiday_mode ? "Turn Holiday Mode Off" : "Turn Holiday Mode On";
      holidayToggle.dataset.holidayMode = String(instructor.holiday_mode);
      holidayToggle.dataset.instructorId = instructor.id;
    }
  };

  try {
    const instructor = await loadInstructor();
    dashboardInstructor = instructor;
    renderHolidayMode(instructor);
    initAdminSettings(instructor);
  } catch (instructorError) {
    setAuthStatus(instructorError.message || "Unable to load instructor holiday mode.");

    if (holidayStatusOutput) {
      holidayStatusOutput.textContent = "Unavailable";
    }

    if (holidayToggle) {
      holidayToggle.disabled = true;
      holidayToggle.textContent = "Holiday Mode Unavailable";
    }
  }

  if (galleryForm) {
    galleryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setGalleryStatus("");

      const formData = new FormData(galleryForm);
      const file = formData.get("image");
      const caption = String(formData.get("caption") || "").trim();
      const submitButton = galleryForm.querySelector("button[type='submit']");

      if (!(file instanceof File) || !file.size) {
        setGalleryStatus("Choose an image to upload.");
        return;
      }

      // Beta upload guardrails: keep gallery files web-friendly before Storage upload starts.
      if (!GALLERY_ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setGalleryStatus("Please upload a JPG, PNG or WebP image.");
        return;
      }

      if (file.size > GALLERY_MAX_IMAGE_SIZE) {
        setGalleryStatus("Image must be 5MB or smaller.");
        return;
      }

      if (!caption) {
        setGalleryStatus("Add a short caption.");
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Uploading...";
      }

      const safeFileName = cleanFileName(file.name) || "passed-student.jpg";
      const filePath = `passed-students/${session.user.id}/${Date.now()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from(GALLERY_BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        setGalleryStatus(uploadError.message || "Unable to upload image.");

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Upload photo";
        }

        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);

      const { data: insertedImage, error: insertError } = await supabase
        .from("gallery_images")
        .insert({
          image_url: publicUrl,
          file_path: filePath,
          caption,
          alt_text: `${caption} - Good Luck Driving School passed student`,
          uploaded_by: session.user.id,
          is_visible: true,
          created_at: new Date().toISOString(),
        })
        .select("id,caption,file_path")
        .maybeSingle();

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Upload photo";
      }

      if (insertError) {
        await supabase.storage.from(GALLERY_BUCKET).remove([filePath]);
        setGalleryStatus(insertError.message || "Image uploaded, but the gallery record could not be saved.");
        return;
      }

      await logActivity({
        action: "gallery_image_uploaded",
        targetType: "gallery_image",
        targetId: insertedImage?.id || filePath,
        details: {
          caption,
          file_path: filePath,
        },
      });

      if (dashboardInstructor?.is_admin) {
        loadActivityLog();
      }

      galleryForm.reset();
      setGalleryStatus("Gallery image uploaded.", "success");
      loadGalleryImages();
    });

    loadGalleryImages();
  }

  if (holidayToggle) {
    holidayToggle.addEventListener("click", async () => {
      const instructorId = holidayToggle.dataset.instructorId;
      const currentHolidayMode = holidayToggle.dataset.holidayMode === "true";

      if (!instructorId) {
        setAuthStatus("Instructor profile is not loaded.");
        return;
      }

      holidayToggle.disabled = true;
      holidayToggle.textContent = "Saving...";
      setAuthStatus("");

      const { data, error: updateError } = await supabase
        .from("instructors")
        .update({ holiday_mode: !currentHolidayMode })
        .eq("id", instructorId)
        .select("id,name,email,whatsapp_key,holiday_mode")
        .single();

      if (updateError || !data) {
        setAuthStatus(updateError?.message || "Unable to update holiday mode.");
        holidayToggle.disabled = false;
        holidayToggle.textContent = currentHolidayMode ? "Turn Holiday Mode Off" : "Turn Holiday Mode On";
        return;
      }

      renderHolidayMode(data);
      await logActivity({
        action: data.holiday_mode ? "holiday_mode_enabled" : "holiday_mode_disabled",
        targetType: "instructor",
        targetId: data.id,
        details: {
          instructor_name: data.name,
          instructor_email: data.email,
          holiday_mode: data.holiday_mode,
        },
      });

      if (dashboardInstructor?.is_admin) {
        loadActivityLog();
      }

      setAuthStatus("Holiday mode updated.", "success");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "instructor-login.html";
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("[data-login-form]")) {
    initLoginPage();
  }

  if (document.querySelector("[data-dashboard]")) {
    initDashboardPage();
  }
});
