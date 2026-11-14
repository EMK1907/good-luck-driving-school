const resetForm = document.querySelector("[data-reset-password-form]");
const resetStatus = document.querySelector("[data-reset-status]");

const setResetStatus = (message, type = "error") => {
  if (!resetStatus) {
    return;
  }

  resetStatus.textContent = message;
  resetStatus.hidden = !message;
  resetStatus.dataset.status = type;
};

const setResetFormEnabled = (isEnabled) => {
  if (!resetForm) {
    return;
  }

  const submitButton = resetForm.querySelector("button[type='submit']");

  if (submitButton) {
    submitButton.disabled = !isEnabled;
  }
};

const initPasswordResetPage = async () => {
  if (!resetForm) {
    return;
  }

  let supabase = null;
  let hasRecoverySession = false;

  try {
    supabase = createGoodLuckSupabaseClient();
  } catch (error) {
    setResetStatus(error.message);
    return;
  }

  const markRecoveryReady = () => {
    hasRecoverySession = true;
    setResetFormEnabled(true);
    setResetStatus("");
  };

  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      markRecoveryReady();
    }
  });

  await supabase.auth.getSession();

  window.setTimeout(() => {
    if (!hasRecoverySession) {
      setResetFormEnabled(false);
      setResetStatus(
        "This password reset link is invalid or has expired. Please request a new one using \"Forgot your password?\" on the instructor login page."
      );
    }
  }, 1200);

  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasRecoverySession) {
      setResetStatus(
        "This password reset link is invalid or has expired. Please request a new one using \"Forgot your password?\" on the instructor login page."
      );
      return;
    }

    const formData = new FormData(resetForm);
    const newPassword = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const submitButton = resetForm.querySelector("button[type='submit']");

    if (!newPassword) {
      setResetStatus("New password is required.");
      return;
    }

    if (!confirmPassword) {
      setResetStatus("Confirm new password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setResetStatus("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetStatus("Passwords do not match.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Updating...";
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setResetStatus(error.message);

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Update Password";
      }

      return;
    }

    setResetStatus("Password updated successfully. You can now log in.", "success");
    await supabase.auth.signOut();

    window.setTimeout(() => {
      window.location.href = "instructor-login.html";
    }, 2000);
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPasswordResetPage);
} else {
  initPasswordResetPage();
}
