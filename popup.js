document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const actionBtn = document.getElementById('action-btn');

  // Check if we are authenticated to Instagram
  chrome.cookies.get({ url: 'https://www.instagram.com', name: 'ds_user_id' }, (cookie) => {
    if (cookie && cookie.value) {
      // User is logged in
      statusDiv.className = 'status-connected';
      statusDiv.querySelector('.status-text').textContent = 'Connected to Instagram';
      
      actionBtn.textContent = 'Open Dashboard';
      actionBtn.className = 'btn-primary';
      actionBtn.style.display = 'flex';
      
      actionBtn.onclick = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      };
    } else {
      // User is not logged in
      statusDiv.className = 'status-disconnected';
      statusDiv.querySelector('.status-text').textContent = 'Not logged into Instagram';
      
      actionBtn.textContent = 'Log In to Instagram';
      actionBtn.className = 'btn-primary';
      actionBtn.style.display = 'flex';
      
      actionBtn.onclick = () => {
        chrome.tabs.create({ url: 'https://www.instagram.com/' });
      };
    }
  });
});
