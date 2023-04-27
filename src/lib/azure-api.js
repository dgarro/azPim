"use strict"

/**
 * Wrapper around the Azure API Functions
 */
const AzureApi = (function () {
    
    /**
     * Requests an auth token for the provided resource
     * @param {string} resourceName 
     * @param {string} tenant 
     * @param {string} portalAuth 
     * @param {stirng}} altPortalAuth 
     * @returns Promise containing authoriation token
     */
    async function getDelegationToken(resourceName, tenant, portalAuth, altPortalAuth) {        
        return await fetch('https://portal.azure.com/api/DelegationToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "authority": "portal.azure.com",
                "method": "POST",
                "path": "/api/DelegationToken",
                "scheme": "https",
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en",
                "x-requested-with": "XMLHttpRequest"
            },
            body: JSON.stringify({
                'extensionName': 'Microsoft_Azure_AD',
                'resourceName': resourceName,
                'tenant': `${tenant}`,
                'portalAuthorization': `${portalAuth}`,
                'altPortalAuthorization': `${altPortalAuth}`
            })
        })
        .then(handleResult);
    }

    /**
     * Loads requested role assignments for the provided resource data
     * @param {JSON} data 
     * @param {string} token 
     * @returns Promise with groups
     */
    async function loadRoleAssignments(data, token) {

        let url = null;
        if(data.resource == null) {
            url = `https://management.azure.com/subscriptions/${data.subscription.name}/providers/Microsoft.Authorization/roleDefinitions?$filter=type eq 'CustomRole'&api-version=2018-01-01-preview`;
        } else {
            url = `https://management.azure.com/subscriptions/${data.subscription.name}/resourceGroups/${data.group.name}/providers/${encodeURIComponent(data.resource.subtype)}/${data.resource.name}/providers/Microsoft.Authorization/roleAssignments?$filter=atScope()&api-version=2020-04-01-preview`;
        }
        return fetch(url, {
            headers: { Authorization: token, 'Access-Control-Allow-Origin': '*' }
        })
        .then(handleResult);
    }

    /**
     * Loads details provided a listing of object ID's
     * @param {string} tenant 
     * @param {string} authToken 
     * @param {array} ids 
     * @returns 
     */
    async function loadObjectsByIds(tenant, authToken, ids) {
        const url = `https://graph.windows.net/${tenant}/getObjectsByObjectIds`
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authToken,
                "api-version": "1.61-internal"
            },
            body: JSON.stringify({
                includeDirectoryObjectReferences: true,
                objectIds: ids
            })
        })
        .then(handleResult);
    }

    /**
     * Returns all available tenants for the logged in user
     * @param {string} authToken
     * @returns Available tenants
     */
    async function getTenant(authToken) {
        const url = `https://management.azure.com/tenants?api-version=2020-01-01&$includeAllTenantCategories=true`
        return fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authToken
            },
            body: null
        })
        .then(handleResult);
    }

    /**
     * Searches for available PIM resources
     * @param {object} resourceInfo 
     * @param {string} token 
     * @returns Promise with PIM data
     */
    async function getResource(resourceInfo, token) {
        var url = buildURL(resourceInfo); 
        return fetch(url, {
            headers: { Authorization: token }
        })
        .then(handleResult);
    }
    
    /**
     * Formats the PIM query string
     * @param {object} resourceInfo 
     * @returns URl 
     */
    function buildURL(resourceInfo) {
        var type = "";
        if (resourceInfo.type == 'resourcegroup') {
            type = "type eq 'resourcegroup'";
        } else {
            type = "type ne 'resourcegroup' and type ne 'managementgroup' and type ne 'subscription'";
        }

        let filter = `(${type}) and (originTenantId ne '00000000-0000-0000-0000-00000000000') and (contains(tolower(displayName),'${resourceInfo.name.toLocaleLowerCase()}'))`;
        let encodedFilter = fixedEncodeURIComponent(filter);

        let url = `https://api.azrbac.mspim.azure.com/api/v2/privilegedAccess/azureResources/resources?$select=id,displayName,type,externalId&$expand=parent&$filter=(${encodedFilter})&$top=10`;

        return url;
    }

    /**
     * Evaluates an HTTP Response.  If status is between 400 and 600, throws exception.
     * Otherwise, returns JSON Object
     * @param {string} response 
     * @returns JSON Object
     */
    function handleResult(response) {
        if (response.status >= 400 && response.status < 600) {
            throw new Error("Bad response from server");
          }          
          return response.json();
    }
    
    /**
     * Utility functoin that extends the character set of
     * of the existing encodeURIComponent method with [!'()*]
     * @param {string} str Input to be encoded 
     * @returns URI encoded string with extended character set
     */
    function fixedEncodeURIComponent(str) {
        return encodeURIComponent(str).replace(
            /[!'()*]/g,
            (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
        );
    }

    // Revealing Modula pattern
    return {
        getDelegationToken: getDelegationToken,
        loadRoleAssignments: loadRoleAssignments,
        loadObjectsByIds: loadObjectsByIds,
        getResource: getResource,
        getTenant: getTenant
    };
})();