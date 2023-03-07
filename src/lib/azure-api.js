"use strict"

const AzureApi = (function () {
    
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
                "origin": "https://portal.azure.com",
                "referer": "https://portal.azure.com/",
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

    async function loadRoleAssignments(data, token) {
        var url = `https://management.azure.com/subscriptions/${data.subscription.name}/resourceGroups/${data.group.name}/providers/${encodeURIComponent(data.resource.subtype)}/${data.resource.name}/providers/Microsoft.Authorization/roleAssignments?$filter=atScope()&api-version=2020-04-01-preview`;
        return fetch(url, {
            headers: { Authorization: token, 'Access-Control-Allow-Origin': '*' }
        })
        .then(handleResult);
    }

    async function loadObjectsByIds(tenant, altToken, ids) {
        return fetch(`https://graph.windows.net/${tenant}/getObjectsByObjectIds`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: altToken,
                "api-version": "1.61-internal"
            },
            body: JSON.stringify({
                includeDirectoryObjectReferences: true,
                objectIds: ids
            })
        })
        .then(handleResult);
    }

    async function getResource(resourceInfo, token) {
        var url = buildURL(resourceInfo);

        
    return fetch(url, {
        headers: { Authorization: token }
    })
    .then(handleResult);
    }

    
    // Adheres to RFC 3986
    function fixedEncodeURIComponent(str) {
        return encodeURIComponent(str).replace(
            /[!'()*]/g,
            (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
        );
    }

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

    function handleResult(response) {
        if (response.status >= 400 && response.status < 600) {
            throw new Error("Bad response from server");
          }
          return response.json();
    }

    return {
        getDelegationToken: getDelegationToken,
        loadRoleAssignments: loadRoleAssignments,
        loadObjectsByIds: loadObjectsByIds,
        getResource: getResource
    };
})();