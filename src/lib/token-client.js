"use strict"

/**
 * TokenClient
 * Client used to interact with the TokenManagement class.
 */
const TokenClient = (function() {
    
    /**
     * Returns the available GraphToken
     * @returns Requested Graph Token
     */
    async function getGraphToken() {
        return await getData("graph");
    }

    /**
     * Returns the available PortalToken
     * @returns Requested Portal Token
     */
    async function getPortalToken() {
        return await getData("portal");
    }

    /**
     * Returns the available Tenant
     * @returns Requested Tenant
     */
    async function getTenant() {
        return await getData("tenant");
    }

    /**
     * Used to evaluate if all tokens are available
     * @returns Boolean indicating if all tokens are available
     */
    async function hasAuth() {
        return await getData("hasAuth");      
    }

    /**
     * Used to start the data session
     * @returns Boolean indicating if the session is started or not
     */
    async function startSession() {
        await getData("collect");
    }

    /**
     * Utility function used to send a message and get a response
     * @param {string} type requested message
     * @returns Data requested
     */
    async function getData(type) {
        return await chrome.runtime.sendMessage({request: type});
    }

    // Revealing module pattern
    return {        
        hasAuth: hasAuth,
        getGraphToken: getGraphToken,
        getPortalToken: getPortalToken,
        getTenant: getTenant,
        startSession: startSession
    }

})();
