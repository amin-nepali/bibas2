/**
 * Loading Spinner Controller
 * Manages animated loading overlay
 */

class LoadingSpinner {
  constructor() {
    this.overlay = null;
    this.isVisible = true;
    this.init();
  }

  init() {
    // Create loading overlay if it doesn't exist
    if (!document.getElementById('loadingOverlay')) {
      this.createOverlay();
    } else {
      this.overlay = document.getElementById('loadingOverlay');
    }

    // Show spinner initially
    this.show();

    // Hide spinner when page is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.hide());
    } else {
      // Page already loaded
      this.hide();
    }

    // Also hide after a timeout (safety measure)
    setTimeout(() => {
      if (this.isVisible) {
        this.hide();
      }
    }, 5000);

    // Hide on window load
    window.addEventListener('load', () => this.hide());
  }

  createOverlay() {
    // Create main overlay container
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';

    // Create spinner container
    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'loading-spinner';

    // Create spinner circle
    const spinnerCircle = document.createElement('div');
    spinnerCircle.className = 'spinner-circle';

    // Create loading text
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'LOADING';

    // Assemble elements
    spinnerContainer.appendChild(spinnerCircle);
    spinnerContainer.appendChild(loadingText);
    overlay.appendChild(spinnerContainer);

    // Add to body (at the very beginning)
    document.body.insertBefore(overlay, document.body.firstChild);

    this.overlay = overlay;
  }

  show() {
    if (this.overlay) {
      this.overlay.classList.remove('hidden', 'fade-out');
      this.isVisible = true;
      console.log('✅ Loading spinner shown');
    }
  }

  hide() {
    if (this.overlay && this.isVisible) {
      this.overlay.classList.add('fade-out');
      
      // Remove after animation completes
      setTimeout(() => {
        if (this.overlay) {
          this.overlay.classList.add('hidden');
          this.isVisible = false;
          console.log('✅ Loading spinner hidden');
        }
      }, 500);
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize spinner on script load
const spinner = new LoadingSpinner();

// Make globally available
window.spinner = spinner;

// Also hide spinner when DOM is interactive
if (document.readyState === 'interactive') {
  spinner.hide();
}
