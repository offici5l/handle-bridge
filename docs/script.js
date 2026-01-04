import { icons } from './icons.js';

const NODES = ["https://fio.twnodes.com"];

const UI = {
  hero: document.getElementById('heroSection'),
  searchSection: document.getElementById('searchSection'),
  input: document.getElementById('handleInput'),
  searchBtn: document.getElementById('searchBtn'),
  results: document.getElementById('resultsContainer'),
  grid: document.getElementById('addressesGrid'),
  loading: document.getElementById('loadingState'),
  error: document.getElementById('errorState'),
  displayHandle: document.getElementById('displayHandle'),
  avatar: document.getElementById('avatarLetter'),
  shareBtn: document.getElementById('shareProfileBtn'),
  toast: document.getElementById('toast'),
  retryBtn: document.getElementById('retryBtn')
};

function init() {
  const path = window.location.pathname.replace(/^\/|\/$/g, '');

  if (path && path !== 'index.html') {
    loadHandle(decodeURIComponent(path));
  }

  UI.searchBtn.addEventListener('click', () => triggerSearch());
  UI.input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSearch();
  });

  UI.retryBtn.addEventListener('click', () => {
    UI.error.classList.add('hidden');
    UI.searchSection.classList.remove('hidden');
    UI.input.focus();
  });

  UI.shareBtn.addEventListener('click', () => {
    const url = window.location.href;
    copyToClipboard(url, 'Profile link copied!');
  });

  window.addEventListener('popstate', () => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    if (path && path !== 'index.html') {
      loadHandle(decodeURIComponent(path));
    } else {
      resetUI();
    }
  });
}

function triggerSearch() {
  const val = UI.input.value.trim();
  if (val) {
    history.pushState({}, '', `/${val}`);
    loadHandle(val);
  }
}

function resetUI() {
  UI.hero.classList.remove('hidden');
  UI.searchSection.classList.remove('hidden');
  UI.results.classList.add('hidden');
  UI.error.classList.add('hidden');
  UI.loading.classList.add('hidden');
  UI.input.value = '';
}

async function loadHandle(handle) {
  UI.input.value = handle;
  UI.hero.classList.add('hidden');
  UI.searchSection.classList.add('hidden');
  UI.results.classList.add('hidden');
  UI.error.classList.add('hidden');
  UI.loading.classList.remove('hidden');

  try {
    const data = await fetchAddresses(handle + '@trust');
    const sortedData = sortAddresses(data.public_addresses);

    UI.displayHandle.textContent = handle;
    UI.avatar.textContent = handle.charAt(0).toUpperCase();

    renderList(sortedData);

    UI.loading.classList.add('hidden');
    UI.results.classList.remove('hidden');
  } catch (e) {
    UI.loading.classList.add('hidden');
    showError(e.message);
  }
}

async function fetchAddresses(fullHandle) {
  const payload = { fio_address: fullHandle };
  for (const node of NODES) {
    try {
      const res = await fetch(`${node}/v1/chain/get_pub_addresses`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
      if (res.status === 404) throw new Error('Handle not found');
    } catch (e) {
      if (e.message === 'Handle not found') throw e;
      continue;
    }
  }
  throw new Error('Could not connect to FIO node');
}

function sortAddresses(list) {
  return list.sort((a, b) => {
    const codeA = (a.token_code || a.chain_code).toUpperCase();
    const codeB = (b.token_code || b.chain_code).toUpperCase();
    return codeA.localeCompare(codeB);
  });
}

function getDeepLink(chain, address, token_code) {
  const code = (token_code || chain || '').toLowerCase();
  if (!code) return null;
  return `${code}:${address}`;
}

function renderList(list) {
  UI.grid.innerHTML = '';
  if (list.length === 0) {
    UI.grid.innerHTML = '<div style="text-align:center; color:var(--text-sub); padding:2rem;">No coins found</div>';
    return;
  }

  list.forEach((item) => {
    if (item.chain_code === 'FIO' && item.token_code === 'FIO') return;

    const code = (item.token_code || item.chain_code).toUpperCase();
    const chain = (item.chain_code || '').toUpperCase();
    const iconKey = icons[code] ? icons[code] : (icons[chain] || 'fio');
    const iconUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${iconKey}/info/logo.png`;

    const card = document.createElement('div');
    card.className = 'coin-card';
    card.innerHTML = `
      <div class="card-top">
        <img src="${iconUrl}" class="coin-logo" onerror="this.src='https://via.placeholder.com/40'">
        <div class="coin-meta">
          <span class="coin-name">${code}</span>
          <span class="chain-name">${chain} Network</span>
        </div>
        <svg class="dropdown-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div class="card-content">
        <div class="address-box">${item.public_address}</div>
        <div class="actions">
          <button class="btn btn-secondary copy-btn" data-addr="${item.public_address}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy
          </button>
          <button class="btn btn-secondary qr-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            QR
          </button>
        </div>
        <div class="qr-container"></div>
      </div>
    `;

    const content = card.querySelector('.card-content');
    const qrContainer = card.querySelector('.qr-container');
    const icon = card.querySelector('.dropdown-icon');

    const sendLink = getDeepLink(item.chain_code, item.public_address, item.token_code);
    if (sendLink) {
      const actions = card.querySelector('.actions');
      const sendBtn = document.createElement('a');
      sendBtn.className = 'btn btn-primary';
      sendBtn.href = sendLink;
      sendBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        Send
      `;
      actions.prepend(sendBtn);
    }

    card.querySelector('.card-top').addEventListener('click', () => {
      const isOpen = content.classList.contains('active');
      content.classList.toggle('active');
      icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      if (!isOpen) content.style.display = 'block';
      else setTimeout(() => content.style.display = 'none', 300);
    });

    card.querySelector('.copy-btn').addEventListener('click', (e) => {
      copyToClipboard(item.public_address);
    });

    card.querySelector('.qr-btn').addEventListener('click', () => {
      qrContainer.classList.toggle('active');
      if (qrContainer.classList.contains('active') && !qrContainer.hasChildNodes()) {
        new QRCode(qrContainer, {
          text: item.public_address,
          width: 150,
          height: 150
        });
      }
    });

    UI.grid.appendChild(card);
  });
}

function showToast(msg) {
  UI.toast.textContent = msg;
  UI.toast.classList.add('show');
  setTimeout(() => UI.toast.classList.remove('show'), 3000);
}

function copyToClipboard(text, msg = 'Address copied!') {
  navigator.clipboard.writeText(text).then(() => showToast(msg));
}

function showError(msg) {
  UI.searchSection.classList.add('hidden');
  UI.error.classList.remove('hidden');
  document.getElementById('errorMsg').textContent = msg;
}

init();