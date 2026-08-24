(function () {
  'use strict';

  const form = document.getElementById('commercialPartnerForm');
  const startedAt = document.getElementById('cpStartedAt');
  const challengeInput = document.getElementById('cpChallenge');
  const challengeLabel = document.getElementById('cpChallengeLabel');
  const status = document.getElementById('cpFormStatus');

  if (!form || !startedAt || !challengeInput || !challengeLabel || !status) {
    return;
  }

  const firstNumber = Math.floor(Math.random() * 6) + 3;
  const secondNumber = Math.floor(Math.random() * 5) + 2;
  const expectedAnswer = firstNumber + secondNumber;
  const openedAt = Date.now();
  startedAt.value = new Date(openedAt).toISOString();

  function dictionaryValue(key, fallback) {
    return form.dataset[key] || fallback;
  }

  function updateChallengeLabel() {
    const language = document.documentElement.lang || 'en';
    const prompt = language === 'ar' ? 'فحص أمني' : 'Security check';
    challengeLabel.textContent = `${prompt}: ${firstNumber} + ${secondNumber} =`;
  }

  function showStatus(type, message) {
    status.className = `cp-form-status is-${type}`;
    status.textContent = message;
  }

  function setSubmitting(isSubmitting) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = isSubmitting;
    button.setAttribute('aria-busy', String(isSubmitting));
  }

  function setValidationMessage(field, key, fallback) {
    if (!field.validity.valid) {
      field.setCustomValidity(dictionaryValue(key, fallback));
    }
  }

  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('input', () => field.setCustomValidity(''));
    field.addEventListener('change', () => field.setCustomValidity(''));
  });

  document.addEventListener('euroagri:languagechange', event => {
    const dictionary = event.detail && event.detail.dictionary;

    if (dictionary) {
      form.dataset.requiredMessage = dictionary['cp.form.validation.required'] || '';
      form.dataset.challengeMessage = dictionary['cp.form.validation.challenge'] || '';
      form.dataset.fastMessage = dictionary['cp.form.validation.fast'] || '';
      form.dataset.rateMessage = dictionary['cp.form.validation.rate'] || '';
      form.dataset.sendingMessage = dictionary['cp.form.sending'] || '';
      form.dataset.successMessage = dictionary['cp.form.success'] || '';
      form.dataset.errorMessage = dictionary['cp.form.error'] || '';
    }

    updateChallengeLabel();
  });

  updateChallengeLabel();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    status.textContent = '';
    status.className = 'cp-form-status';

    const honeypot = form.elements.namedItem('Website Confirmation');
    if (honeypot && honeypot.value) {
      showStatus('success', dictionaryValue('successMessage', 'Thank you. Your application has been received for review.'));
      form.reset();
      return;
    }

    form.querySelectorAll('[required]').forEach(field => {
      setValidationMessage(field, 'requiredMessage', 'Please complete this required field.');
    });

    if (Number(challengeInput.value) !== expectedAnswer) {
      challengeInput.setCustomValidity(dictionaryValue('challengeMessage', 'Please enter the correct security-check answer.'));
    }

    if (!form.reportValidity()) {
      return;
    }

    if (Date.now() - openedAt < 6000) {
      showStatus('error', dictionaryValue('fastMessage', 'Please review the form before submitting.'));
      return;
    }

    try {
      const lastSubmission = Number(localStorage.getItem('eat_cp_last_submission') || 0);
      if (lastSubmission && Date.now() - lastSubmission < 60000) {
        showStatus('error', dictionaryValue('rateMessage', 'Please wait before submitting another application.'));
        return;
      }
    } catch (error) {
      // Continue if browser storage is unavailable.
    }

    setSubmitting(true);
    showStatus('sending', dictionaryValue('sendingMessage', 'Submitting your application securely…'));

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      const result = await response.json();
      const succeeded = response.ok && (result.success === true || result.success === 'true');

      if (!succeeded) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      try {
        localStorage.setItem('eat_cp_last_submission', String(Date.now()));
      } catch (error) {
        // Submission is already complete.
      }

      form.reset();
      challengeInput.value = '';
      showStatus('success', dictionaryValue('successMessage', 'Thank you. Your application has been received for confidential review.'));
    } catch (error) {
      console.error('Commercial partnership form submission failed.', error);
      showStatus('error', dictionaryValue('errorMessage', 'We could not submit the application. Please try again or contact info@euroagritrading.eu.'));
    } finally {
      setSubmitting(false);
    }
  });

  const moreItem = document.querySelector('.nav-more');
  const moreTrigger = document.querySelector('.more-trigger');

  if (moreItem && moreTrigger) {
    moreTrigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = moreItem.classList.toggle('open');
      moreTrigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', event => {
      if (!moreItem.contains(event.target)) {
        moreItem.classList.remove('open');
        moreTrigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        moreItem.classList.remove('open');
        moreTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
