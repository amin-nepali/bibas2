document.addEventListener("DOMContentLoaded", () => {
  const homeSavingsBalance = document.getElementById("home-savings-balance");
  const progressRing = document.getElementById("home-savings-progress-ring");

  const localStorageSavingsKey = "cashAppSavings";
  const savingsGoal = 10000.0; // Default goal

  const formatCurrency = (amount) =>
    `$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  function updateHomeSavingsCard() {
    const savedSavings = localStorage.getItem(localStorageSavingsKey);
    const currentSavings = parseFloat(savedSavings) || 0.0;

    homeSavingsBalance.textContent = formatCurrency(currentSavings);

    const radius = progressRing.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;

    const progress = savingsGoal > 0 ? currentSavings / savingsGoal : 0;
    const offset = circumference - progress * circumference;
    progressRing.style.strokeDashoffset = offset;
  }

  // Initial load
  updateHomeSavingsCard();

  // Listen for changes from other pages
  window.addEventListener("storage", (e) => {
    if (e.key === localStorageSavingsKey) {
      updateHomeSavingsCard();
    }
  });
});
