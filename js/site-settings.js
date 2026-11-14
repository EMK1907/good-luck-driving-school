const PAUSE_FALLBACK_MESSAGE = "We're currently making improvements to our website.";

const getCurrentPageName = () => {
  const pageName = window.location.pathname.split("/").pop();
  return pageName || "index.html";
};

const isPauseCheckExcludedPage = (pageName) => {
  const excludedPages = new Set([
    "maintenance.html",
    "login.html",
    "dashboard.html",
    "instructor-login.html",
    "instructor-dashboard.html",
    "gallery-migration.html",
  ]);

  return excludedPages.has(pageName);
};

const getSiteSettings = async () => {
  if (typeof createGoodLuckSupabaseClient !== "function") {
    console.warn("Supabase config is not loaded. Skipping website pause check.");
    return null;
  }

  let supabase = null;

  try {
    supabase = createGoodLuckSupabaseClient();
  } catch (error) {
    console.warn("Unable to create Supabase client. Skipping website pause check.", error);
    return null;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("site_paused,paused_message")
    .eq("id", "global")
    .single();

  if (error) {
    console.warn("Unable to load site settings. Skipping website pause check.", error);
    return null;
  }

  return data;
};

const initSitePauseCheck = async () => {
  const pageName = getCurrentPageName();

  if (isPauseCheckExcludedPage(pageName)) {
    return;
  }

  const settings = await getSiteSettings();

  if (settings && settings.site_paused) {
    window.location.href = "maintenance.html";
  }
};

const initMaintenancePage = async () => {
  const messageOutput = document.querySelector("[data-maintenance-message]");
  const settings = await getSiteSettings();

  if (!settings) {
    if (messageOutput) {
      messageOutput.textContent = PAUSE_FALLBACK_MESSAGE;
    }

    return;
  }

  if (!settings.site_paused) {
    window.location.href = "index.html";
    return;
  }

  if (messageOutput) {
    messageOutput.textContent = settings.paused_message || PAUSE_FALLBACK_MESSAGE;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("[data-maintenance-page]")) {
    initMaintenancePage();
    return;
  }

  initSitePauseCheck();
});
