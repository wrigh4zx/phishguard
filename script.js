const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const resultPopups = document.querySelectorAll('.results');
const scanButtons = document.querySelectorAll('.scan-button');
const emailTextarea = document.getElementById('emailText');
const badKeyWords = {
  'urgent': 20,
  'verify your account': 25,
  'password': 30,
  'click here': 20,
  '.zip': 30,
  '.exe': 30
};

function hideAllPopups() {
  resultPopups.forEach(function(popup) {
    popup.classList.remove('show');
  });

  document.body.classList.remove('modal-open');
}

function armClickAnywhereClose() {
  setTimeout(function() {
    document.addEventListener('click', hideAllPopups, { once: true });
  }, 0);
}

function setRequiredState(input, button, isRequired) {
  if (!input || !button) {
    return;
  }

  input.classList.toggle('input-required', isRequired);
  button.classList.toggle('requires-input', isRequired);
}

scanButtons.forEach(function(button) {
  const input = document.getElementById(button.dataset.input);

  if (!input) {
    return;
  }

  const clearRequired = function() {
    if (input.value.trim().length > 0) {
      setRequiredState(input, button, false);
    }
  };

  input.addEventListener('input', clearRequired);
  input.addEventListener('change', clearRequired);
});

function autoResizeTextarea(textarea) {
  if (!textarea) {
    return;
  }

  textarea.style.height = 'auto';

  const maxHeight = parseFloat(getComputedStyle(textarea).maxHeight);
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

  textarea.style.height = nextHeight + 'px';
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

if (emailTextarea) {
  autoResizeTextarea(emailTextarea);
  emailTextarea.addEventListener('input', function() {
    autoResizeTextarea(emailTextarea);
  });
  emailTextarea.addEventListener('change', function() {
    autoResizeTextarea(emailTextarea);
  });
  window.addEventListener('resize', function() {
    autoResizeTextarea(emailTextarea);
  });
}

function validateRequiredInput(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);

  if (!input || !button) {
    return false;
  }

  const isEmpty = input.value.trim().length === 0;
  setRequiredState(input, button, isEmpty);
  return !isEmpty;
}

