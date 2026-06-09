async function registerRules() {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Referer',
            operation: 'set',
            value: 'https://www.instagram.com/'
          }
        ]
      },
      condition: {
        urlFilter: '||cdninstagram.com',
        resourceTypes: ['image', 'xmlhttprequest']
      }
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Referer',
            operation: 'set',
            value: 'https://www.instagram.com/'
          }
        ]
      },
      condition: {
        urlFilter: '||fbcdn.net',
        resourceTypes: ['image', 'xmlhttprequest']
      }
    }
  ];

  try {
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });
    console.log("Instagram CDN Referer rules registered successfully.");
  } catch (err) {
    console.error("Failed to register dynamic DNR rules:", err);
  }
}

// Execute immediately when service worker starts
registerRules();
