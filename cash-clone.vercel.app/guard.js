// guard.js - Authentication Guard (Subscription checks removed for unlimited access)

// This script MUST run first on every protected page to be effective.

(function () {
  const currentUserEmail = localStorage.getItem("lastAppUser");

  if (!currentUserEmail) {
    // If no user is logged in, they should be on the authentication page.
    // We only redirect if they are NOT already on the auth page to prevent a loop.
    if (!window.location.pathname.includes("authentication.html")) {
      window.location.replace("authentication.html");
    }
    return;
  }

  // Subscription checks removed - all authenticated users have unlimited access
})();
