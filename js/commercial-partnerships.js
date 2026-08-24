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

  const applicationFields = [
    'Full Name',
    'Company or Independent Status',
    'Country',
    'European Markets Covered',
    'Email',
    'LinkedIn Profile or Website',
    'Years of Relevant Experience',
    'Relevant Product Categories',
    'Buyer Types Covered',
    'Short Professional Summary',
    'Relevant Transaction Experience',
    'Commission-only independent cooperation accepted',
    'Existing European market relationships confirmed',
    'Privacy consent'
  ];

  function buildEmailBody() {
    const lines = [
      'COMMERCIAL PARTNERSHIP APPLICATION',
      'Euro Agri Trading s.r.o.',
      '',
      'Application type: Independent Fertilizer Business Development Partner / Commercial Introducer',
      ''
    ];

    applicationFields.forEach(fieldName => {
      const field = form.elements.namedItem(fieldName);
      const value = field && field.type === 'checkbox'
        ? (field.checked ? 'Yes' : 'No')
        : (field && field.value ? field.value.trim() : 'Not provided');

      lines.push(`${fieldName}:`);
      lines.push(value);
      lines.push('');
    });

    lines.push('This application was prepared on euroagritrading.eu and sent directly from the applicant\'s email account.');
    return lines.join('\r\n');
  }

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
    showStatus('sending', dictionaryValue('sendingMessage', 'Preparing your email application…'));

    const subject = 'Commercial Partnership Application — Euro Agri Trading';
    const body = buildEmailBody();
    const mailtoLink = `mailto:info@euroagritrading.eu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    showStatus('success', dictionaryValue('successMessage', 'Your email application is ready. Review it and press Send in your email app.'));
    setSubmitting(false);
    window.location.href = mailtoLink;
  });

})();
