chrome.webRequest.onSendHeaders.addListener(
    function (info) {
      if (info.requestHeaders) {
        for(var i = 0; i < info.requestHeaders.length; i++) {
          if(info.requestHeaders[i].name?.toLocaleLowerCase() == 'authorization') {
            let data = { 
              'tokenObj': { 
                'token': info.requestHeaders[i].value, 
                'date': new Date().toLocaleTimeString()
              }
            };
            chrome.storage.session.set(data);
            break;
          }
        }      
      }
    },
    // filters
    {
      urls: [        
        "https://management.azure.com/*"
      ]
    },
    ["requestHeaders"]);