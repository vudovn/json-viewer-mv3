// Background service worker cho Manifest V3
// Gộp backend.js và omnibox.js

var chrome = require('chrome-framework');
var defaults = require('./json-viewer/options/defaults');
var merge = require('./json-viewer/merge');

var NAMESPACE = "v2.options";

// Migration: Copy dữ liệu từ localStorage sang chrome.storage nếu cần
// Vì service worker không có quyền truy cập localStorage
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'update' || details.reason === 'install') {
    console.log('[JSONViewer] Migration check for chrome.storage');
    // Data sẽ được migrate từ content scripts/options page khi chúng save lần đầu
  }
});

// Xử lý messages từ content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "GET_OPTIONS") {
    // MV3: Sử dụng chrome.storage.local thay vì localStorage
    chrome.storage.local.get([NAMESPACE], function(result) {
      try {
        var optionsStr = result[NAMESPACE];
        var options = optionsStr ? JSON.parse(optionsStr) : {};
        
        options.theme = options.theme || defaults.theme;
        options.addons = options.addons ? JSON.parse(options.addons) : {};
        options.addons = merge({}, defaults.addons, options.addons);
        options.structure = options.structure ? JSON.parse(options.structure) : defaults.structure;
        options.style = options.style && options.style.length > 0 ? options.style : defaults.style;
        
        sendResponse({err: null, value: options});
      } catch(e) {
        console.error('[JSONViewer] error: ' + e.message, e);
        sendResponse({err: e});
      }
    });
    
    // MV3: return true để giữ sendResponse channel mở
    return true;
  }
});

// Xử lý omnibox
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  console.log('[JSONViewer] inputChanged: ' + text);
  suggest([
    {
      content: "Format JSON",
      description: "(Format JSON) Open a page with json highlighted"
    },
    {
      content: "Scratch pad",
      description: "(Scratch pad) Area to write and format/highlight JSON"
    }
  ]);
});

chrome.omnibox.onInputEntered.addListener(function(text) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var omniboxUrl = chrome.runtime.getURL("/pages/omnibox.html");
    var path = /scratch pad/i.test(text) ? "?scratch-page=true" : "?json=" + encodeURIComponent(text);
    var url = omniboxUrl + path;
    console.log("[JSONViewer] Opening: " + url);

    chrome.tabs.update(tabs[0].id, {url: url});
  });
});

