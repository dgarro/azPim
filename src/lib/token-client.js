"use strict"

const TokenClient = (function() {
    
    async function getGraphToken() {
        return await getData("graph");
    }

    async function getPortalToken() {
        return await getData("portal");
    }

    async function getTenant() {
        return await getData("tenant");
    }

    async function getData(type) {
        return await await chrome.runtime.sendMessage({request: type});
    }

    async function hasAuth() {
        // TODO - we should use an all here         
        if(await getTenant() == null || await getPortalToken() == null) {
            return false;
        } else {
            return true;
        }        
    }

    return {        
        hasAuth: hasAuth,
        getGraphToken: getGraphToken,
        getPortalToken: getPortalToken,
        getTenant: getTenant
    }

})();
