/**
 * footer-display.js
 * -----------------
 * An ultra-functional, standalone script to manage the balance display in the navigation footer.
 * It is portable and can be linked to any HTML page that contains the footer navigation structure.
 * It works immediately on page load and listens for real-time updates.
 */

(function () {
  "use strict";

  // --- Configuration ---
  // The key used to store the main balance in localStorage.
  const localStorageBalanceKey = "cashAppBalance";
  // The NEW, UNIQUE ID for the footer balance button element.
  const navBalanceElementId = "nav-balance-display";

  /**
   * Formats a number into a compact currency string (e.g., $100, $8.8K, $1.5M).
   * This function is an exact replica of the formatting logic for perfect consistency.
   * @param {number} amount - The numerical amount to format.
   * @returns {string} The formatted currency string.
   */
  function formatBalanceForFooter(amount) {
    if (amount >= 1e9) {
      // Billions
      return `$${(amount / 1e9).toFixed(1)}B`;
    }
    if (amount >= 1e6) {
      // Millions
      return `$${(amount / 1e6).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      // Thousands
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    // Below 1000
    return `$${Math.floor(amount)}`;
  }

  /**
   * Finds the footer balance element, gets the latest balance from localStorage,
   * formats it, and updates the display instantly.
   */
  function updateNavBalanceDisplay() {
    // Find the element on the page using its new, unique ID.
    const navBalanceEl = document.getElementById(navBalanceElementId);

    // CRITICAL: If the element doesn't exist on the current page, do nothing.
    // This makes the script safely portable to any HTML file.
    if (!navBalanceEl) {
      return;
    }

    // Get the balance from storage, or default to 0.00 if it doesn't exist.
    const savedBalance = localStorage.getItem(localStorageBalanceKey);
    const balance = parseFloat(savedBalance) || 0.0;

    // Update the button's text with the perfectly formatted balance.
    navBalanceEl.textContent = formatBalanceForFooter(balance);
  }

  // --- Event Listeners for Real-Time Updates ---

  // 1. Run immediately when the page's HTML has finished loading.
  // This ensures the balance appears INSTANTLY, with no delay.
  document.addEventListener("DOMContentLoaded", updateNavBalanceDisplay);

  // 2. Listen for the 'storage' event.
  // This allows the footer on one page (e.g., card.html) to automatically update
  // if the balance is changed on another page (e.g., home.html).
  window.addEventListener("storage", (event) => {
    if (event.key === localStorageBalanceKey) {
      updateNavBalanceDisplay();
    }
  });

  // 3. Listen for a custom 'balanceUpdated' event.
  // This allows other scripts on the SAME page to tell this script to update.
  // This is the most robust way to ensure same-page reactivity.
  window.addEventListener("balanceUpdated", updateNavBalanceDisplay);
})();
