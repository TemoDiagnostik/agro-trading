(function () {
  'use strict';

  const form = document.getElementById('commercialPartnerForm');
  const startedAt = document.getElementById('cpStartedAt');
  const challengeInput = document.getElementById('cpChallenge');
  const challengeLabel = document.getElementById('cpChallengeLabel');
  const languageInput = document.getElementById('cpLanguage');
  const status = document.getElementById('cpFormStatus');
  const professionalSummary = document.getElementById('cpProfessionalSummary');
  const summaryCounter = document.getElementById('cpSummaryCounter');

  if (!form || !startedAt || !challengeInput || !challengeLabel || !languageInput || !status) {
    return;
  }

  const firstNumber = Math.floor(Math.random() * 6) + 3;
  const secondNumber = Math.floor(Math.random() * 5) + 2;
  const expectedAnswer = firstNumber + secondNumber;
  const openedAt = Date.now();
  startedAt.value = String(openedAt);
  languageInput.value = document.documentElement.lang || 'en';

  function dictionaryValue(key, fallback) {
    return form.dataset[key] || fallback;
  }

  function updateChallengeLabel() {
    const language = document.documentElement.lang || 'en';
    const prompt = language === 'ar' ? 'فحص أمني' : 'Security check';
    challengeLabel.textContent = `${prompt}: ${firstNumber} + ${secondNumber} =`;
  }

  function updateSummaryCounter() {
    if (!professionalSummary || !summaryCounter) {
      return;
    }

    const minimum = Number(professionalSummary.minLength) || 40;
    const maximum = Number(professionalSummary.maxLength) || 1600;
    const current = professionalSummary.value.length;
    const remaining = Math.max(0, minimum - current);

    if (remaining > 0) {
      const template = dictionaryValue('summaryRemaining', '{count} more characters required.');
      summaryCounter.textContent = template.replace('{count}', String(remaining));
      summaryCounter.classList.remove('is-complete');
      return;
    }

    const template = dictionaryValue('summaryComplete', 'Minimum met · {current}/{maximum} characters.');
    summaryCounter.textContent = template
      .replace('{current}', String(current))
      .replace('{maximum}', maximum.toLocaleString(document.documentElement.lang || 'en'));
    summaryCounter.classList.add('is-complete');
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
    field.addEventListener('input', () => {
      field.setCustomValidity('');
      if (field === professionalSummary) {
        updateSummaryCounter();
      }
    });
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
      form.dataset.summaryRemaining = dictionary['cp.form.summaryCounterRemaining'] || '';
      form.dataset.summaryComplete = dictionary['cp.form.summaryCounterComplete'] || '';
    }

    languageInput.value = document.documentElement.lang || 'en';
    updateChallengeLabel();
    updateSummaryCounter();
  });

  updateChallengeLabel();
  updateSummaryCounter();

  form.addEventListener('submit', event => {
    event.preventDefault();
    form.classList.add('was-validated');
    status.textContent = '';
    status.className = 'cp-form-status';

    const honeypot = form.elements.namedItem('Website Confirmation');
    if (honeypot && honeypot.value) {
      showStatus('success', dictionaryValue('successMessage', 'Your email application is ready. Review it and press Send in your email app.'));
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

    setSubmitting(true);
    showStatus('sending', dictionaryValue('sendingMessage', 'Submitting your application securely…'));
    languageInput.value = document.documentElement.lang || 'en';

    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        setSubmitting(false);
        showStatus('error', dictionaryValue('errorMessage', 'The submission was not confirmed. Please try again or contact info@euroagritrading.eu.'));
      }
    }, 15000);

    form.submit();
  });

})();
