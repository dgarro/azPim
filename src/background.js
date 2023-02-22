chrome.webRequest.onSendHeaders.addListener(
  function (info) {
    if (info.requestHeaders) {
      for (var i = 0; i < info.requestHeaders.length; i++) {
        if (info.requestHeaders[i].name?.toLocaleLowerCase() == 'authorization') {
          let data = {
            'authToken': {
              'token': info.requestHeaders[i].value
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
      "https://management.azure.com/*",
    ]
  },
  ["requestHeaders"]);


chrome.webRequest.onBeforeRequest.addListener(
  function (info) {
    if (info.requestBody) {
      const body = parseRequestBody(info.requestBody);
      let data = {
        'authData': {
          'altPortalAuthorization': body.altPortalAuthorization,
          'portalAuthorization': body.portalAuthorization,
          'tenant': body.tenant
        }
      };
      chrome.storage.session.set(data);
    }
  },
  // filters
  {
    urls: [
      "https://portal.azure.com/api/DelegationToken",
    ]
  },
  ["requestBody"]);


function parseRequestBody(requestBody) {
  if (!requestBody.raw) {
    return null;
  }

  try {
    const stringBody = String.fromCharCode.apply(
      null,
      new Uint8Array(requestBody.raw[0].bytes)
    );
    return JSON.parse(stringBody);
  } catch (error) {
    return null;
  }
}
