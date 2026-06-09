let userId = null;
let appId = "936619743392459"; // Standard Instagram App ID fallback
let viewerInfo = null;

let followers = [];
let following = [];
let prevFollowers = []; // Used to check unfollowers

let unfollowers = [];
let notFollowingBack = [];

let scanState = 'idle'; // idle, running, cancelled
let abortController = null;
let delaySeconds = 1.0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

document.addEventListener('DOMContentLoaded', () => {
  checkLogin();
  setupEventListeners();
});

// Check Instagram Session
function checkLogin() {
  chrome.cookies.get({ url: 'https://www.instagram.com', name: 'ds_user_id' }, (cookie) => {
    if (cookie && cookie.value) {
      userId = cookie.value;
      loadSavedData();
      initializeProfile();
    } else {
      showLoginRequired();
    }
  });
}

function showLoginRequired() {
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; background-color: #121214; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; height: 100vh; width: 100vw; margin:0;">
      <div style="background: #1a1a1e; padding: 32px; border-radius: 12px; border: 1px solid #2d2d34; max-width: 400px; text-align: center;">
        <h2 style="margin-top: 0; color: #fff;">Instagram Login Required</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">Please log in to Instagram in your browser, then reload this page.</p>
        <a href="https://www.instagram.com" target="_blank" style="display: inline-block; background-color: #a855f7; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">Log In to Instagram</a>
        <button onclick="window.location.reload()" style="display: block; margin: 16px auto 0; background: none; border: none; color: #a855f7; cursor: pointer; text-decoration: underline;">Reload Page</button>
      </div>
    </div>
  `;
}

// Load cache from chrome.storage.local
function loadSavedData() {
  chrome.storage.local.get(['followers', 'following', 'lastScanTime', 'delaySeconds'], (result) => {
    if (result.followers) followers = result.followers;
    if (result.following) following = result.following;
    if (result.delaySeconds) {
      delaySeconds = result.delaySeconds;
      document.getElementById('setting-delay').value = delaySeconds;
    }
    
    const timeText = result.lastScanTime ? `Last scan: ${new Date(result.lastScanTime).toLocaleString()}` : 'Last scan: Never';
    updateHeaderStatus(timeText);
    
    if (followers.length > 0 || following.length > 0) {
      prevFollowers = [...followers]; // Save baseline snapshot
      computeRelationships();
      renderUI();
    }
  });
}

function updateHeaderStatus(text) {
  const infoEl = document.getElementById('user-info');
  if (!infoEl) return;
  
  if (viewerInfo) {
    infoEl.textContent = `Logged in as @${viewerInfo.username} | ${text}`;
  } else {
    infoEl.textContent = `User: ${userId} | ${text}`;
  }
}

// Scrape Viewer Details
async function initializeProfile() {
  try {
    const homeResponse = await fetch('https://www.instagram.com/', { credentials: 'include' });
    const homeHtml = await homeResponse.text();
    const appIdMatch = homeHtml.match(/"appId":"(\d+)"/);
    if (appIdMatch && appIdMatch[1]) {
      appId = appIdMatch[1];
    }
    
    const profileResponse = await fetch(`https://www.instagram.com/api/v1/users/${userId}/info/`, {
      headers: { 'X-IG-App-ID': appId },
      credentials: 'include'
    });
    
    if (profileResponse.ok) {
      const profileJson = await profileResponse.json();
      if (profileJson.user) {
        viewerInfo = {
          username: profileJson.user.username,
          fullName: profileJson.user.full_name,
          profilePicUrl: profileJson.user.profile_pic_url
        };
        chrome.storage.local.get(['lastScanTime'], (res) => {
          const timeText = res.lastScanTime ? `Last scan: ${new Date(res.lastScanTime).toLocaleString()}` : 'Last scan: Never';
          updateHeaderStatus(timeText);
        });
      }
    }
  } catch (err) {
    console.error('Could not fetch profile info:', err);
  }
}

