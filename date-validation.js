/**
 * date-validation.js
 * Past-date booking guard and date range validator.
 *
 * Intercepts booking form submissions in the CAPTURE phase to ensure:
 * - Start date and end date are not in the past.
 * - End date is not before start date.
 * - Displays exact required error messaging.
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
      feedback.className = 'form-feedback form-feedback-error';
      feedback.style.color = '#ff4d4d';
    }

    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error';
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }
  }

  function validateDates(startValue, endValue) {
    const today = todayIsoDate();
    if (!startValue || startValue < today) {
      return "Enter a valid date. Bookings cannot be made for past dates.";
    }
    if (!endValue || endValue < today) {
      return "Enter a valid date. Bookings cannot be made for past dates.";
    }
    if (endValue < startValue) {
      return "Check the dates — the end date can't be before the start date.";
    }
    return null;
  }

  function init() {
    const startInput = document.getElementById('form-start');
    const endInput = document.getElementById('form-end');
    const form = document.getElementById('booking-form');

    if (!startInput || !form) return;

    const today = todayIsoDate();

    // Visual prevention in browser datepicker
    startInput.min = today;
    if (endInput) endInput.min = today;

    startInput.addEventListener('change', () => {
      if (endInput) {
        endInput.min = startInput.value && startInput.value > today ? startInput.value : today;
      }
    });

    // Hard guard: capture phase submit event listener
    form.addEventListener(
      'submit',
      (event) => {
        const startValue = startInput.value;
        const endValue = endInput ? endInput.value : '';
        const error = validateDates(startValue, endValue);
        if (error) {
          event.preventDefault();
          event.stopImmediatePropagation();
          showFeedback(error);
        }
      },
      true // capture phase
    );
  }

  // Export validateDates helper globally for app.js and tests.js if needed
  if (typeof window !== 'undefined') {
    window.DateValidation = { todayIsoDate, validateDates };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();