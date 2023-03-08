/**
 * Main entry point called when the extension loads
 */
(async () => {
    await execute();
})();

/**
 * Main execution
 */
async function execute() {
    // Get the current tab, and see if we are looking at an Azure resource
    var currentUrl = await getTab();
    var parts = ResourceBuilder.build(currentUrl);

    // If we have a valid resource, start processing
    // Otherwise, update the UI
    if (ResourceBuilder.valid(parts)) {

        // We have a valid resource - request that the session be started 
        await TokenClient.startSession();

        // Provided the URL - we can update some aspects of the UI
        registerAction("#resource-info", parts?.resource);
        registerAction("#group-info", parts?.group);

        // Make sure we have a valid token
        // If we don't, it simply may mean the user has to refresh the page and reopen - 
        // This is intented as part of the "startSession" work flow
        const hasToken =  await TokenClient.hasAuth();
        if (hasToken == false) {
            StateManagement.setOverlayMessage("Please refresh the page and reopen this extension");
        } else {
            StateManagement.setStateAvailable();
            StateManagement.setLoading(true);
            await loadGroupResources(parts, evaluateGroups);
        }
    } else {
        StateManagement.setStateUnavailable(currentUrl);
    }
}

/**
 * Async function allowwing the current tab to be retreived.
 * @returns URL of the current active tab
 */
 async function getTab() {
    return new Promise((resolve, rject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function ([tab]) {
            // Pass any observed errors down the promise chain.
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(tab.url);
        });
    });
}

function evaluateGroups(resp) {

    const root = document.querySelector("#pim-container");
    const template = document.getElementById("group-container");

    resp.filter(GroupFilter.filter).forEach(element => {
        const firstClone = template.content.cloneNode(true);

        const target = firstClone.querySelector(".target");
        target.textContent = element.displayName;

        const type = firstClone.querySelector(".type");
        type.textContent = element.objectType;


        const url = `https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/ResourceMenuBlade/~/MyActions/resourceId/${element.objectId}/resourceType/Security/provider/aadgroup/resourceDisplayName/${encodeURIComponent(element.displayName)}/resourceExternalId/${element.objectId}`;
        firstClone.querySelector(".dynamic-group").dataset.url = url;

        root.appendChild(firstClone);
    });

    document.querySelectorAll(".dynamic-group").forEach((x) => {
        x.addEventListener('click', (event) => {
            let url = event.target?.dataset.url;
            if (url == null) {
                url = event.target.closest(".dynamic-group")?.dataset?.url;
            }
            createNewTab(url);
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

async function registerAction(container, data) {
    if (data) {
        document.querySelector(container).querySelector(".target").innerHTML = data.name;

        var clicker = document.querySelector(container);
        clicker.addEventListener("click", async () => {
            StateManagement.setLoading(true);
            const result = await loadPimResources(data, evaluateResources, () => errorCallback(container));
            evaluateResources(data, result);
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

async function loadGroupResources(data, successCallback, errorCallback) {

    try {
        var portalToken = await TokenClient.getPortalToken();        
        const roleAssignments = await AzureApi.loadRoleAssignments(data, portalToken);
        const ids = roleAssignments.value.map(x => x.properties.principalId);
        
        if(ids?.length > 0) {
            const graphToken = await TokenClient.getGraphToken();        
            const tenant = await TokenClient.getTenant();
            const groups = await AzureApi.loadObjectsByIds(tenant, graphToken, ids);            
            successCallback(groups.value);
        } else {
            successCallback([]);
        }
    } 
    catch(error) {
        console.error(error);
        if(errorCallback) {
            errorCallback();
        } else {
            StateManagement.setError();
        }
    }

}

async function loadPimResources(resourceInfo, successCallback, errorCallback) {

    var token = await TokenClient.getPortalToken();

    try {
        return await AzureApi.getResource(resourceInfo, token);
    } catch(error) {
        console.error(error);
        if(errorCallback) {
            errorCallback();
        } else {
            StateManagement.setError();
        }
    }
}