// Compute Relationship Diff lists
function computeRelationships() {
  const followersMap = new Map(followers.map(u => [u.id, u]));
  
  // 1. Not following back (You follow them, they don't follow you back)
  notFollowingBack = following.filter(u => !followersMap.has(u.id));

  // 2. Unfollowers (They were in prevFollowers, but not in current followers list)
  if (prevFollowers.length > 0) {
    const currentFollowersSet = new Set(followers.map(u => u.id));
    unfollowers = prevFollowers.filter(u => !currentFollowersSet.has(u.id));
  } else {
    unfollowers = [];
  }
}

// Render Lists to DOM
function renderUI() {
  document.getElementById('count-unfollowers').textContent = unfollowers.length;
  document.getElementById('count-not-following-back').textContent = notFollowingBack.length;

  renderList('list-unfollowers', unfollowers, 'No unfollowers detected. Run another scan later to identify changes.');
  renderList('list-not-following-back', notFollowingBack, 'Everyone you follow is following you back!');
}

function renderList(containerId, list, emptyMessage, maxToShow = 100) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (maxToShow === 100) {
    container.innerHTML = '';
  }

  if (list.length === 0) {
    container.innerHTML = `<p class="empty-text">${emptyMessage}</p>`;
    return;
  }

  const visibleItems = list.slice(maxToShow - 100, maxToShow);

  visibleItems.forEach(user => {
    const item = document.createElement('div');
    item.className = 'list-item';
    
    const avatarUrl = user.profilePicUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='16' fill='%232d2d34'/></svg>";
    
    item.innerHTML = `
      <div class="user-info">
        <img src="${avatarUrl}" alt="" class="avatar">
        <div style="overflow: hidden;">
          <a href="https://www.instagram.com/${user.username}/" target="_blank" class="username">${user.username}</a>
          <div class="fullname">${user.fullName || '—'}</div>
        </div>
      </div>
      <a href="https://www.instagram.com/${user.username}/" target="_blank" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;">View</a>
    `;

    const img = item.querySelector('.avatar');
    if (img) {
      img.addEventListener('error', () => {
        img.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='16' fill='%232d2d34'/></svg>";
      }, { once: true });
    }
    
    container.appendChild(item);
  });

  const oldBtn = container.querySelector('.btn-show-more');
  if (oldBtn) oldBtn.remove();

  if (list.length > maxToShow) {
    const showMoreBtn = document.createElement('button');
    showMoreBtn.className = 'btn btn-secondary btn-show-more';
    showMoreBtn.style.cssText = 'width: calc(100% - 32px); margin: 16px; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;';
    showMoreBtn.textContent = `Load More (+${list.length - maxToShow} remaining)`;
    showMoreBtn.onclick = () => {
      renderList(containerId, list, emptyMessage, maxToShow + 100);
    };
    container.appendChild(showMoreBtn);
  }
}

// Bind Events
function setupEventListeners() {
  document.getElementById('btn-start-scan').addEventListener('click', startScan);
  document.getElementById('btn-cancel-scan').addEventListener('click', cancelScan);
  
  document.getElementById('setting-delay').addEventListener('change', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 1.0) val = 1.0;
    if (val > 10.0) val = 10.0;
    e.target.value = val;
    delaySeconds = val;
    chrome.storage.local.set({ delaySeconds: val });
  });

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('Clear all local follower details? This resets your tracking history.')) {
      chrome.storage.local.clear(() => {
        followers = [];
        following = [];
        prevFollowers = [];
        unfollowers = [];
        notFollowingBack = [];
        
        updateHeaderStatus('Last scan: Never');
        renderUI();
        alert('All local cache cleared.');
      });
    }
  });
}

