
importScripts("./lib/token-management.js", "./lib/azure-api.js");

// Our one and only Token Management service
const tokenMgmt = new TokenManagement();

// Flag used to indicate when data is being collected
let isCollecting = false;

/**
 * Registers a message listener
 * Mainly used to request data to be collected
 */
chrome.runtime.onMessage.addListener(            
  function(request, sender, sendResponse) { 
    if(request.request == "collect") {
      // Only start collecting if we don't have valid tokens
      isCollecting = tokenMgmt.hasTokens() == false;
    }
    sendResponse(isCollecting);
    return true;
  }
);

/**
 * Register a listener to interogate the body of th Delegation Token request
 */
chrome.webRequest.onBeforeRequest.addListener(
  function (info) {
    // If the request is made to start collecting AND
    // we have a ody
    if (isCollecting && info.requestBody) {
      const body = parseRequestBody(info.requestBody);
      if (body) {
        // We don't want to over collect - disable the collection flag
        isCollecting = false;

        let data = {
          'authData': {
            'altPortalAuthorization': body.altPortalAuthorization,
            'portalAuthorization': body.portalAuthorization,
            'armAuthorizationHeader': body.armAuthorizationHeader
          }
        };
        // Save the requested data
        tokenMgmt.saveAuthData(data.authData).then(() => {});
      }
    }
  },
  // filters
  {
    urls: [
      "https://portal.azure.com/api/Portal/GetEarlyUserData"
    ]
  },
  ["requestBody"]);

/**
 * Parses a JSON requst boy
 * @param {string} requestBody 
 * @returns JSON object reprsenting request body
 */
function parseRequestBody(requestBody) {
  if (!requestBody.raw) {
    return null;
  }
  try {
    const stringBody = (new Uint8Array(requestBody.raw[0].bytes).reduce(
      function(data,byte) {
        return data + String.fromCharCode(byte);
      },
      ''
    ));
    return JSON.parse(stringBody);
  } catch (error) {
    return null;
  }
}
