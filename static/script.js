const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const resultPopups = document.querySelectorAll('.results');
const scanButtons = document.querySelectorAll('.scan-button');
const appContent = document.querySelector('.app-content');
const emailAttachmentInput = document.getElementById('emailAttachment');
const emailAttachmentName = document.getElementById('emailAttachmentName');
const removeEmailAttachmentButton = document.getElementById('removeEmailAttachment');
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

  if (appContent) {
    appContent.classList.remove('dimmed');
  }

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

  if (input.type === 'file') {
    const uploadBox = input.parentElement ? input.parentElement.querySelector('.upload-box') : null;

    if (uploadBox) {
      uploadBox.classList.toggle('is-required', isRequired);
    }
  }
}

function hasInputValue(input) {
  if (!input) {
    return false;
  }

  if (input.type === 'file') {
    return Boolean(input.files && input.files.length > 0);
  }

  if (typeof input.value === 'string') {
    return input.value.trim().length > 0;
  }

  return Boolean(input.value);
}

function updateEmailAttachmentUi() {
  if (!emailAttachmentInput || !emailAttachmentName || !removeEmailAttachmentButton) {
    return;
  }

  const file = emailAttachmentInput.files && emailAttachmentInput.files[0] ? emailAttachmentInput.files[0] : null;

  emailAttachmentName.textContent = file ? file.name : 'No file selected';
  removeEmailAttachmentButton.hidden = !file;
}

function clearEmailAttachment() {
  if (!emailAttachmentInput) {
    return;
  }

  emailAttachmentInput.value = '';
  updateEmailAttachmentUi();
}

function getRiskClass(score) {
  if (score >= 80) {
    return 'danger';
  }

  if (score >= 60) {
    return 'warning';
  }

  return 'safe';
}

scanButtons.forEach(function(button) {
  const input = document.getElementById(button.dataset.input);

  if (!input) {
    return;
  }

  const clearRequired = function() {
    if (hasInputValue(input)) {
      setRequiredState(input, button, false);
    }
  };

  input.addEventListener('input', clearRequired);
  input.addEventListener('change', clearRequired);
});

if (emailAttachmentInput) {
  emailAttachmentInput.addEventListener('change', function() {
    updateEmailAttachmentUi();
  });
}

if (removeEmailAttachmentButton) {
  removeEmailAttachmentButton.addEventListener('click', function() {
    clearEmailAttachment();
    setRequiredState(emailAttachmentInput, document.getElementById('emailScanButton'), true);
  });
}

if (emailAttachmentInput) {
  setRequiredState(emailAttachmentInput, document.getElementById('emailScanButton'), true);
  updateEmailAttachmentUi();
}

function validateRequiredInput(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);

  if (!input || !button) {
    return false;
  }

  const isEmpty = !hasInputValue(input);
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
  const riskClass = getRiskClass(score);

  reasonsList.innerHTML = '';
  result.className = '';

  result.classList.add(riskClass);

  if (popup) {
    popup.classList.add('show');
    if (appContent) {
      appContent.classList.add('dimmed');
    }
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
async function scanEmail() {
  if (!validateRequiredInput('emailAttachment', 'emailScanButton')) {
    return;
  }

  const file = emailAttachmentInput?.files?.[0];

  if (!file) {
    setRequiredState(
      emailAttachmentInput,
      document.getElementById('emailScanButton'),
      true
    );
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/scan", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    setScanResult(
      "emailResult",
      "emailReasons",
      result.score,
      100,
      "Attachment risk",
      result.reasons,
      getRiskClass(result.score)
    );
  } catch (error) {
    setScanResult(
      "emailResult",
      "emailReasons",
      100,
      100,
      "Error",
      ["Unable to communicate with the Flask server."],
      "danger"
    );
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

  const suspiciousTlds = ['.zip', '.mov', '.xyz', '.top', '.click', '.work', '.tk', '.ml', '.ga', '.cf', '.gq', '.ru'];
  const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly'];

  const urlForParsing = lowered.startsWith('http://') || lowered.startsWith('https://')
    ? lowered
    : 'https://' + lowered;

  let domain = '';
  let path = '';

  try {
    const parsedUrl = new URL(urlForParsing);
    domain = parsedUrl.hostname;
    path = parsedUrl.pathname + parsedUrl.search;
  } catch (error) {
    score += 30;
    reasons.push('URL format is invalid or suspicious');
  }

  if (lowered.startsWith('http://')) {
    score += 20;
    reasons.push('Uses HTTP instead of HTTPS');
  }

  if (shorteners.some(shortener => domain.includes(shortener))) {
    score += 25;
    reasons.push('Uses a shortened URL');
  }

  if (suspiciousTlds.some(tld => domain.endsWith(tld))) {
    score += 20;
    reasons.push('Uses a suspicious domain ending');
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
    score += 30;
    reasons.push('Uses an IP address instead of a normal domain');
  }

  if (domain.includes('xn--')) {
    score += 30;
    reasons.push('May use lookalike/homograph characters');
  }

  if ((domain.match(/\./g) || []).length >= 3) {
    score += 15;
    reasons.push('Has too many subdomains');
  }

  if (domain.length > 35) {
    score += 15;
    reasons.push('Domain is unusually long');
  }

  if (lowered.includes('@')) {
    score += 25;
    reasons.push('Uses @ symbol to hide the real destination');
  }

  if (path.includes('login') || path.includes('verify') || path.includes('account') || path.includes('password')) {
    score += 25;
    reasons.push('URL path contains login or account-related words');
  }

  if (path.includes('%') || path.includes('=') || path.includes('?')) {
    score += 10;
    reasons.push('URL contains encoded or tracking parameters');
  }

  if (/(paypal|apple|microsoft|google|amazon|bank|netflix|facebook|instagram|cashapp|venmo)/.test(domain)
      && !/(paypal\.com|apple\.com|microsoft\.com|google\.com|amazon\.com|netflix\.com|facebook\.com|instagram\.com|cash\.app|venmo\.com)$/.test(domain)) {
    score += 35;
    reasons.push('Domain may be impersonating a trusted brand');
  }

  setScanResult(
    'urlResult',
    'urlReasons',
    Math.min(score, 100),
    100,
    'URL risk',
    reasons,
    score >= 60 ? 'danger' : score >= 30 ? 'warning' : 'safe'
  );
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