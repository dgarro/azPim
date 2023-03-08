"use strict"

/**
 * TokenManagement
 * Utility class handling the management and storage of authorization tokens.
 * Currently, all tokens are stored in memory but could easily be updated to 
 * store in session or local storage.
 * The main intent of this class is to be used by the Background.js service as
 * it is long running.
 */
const TokenManagement = class {
    
    #portalToken = null;
    #graphToken = null;
    #tenant = null;

    constructor() {
        const that = this;      

        // Register with Chrome Runtime to receive messages
        chrome.runtime.onMessage.addListener(            
            function(request, sender, sendResponse) {                     
                if(request.request == "graph") {
                    // async/await really not supported here.  If async/await requied, you must use then()
                    sendResponse(that.getGraphToken()); 
                    // return true to keep message stream open to send
                    return true; 
                } else if(request.request == "portal") {
                    sendResponse(that.getPortalToken()); 
                    return true;
                } else if(request.request == "tenant") {
                    sendResponse(that.getTenant());    
                    return true;
                } else if(request.request == "hasAuth") {
                    sendResponse(that.hasTokens());
                    return true;
                }
                // Just because the message isn't handled here, doesn't mean something else isn't going to andle it                
            }
        );
    }

    /**
     * When provided with Azure Auth Data - requests tokens to access Graph and General API usage.
     * This approach allows us to move foward without keeping the Auth data around in memory or 
     * storage
     * @param {JSON} data JSON blob containing auth data 
     */
    saveAuthData = async function(data) {
        // If tokens are NOT available, request new ones
        // Otherwise, we have valid tokens
        if(this.hasTokens() == false) {

            this.#tenant = data.tenant;            
            
            const graphPromise = this.getDelegationToken("graph", data);
            const portalPromise = this.getDelegationToken("", data);
            
            Promise.all([graphPromise, portalPromise]).then((values) => {
                this.#graphToken = values[0];
                this.#portalToken = values[1];
            }).catch((error) => {
                console.error(error);
                this.resetTokens();
            });
        }
    }

    /**
     * Returns an authorization token for the given resource
     * @param {string} resource Resource reqesting access to
     * @param {JSON} data Auth Data 
     * @returns JSON object with the auth token and expiration date
     */
    getDelegationToken = async function(resource, data) {
        const result = await AzureApi.getDelegationToken(resource, data.tenant, data.portalAuthorization, data.altPortalAuthorization);
        
        const currentDateTime = new Date();
        return {
            token: result.value.authHeader,
            // Give the expiration a little breathing room
            expiresIn: new Date(currentDateTime.getTime() + (result.value.expiresInMs - 60000)).getTime(),
        }
    }

    /**
     * Returns currently available tenant
     * @returns Tenant
     */
    getTenant = function() {
        return this.#tenant;
    }

    /**
     * Returns currently available portal token
     * @returns 
     */
    getPortalToken = function() {
        return this.#portalToken?.token;
    }

    /**
     * Returns currently available graph token
     * @returns Graph Token
     */
    getGraphToken = function() {
        return this.#graphToken?.token;
    }

    /**
     * Utility function to evaluate if all tokens are avialable
     * @returns Boolean indicating if both the Portal and Graph tokens are avilable and valid
     */
    hasTokens = function() {
        const now = (new Date).getTime();
        return this.tokenValid(this.#graphToken, now) && this.tokenValid(this.#portalToken, now);
    }

    /**
     * Utility function to evalidate the validity given token
     * @param {JSON} data Auth Token data to evaluate 
     * @param {Date} now Time to compare against 
     * @returns Boolean indicating if the token exists and is NOT expired
     */
    tokenValid = function(data, now) {
        return data?.token?.length > 0 && now < data?.expiresIn || 0; 
    }

    /**
     * Resets available tokens
     */
    resetTokens = function() {
        this.#graphToken = null;
        this.#portalToken = null;
        this.#tenant = null;
    }
};