tabButtons.forEach(function(button) {
  button.addEventListener('click', function() {
    const targetTab = button.dataset.tab;
    hideAllPopups();

    tabButtons.forEach(function(tabButton) {
      const isActive = tabButton === button;
      tabButton.classList.toggle('active', isActive);
      tabButton.setAttribute('aria-selected', String(isActive));
    });

    tabPanels.forEach(function(panel) {
      const isActive = panel.id === 'panel-' + targetTab;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
  });
});

function setScanResult(resultId, reasonsId, score, maxScore, label, reasons, classes) {
  const result = document.getElementById(resultId);
  const reasonsList = document.getElementById(reasonsId);
  const popup = result.closest('.results');

  reasonsList.innerHTML = '';
  result.className = '';

  if (classes) {
    result.classList.add(classes);
  }

  if (popup) {
    popup.classList.add('show');
    document.body.classList.add('modal-open');
    armClickAnywhereClose();
  }

  result.textContent = label + ': ' + score + '/' + maxScore;

  if (reasons.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No major issues detected.';
    reasonsList.appendChild(li);
    return;
  }

  reasons.forEach(function(reason) {
    const li = document.createElement('li');
    li.textContent = reason;
    reasonsList.appendChild(li);
  });
}

function scanEmail() {
  if (!validateRequiredInput('emailText', 'emailScanButton')) {
    return;
  }

  const email = document.getElementById('emailText').value.toLowerCase();
  let score = 0;
  let reasons = [];

  for (const [key, value] of Object.entries(badKeyWords)) {
    if (email.includes(key)) {
      score += value;
      reasons.push(`Contains suspicious language: ${key}`);
    }
  }
   

  if (score >= 60) {
    setScanResult('emailResult', 'emailReasons', score, 100, 'Risk Score', reasons, 'danger');
  } else if (score >= 30) {
    setScanResult('emailResult', 'emailReasons', score, 100, 'Risk Score', reasons, 'warning');
  } else {
    setScanResult('emailResult', 'emailReasons', score, 100, 'Risk Score', reasons, 'safe');
  }
}

function scanUrl() {
  if (!validateRequiredInput('urlInput', 'urlScanButton')) {
    return;
  }

  const rawUrl = document.getElementById('urlInput').value.trim();
  const lowered = rawUrl.toLowerCase();
  let score = 0;
  const reasons = [];

  if (lowered.startsWith('http://')) {
    score += 20;
    reasons.push('Uses an unencrypted HTTP link');
  }

  if (lowered.includes('bit.ly') || lowered.includes('tinyurl') || lowered.includes('t.co')) {
    score += 20;
    reasons.push('Uses a shortened link');
  }

  if (lowered.includes('@') || lowered.includes('login') || lowered.includes('verify')) {
    score += 25;
    reasons.push('Contains login or verification language');
  }

  if (lowered.split('/')[2] && lowered.split('/')[2].length > 35) {
    score += 15;
    reasons.push('Domain looks unusually long or complex');
  }

  setScanResult('urlResult', 'urlReasons', Math.min(score, 100), 100, 'URL risk', reasons, score >= 60 ? 'danger' : score >= 30 ? 'warning' : 'safe');
}

function scanAttachment() {
  if (!validateRequiredInput('attachmentInput', 'attachmentScanButton')) {
    return;
  }

  const attachment = document.getElementById('attachmentInput').value.trim().toLowerCase();
  let score = 0;
  const reasons = [];

  if (attachment.includes('.exe') || attachment.includes('.js') || attachment.includes('.scr')) {
    score += 45;
    reasons.push('Contains a high-risk executable extension');
  }

  if (attachment.includes('.zip') || attachment.includes('.rar') || attachment.includes('.iso')) {
    score += 20;
    reasons.push('Uses a compressed or disk image format');
  }

  if (attachment.includes('invoice') || attachment.includes('urgent') || attachment.includes('payment')) {
    score += 15;
    reasons.push('Looks like a common bait filename');
  }

  setScanResult('attachmentResult', 'attachmentReasons', Math.min(score, 100), 100, 'Attachment risk', reasons, score >= 60 ? 'danger' : score >= 30 ? 'warning' : 'safe');
}

function checkPassword() {
  if (!validateRequiredInput('passwordInput', 'passwordScanButton')) {
    return;
  }

  const password = document.getElementById('passwordInput').value;
  let score = 0;
  const reasons = [];

  if (password.length >= 12) {
    score += 35;
  } else if (password.length >= 8) {
    score += 20;
    reasons.push('Longer passwords are stronger');
  } else {
    reasons.push('Password is too short');
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 15;
  } else {
    reasons.push('Use both lowercase and uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 15;
  } else {
    reasons.push('Add at least one number');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 20;
  } else {
    reasons.push('Add a symbol for more entropy');
  }

  if (/password|123456|qwerty|letmein/i.test(password)) {
    score -= 30;
    reasons.push('Avoid common or reused passwords');
  }

  setScanResult('passwordResult', 'passwordReasons', Math.max(0, Math.min(score, 100)), 100, 'Password strength', reasons, score >= 70 ? 'safe' : score >= 40 ? 'warning' : 'danger');
}

function checkBreach() {
  if (!validateRequiredInput('breachInput', 'breachScanButton')) {
    return;
  }

  const email = document.getElementById('breachInput').value.trim().toLowerCase();
  let score = 0;
  const reasons = [];

  const hash = email.split('').reduce(function(total, character) {
    return total + character.charCodeAt(0);
  }, 0);

  if (hash % 2 === 0) {
    score = 65;
    reasons.push('Simulated breach hit detected for this address');
    reasons.push('Change passwords and enable multi-factor authentication');
  } else {
    score = 15;
    reasons.push('No simulated breach match found');
    reasons.push('Keep monitoring for credential reuse and leaks');
  }

  setScanResult('breachResult', 'breachReasons', score, 100, 'Breach exposure', reasons, score >= 60 ? 'danger' : score >= 30 ? 'warning' : 'safe');
}

document.getElementById('emailScanButton').addEventListener('click', scanEmail);
document.getElementById('urlScanButton').addEventListener('click', scanUrl);
document.getElementById('attachmentScanButton').addEventListener('click', scanAttachment);
document.getElementById('passwordScanButton').addEventListener('click', checkPassword);
document.getElementById('breachScanButton').addEventListener('click', checkBreach);