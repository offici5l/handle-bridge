import { icons } from './icons.js';

function getIconUrl(code) {
  const value = icons[code.toUpperCase()];
  if (value) {
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${value}/info/logo.png`;
  } else {
    return null;
  }
}

const NODES = [
  "https://fio.twnodes.com"
];

const handleInput = document.getElementById('handleInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const heroSection = document.getElementById('heroSection');

let copiedTimeout = null;

async function copyToClipboard(text, btnElement) {
  try {
    await navigator.clipboard.writeText(text);
    showCopiedState(btnElement);
  } catch {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showCopiedState(btnElement);
  }
}

function showCopiedState(btnElement) {
  const originalHTML = btnElement.innerHTML;
  const originalClass = btnElement.className;

  if (btnElement.id === 'copyLinkBtn') {
    btnElement.innerHTML = 'Copied';
  } else {
    btnElement.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied
    `;
  }

  btnElement.classList.add(btnElement.classList.contains('action-button') ? 'success' : 'copied');

  if (copiedTimeout) clearTimeout(copiedTimeout);
  copiedTimeout = setTimeout(() => {
    btnElement.innerHTML = originalHTML;
    btnElement.className = originalClass;
  }, 2000);
}

async function fetchAddresses(handle) {
  const headers = { "Content-Type": "application/json" };
  const payload = { fio_address: handle };

  let lastError = null;

  for (const node of NODES) {
    try {
      const url = node.replace(/\/+$/, "") + "/v1/chain/get_pub_addresses";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      } else {
        let errorInfo;
        if (res.status === 404) {
          errorInfo = { message: 'Handle does not exist', type: 'not_found', state: 'empty' };
        } else if (res.status === 400) {
          errorInfo = { message: 'Invalid handle format', type: 'invalid_format', state: 'error' };
        } else {
          errorInfo = { message: `HTTP ${res.status}`, type: 'server_error', state: 'error' };
        }
        lastError = errorInfo;
      }
    } catch (e) {
      lastError = { message: e.name === 'AbortError' ? 'Request timeout' : 'Network error', type: 'network_error', state: 'error' };
      continue;
    }
  }

  throw new Error(JSON.stringify(lastError));
}

function renderState(title, message, state = 'error') {
  const icons = {
    error: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `,
    empty: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m15 9-6 6"></path>
        <path d="m9 9 6 6"></path>
      </svg>
    `
  };

  resultsContainer.innerHTML = `
    <div class="${state}-state">
      ${icons[state]}
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
}

function renderAddressList(addresses, fullAddress, shareUrl, isSharedLink = false) {
  let html = `
    <div class="results-section">
      <div class="results-header">
        <div class="results-title">
          <span class="handle-badge">${fullAddress}</span>
        </div>`;

  if (!isSharedLink) {
    html += `
        <div class="results-actions">
          <div class="share-link-container">
            <input type="text" class="share-link-input" value="${shareUrl}" readonly>
            <button class="share-btn" id="copyLinkBtn">Copy Link</button>
          </div>
        </div>
    `;
  }

  html += `</div>`;
  html += `<div class="addresses-grid" id="addressesGrid">`;

  addresses.forEach((item, index) => {
    if (item.chain_code === 'FIO' && item.token_code === 'FIO') return;
    const code = item.chain_code || item.token_code;
    const address = item.public_address;
    const iconUrl = getIconUrl(code);
    const icon = iconUrl ? `<img src="${iconUrl}" onerror="this.style.display='none';" alt="${code}">` : '';
    const qrSrc = `https://quickchart.io/qr?text=${encodeURIComponent(address)}&size=180&margin=1`;

    html += `
      <div class="address-card" data-index="${index}">
        <div class="card-header" data-card-index="${index}">
          <div class="card-header-left">
            <div class="coin-icon">${icon}</div>
            <div class="coin-info">
              <div class="coin-name">${code.toUpperCase()}</div>
              <div class="coin-meta">Chain: ${item.chain_code || 'N/A'} • Token: ${item.token_code || 'N/A'}</div>
            </div>
          </div>
          <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="card-body" data-body-index="${index}">
          <div class="address-display">${address}</div>
          <div class="card-actions">
            <button class="action-button copy-addr-btn" data-address="${address}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy Address
            </button>
            <button class="action-button qr-toggle-btn" data-qr-index="${index}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Show QR Code
            </button>
          </div>
          <div class="qr-section" data-qr-section="${index}">
            <img src="${qrSrc}" alt="QR Code" class="qr-image">
          </div>
        </div>
      </div>`;
  });

  html += `</div></div>`;

  resultsContainer.innerHTML = html;

  const copyLinkBtn = document.getElementById('copyLinkBtn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const shareUrlInput = document.querySelector('.share-link-input');
      shareUrlInput.select();
      copyToClipboard(shareUrlInput.value, copyLinkBtn);
    });
  }

  document.querySelectorAll('.card-header').forEach(header => {
    header.addEventListener('click', () => {
      const index = header.dataset.cardIndex;
      const card = header.closest('.address-card');
      const body = document.querySelector(`[data-body-index="${index}"]`);
      const chevron = header.querySelector('.chevron');

      const isOpen = card.classList.contains('open');
      if (isOpen) {
        card.classList.remove('open');
        body.classList.remove('show');
        chevron.classList.remove('rotated');
      } else {
        card.classList.add('open');
        body.classList.add('show');
        chevron.classList.add('rotated');
      }
    });
  });

  document.querySelectorAll('.copy-addr-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(btn.dataset.address, btn);
    });
  });

  document.querySelectorAll('.qr-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = btn.dataset.qrIndex;
      const qrSection = document.querySelector(`[data-qr-section="${index}"]`);
      const isShowing = qrSection.classList.contains('show');

      if (isShowing) {
        qrSection.classList.remove('show');
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Show QR Code`;
      } else {
        qrSection.classList.add('show');
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Hide QR Code`;
      }
    });
  });
}

async function handleLookup(handleFromUrl = null) {
  const username = handleFromUrl || handleInput.value.trim();
  if (!username) return;

  const fullAddress = username + '@trust';

  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';

  resultsContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Fetching handle...</p>
    </div>
  `;

  try {
    const data = await fetchAddresses(fullAddress);
    const allAddresses = data.public_addresses;
    const shareUrl = `${window.location.origin}/${username}`;

    renderAddressList(allAddresses, fullAddress, shareUrl, !!handleFromUrl);
  } catch (e) {
    const errorInfo = JSON.parse(e.message);
    renderState(errorInfo.message, 'Please check the handle and try again.', errorInfo.state);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Lookup';
  }
}

searchBtn.addEventListener('click', () => handleLookup());
handleInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLookup();
});

const urlHandle = decodeURIComponent(window.location.pathname.slice(1));
if (urlHandle) {
  const searchSection = document.querySelector('.search-section');
  const guideSection = document.querySelector('.guide-section');
  handleInput.value = urlHandle;
  heroSection.style.display = 'none';
  if(searchSection) searchSection.style.display = 'none';
  if(guideSection) guideSection.style.display = 'none';

  const footerLink = document.querySelector('footer a');
  if (footerLink) {
    footerLink.href = '/';
    footerLink.innerHTML = 'HandleBridge';
    footerLink.removeAttribute('target');
    footerLink.removeAttribute('rel');
  }

  setTimeout(() => handleLookup(urlHandle), 100);
}
