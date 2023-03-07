"use strict"

const TokenManagement = class {

    #authData = null;
    #portalToken = null;

    constructor() {
        const that = this;      
  
        chrome.runtime.onMessage.addListener(            
            function(request, sender, sendResponse) {     
                
                if(request.request == "graph") {
                    // async/await really not supported here
                    that.getGraphToken().then(sendResponse);
                } else if(request.request == "portal") {
                    sendResponse(that.getPortalToken()); 
                } else if(request.request == "tenant") {
                    sendResponse(that.getTenant());    
                } else {
                    throw new Error("Don't know how to handle request");
                }
                return true
            }
        );
    }

    savePortalToken(data) {
        this.#portalToken = data;
    }

    saveAuthData(data) {
        this.#authData = data;
    }

    getTenant = function() {
        return this.#authData?.tenant;
    }

    getPortalToken = function() {
        return this.#portalToken?.token;
    }

    getGraphToken = async function() {
        if(this.#authData) {
            const result = await AzureApi.getDelegationToken("graph", this.#authData.tenant, this.#authData.portalAuthorization, this.#authData.altPortalAuthorization);
            return result.value.authHeader;
        } else {
            throw new Error("No Auth Data Available");
        }
    }

};