// Scrape Loop Coordination
async function startScan() {
  if (scanState === 'running') return;
  scanState = 'running';
  abortController = new AbortController();

  document.getElementById('btn-start-scan').style.display = 'none';
  document.getElementById('btn-cancel-scan').style.display = 'inline-block';
  
  const progressContainer = document.getElementById('progress-container');
  progressContainer.style.display = 'block';
  
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressLabel = document.getElementById('progress-label');
  const statusText = document.getElementById('scan-status');
  
  progressBarFill.style.width = '0%';
  progressLabel.textContent = 'Initializing...';
  statusText.textContent = 'Scanning...';

  try {
    // 1. Scrape App ID
    progressLabel.textContent = 'Fetching connection parameters...';
    const homeResponse = await fetch('https://www.instagram.com/', { signal: abortController.signal, credentials: 'include' });
    const homeHtml = await homeResponse.text();
    const appIdMatch = homeHtml.match(/"appId":"(\d+)"/);
    if (appIdMatch && appIdMatch[1]) {
      appId = appIdMatch[1];
    }

    let followersLoaded = 0;
    let followingLoaded = 0;

    function updateProgressLabel() {
      progressLabel.textContent = `Scraping - Followers: ${followersLoaded} | Following: ${followingLoaded}`;
      
      let estTotal = 0;
      if (viewerInfo) {
        estTotal = (viewerInfo.followerCount || 0) + (viewerInfo.followingCount || 0);
      }
      
      if (estTotal > 0) {
        const percent = Math.min(90, Math.round(((followersLoaded + followingLoaded) / estTotal) * 100));
        progressBarFill.style.width = `${percent}%`;
      } else {
        progressBarFill.style.width = '50%';
      }
    }

    // 2. Fetch Followers & Following in Parallel
    const [currentFollowers, currentFollowing] = await Promise.all([
      scrapeList('followers', (count) => {
        followersLoaded = count;
        updateProgressLabel();
      }),
      scrapeList('following', (count) => {
        followingLoaded = count;
        updateProgressLabel();
      })
    ]);

    if (scanState === 'cancelled') return;

    progressLabel.textContent = 'Comparing lists...';
    progressBarFill.style.width = '95%';

    // Save current baseline to prev
    prevFollowers = [...followers];
    followers = currentFollowers;
    following = currentFollowing;

    computeRelationships();

    const now = Date.now();
    chrome.storage.local.set({
      followers: followers,
      following: following,
      lastScanTime: now
    }, () => {
      progressLabel.textContent = 'Complete!';
      progressBarFill.style.width = '100%';
      statusText.textContent = 'Ready';
      
      const timeText = `Last scan: ${new Date(now).toLocaleString()}`;
      updateHeaderStatus(timeText);
      renderUI();
      
      setTimeout(() => {
        progressContainer.style.display = 'none';
        document.getElementById('btn-start-scan').style.display = 'inline-block';
        document.getElementById('btn-cancel-scan').style.display = 'none';
        scanState = 'idle';
      }, 1500);
    });

  } catch (err) {
    if (err.name === 'AbortError' || scanState === 'cancelled') {
      statusText.textContent = 'Cancelled';
    } else {
      statusText.textContent = 'Error';
      alert(`Scan failed: ${err.message}. Try raising the Scan Delay.`);
    }
    progressContainer.style.display = 'none';
    document.getElementById('btn-start-scan').style.display = 'inline-block';
    document.getElementById('btn-cancel-scan').style.display = 'none';
    scanState = 'idle';
  }
}

// API Pagination Loop
async function scrapeList(endpoint, onProgress) {
  let nextMaxId = '';
  let list = [];
  let isDone = false;

  while (!isDone && scanState === 'running') {
    let url = `https://www.instagram.com/api/v1/friendships/${userId}/${endpoint}/?count=100`;
    if (nextMaxId) {
      url += `&max_id=${nextMaxId}`;
    }

    const response = await fetch(url, {
      headers: { 'X-IG-App-ID': appId },
      credentials: 'include',
      signal: abortController.signal
    });

    if (response.status === 429) {
      // Rate Limit, backoff
      await sleep(8000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.users && Array.isArray(data.users)) {
      const parsed = data.users.map(u => ({
        id: String(u.pk_id || u.pk),
        username: u.username,
        fullName: u.full_name || '',
        profilePicUrl: u.profile_pic_url || ''
      }));
      list = list.concat(parsed);
      onProgress(list.length);
    }

    nextMaxId = data.next_max_id;
    if (!nextMaxId) {
      isDone = true;
    } else {
      await sleep(delaySeconds * 1000);
    }
  }

  return list;
}

function cancelScan() {
  if (scanState === 'running') {
    scanState = 'cancelled';
    if (abortController) abortController.abort();
  }
}
