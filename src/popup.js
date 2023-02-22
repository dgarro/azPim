
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {

    var parts = ResourceBuilder.build(tab.url);

    if (ResourceBuilder.valid(parts)) {
        registerAction("#resource-info", parts?.resource, parts);
        registerAction("#group-info", parts?.group, parts);

        // Test that we have a token
        chrome.storage.session.get('tokenObj', function (res) {
            if (res.tokenObj?.token == null) {
                StateManagement.setOverlayMessage("Temporarily unavailable - Please refresh the Azure page.");
            } else {
                StateManagement.setStateAvailable();
                StateManagement.setLoading(true);
                loadGroupResources(parts, evaluateGroups, () => errorCallback(container));

            }
        });
    } else {
        StateManagement.setStateUnavailable(tab.url);
    }
});

function evaluateGroups(resp) {
    console.log("Response => ", resp);

    const root = document.querySelector("#pim-container");
    const template = document.getElementById("group-container");

    resp.forEach(element => {
        console.log(element);
        const firstClone = template.content.cloneNode(true);
        const target = firstClone.querySelector(".target");
        target.textContent = element.displayName;
        const url = `https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/ResourceMenuBlade/~/MyActions/resourceId/${element.objectId}/resourceType/Security/provider/aadGroup/resourceDisplayName/${encodeURIComponent(element.displayName)}/resourceExternalId/${element.objectId}`;
        target.dataset.url = url;
        const type = firstClone.querySelector(".type");
        type.textContext = element.objectType;
        root.appendChild(firstClone);
    });

    document.querySelectorAll(".dynamic-group").forEach((x) => {
        x.addEventListener('click', (event) => {
            createNewTab(event.target.dataset.url);
        });
    });

    StateManagement.setLoading(false);
}

function evaluateResources(resourceInfo, resp) {
    var data = resp.value;
    if (data.length === 0) {
        // If we don't return any items, goto the PIM page
        navigateToGenericPim();
    } else if (data.length === 1) {
        // If we return a single item = open up the PIM page
        navigateToResourcePim(data[0]);
    } else {
        // ELSE we have multiple items
        let target = null;
        for (const v in data) {
            // Find the item where the name and type matches
            if (data[v].displayName == resourceInfo.name && data[v].type == resourceInfo.subtype) {
                target = data[v];
                break;
            }
        }
        if (target === null) {
            // If we don't find an item, goto the PIM page
            navigateToGenericPim();
        } else {
            // If we find an item, goto the PIM page
            navigateToResourcePim(target);
        }
    }
}

function errorCallback(container) {
    document.querySelector(container).classList.add("error");
    StateManagement.setLoading(false);
}

function registerAction(container, data, fullData) {
    if (data) {
        document.querySelector(container).querySelector(".target").innerHTML = data.name;

        var clicker = document.querySelector(container);
        clicker.addEventListener("click", () => {
            StateManagement.setLoading(true);
            loadPimResources(data, evaluateResources, () => errorCallback(container));
        }, false);

    } else {
        StateManagement.setVisible(container, false);
    }
}

function openAzure() {
    createNewTab("https://portal.azure.com");
}

function createNewTab(url) {
    chrome.tabs.create({ active: true, url: url });
}

function navigateToGenericPim() {
    createNewTab("https://portal.azure.com/#view/Microsoft_Azure_PimCommon/CommonMenuBlade/~/quickStart");
}

function navigateToResourcePim(data) {
    const url = `https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/ResourceMenuBlade/~/MyActions/resourceId/${data.id}/resourceType/${encodeURIComponent(data.type)}/provider/azurerbac`;
    createNewTab(url);
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

function loadGraphDelegationToken(tokenData) {
    return fetch('https://portal.azure.com/api/DelegationToken', {
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
            'resourceName': 'graph',
            'tenant': `${tokenData.tenant}`,
            'portalAuthorization': `${tokenData.portalAuthorization}`,
            'altPortalAuthorization': `${tokenData.altPortalAuthorization}`
        })
    })
        .then(response => response.json());
}

function loadRoleAssignments(data, token) {
    var url = `https://management.azure.com/subscriptions/${data.subscription.name}/resourceGroups/${data.group.name}/providers/${encodeURIComponent(data.resource.subtype)}/${data.resource.name}/providers/Microsoft.Authorization/roleAssignments?$filter=atScope()&api-version=2020-04-01-preview`;
    return fetch(url, {
        headers: { Authorization: token, 'Access-Control-Allow-Origin': '*' }
    })
        .then(resp => resp.json());
}

function loadObjectsByIds(tenant, altToken, ids) {
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
        .then(response => response.json());
}

function loadGroupResources(data, successCallback, errorCallback) {
    chrome.storage.session.get('altData', function (res) {
        console.log("DATA => ", res);

        loadGraphDelegationToken(res.altData)
            .then(response => {
                console.log("loadGraphDelegationToken => ", response);

                const tenant = res.altData.tenant;
                const altToken = response.value.authHeader;

                chrome.storage.session.get('tokenObj', function (res) {                   
                    var token = res.tokenObj.token;

                    loadRoleAssignments(data, token)
                        .then(resp => {
                            console.log("loadRoleAssignments => ", resp);
                            if (resp.error == undefined) {
                                console.log("GOT some roles => ", resp);
                                const ids = resp.value.map(x => x.properties.principalId);

                                loadObjectsByIds(tenant, altToken, ids)
                                    .then(response => {
                                        const results = response.value.map(x => x.displayName);
                                        console.log(results);
                                        successCallback(response.value);
                                    });
                            } else {
                                console.error("Got an error => ", resp);
                                errorCallback();
                            }
                        }, err => {
                            console.error("Got an error => ", err);
                            errorCallback();
                        });
                });
            }, err => {
                console.error("Got an error => ", err);
                errorCallback();
            });
    });
}

function loadPimResources(resourceInfo, successCallback, errorCallback) {

    chrome.storage.session.get('tokenObj', function (res) {
        var url = buildURL(resourceInfo);
        var token = res.tokenObj.token;

        fetch(url, {
            headers: { Authorization: token }
        })
            .then(resp => resp.json())
            .then(resp => {
                if (resp.error == undefined) {
                    successCallback(resourceInfo, resp);
                } else {
                    console.error("Got an error => ", resp);
                    errorCallback();
                }

            }, err => {
                console.error("Got an error => ", err);
                errorCallback();
            });
    });
}