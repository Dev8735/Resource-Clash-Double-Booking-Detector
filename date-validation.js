/**
 * Past-date booking guard.
 *
 * Added as a separate, additive script so it works regardless of how the
 * existing booking-submit logic in app.js is structured internally — it
 * intercepts the form submission in the CAPTURE phase, before app.js's own
 * listener runs, and blocks it if the start date is before today.
 *
 * Load this AFTER app.js in index.html.
 */
(function () {
  function todayIsoDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function showFeedback(message) {
    const feedback = document.getElementById('form-feedback');
    if (feedback) {
      feedback.textContent = message;
      feedback.classList.add('form-feedback-error');
      feedback.style.color = '#ff5c5c'; // fallback inline color in case the class isn't styled
    }

    // Also use the existing toast system if present, for consistency with
    // how other messages in the app are shown.
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error';
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }
  }

  function init() {
    const startInput = document.getElementById('form-start');
    const endInput = document.getElementById('form-end');
    const form = document.getElementById('booking-form');

    if (!startInput || !form) return; // safety guard, do nothing if markup changes

    const today = todayIsoDate();

    // Visual prevention: browser date-picker won't offer past dates at all.
    startInput.min = today;
    if (endInput) endInput.min = today;

    // Keep the end-date minimum in sync as the user changes the start date.
    startInput.addEventListener('change', () => {
      if (endInput) {
        endInput.min = startInput.value && startInput.value > today ? startInput.value : today;
      }
    });

    // Hard guard: block submission if a past date somehow gets through
    // (manual typing, browser quirks, etc.), BEFORE app.js's own submit
    // handler runs.
    form.addEventListener(
      'submit',
      (event) => {
        const startValue = startInput.value;
        if (!startValue || startValue < todayIsoDate()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          showFeedback('Enter a valid start date — bookings cannot start in the past.');
        }
      },
      true // capture phase: runs before app.js's listener
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();