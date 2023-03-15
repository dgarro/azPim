/**
 * Main entry point called when the extension loads
 */

settings = {
    resources: true,
    resourcegroups: true,
    groups: true,
    groupsFilter: ""
};


(async () => {

    const opts = await chrome.storage.sync.get(['resources', 'resourcegroups','groups','groupsFilter']);
    settings = {...settings, ...opts};
    console.log(settings);

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

        if(settings.resources) {
            addResource(parts?.resource);            
        }
        if(settings.resourcegroups) {
            addResource(parts?.group);
        }

        // Make sure we have a valid token
        // If we don't, it simply may mean the user has to refresh the page and reopen - 
        // This is intented as part of the "startSession" work flow
        const hasToken =  await TokenClient.hasAuth();
        if (hasToken == false) {
            StateManagement.setOverlayMessage("Please refresh the page and reopen this extension");
        } else {
            StateManagement.setStateAvailable();
            StateManagement.setLoading(true);
            if(settings.groups) {
                await loadGroupResources(parts, addGroups);
            }
            
            StateManagement.setLoading(false);
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


/**
 * Provided the results of a PIM serach query, determines the most appopiate
 * result to navigate the user to
 * @param {*} resourceInfo 
 * @param {*} resp Array of results 
 */
function navigatePimResource(resourceInfo, resp) {

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

/**
 * 
 * @param {*} container 
 */ 
function errorCallback(container) {    
    container.classList.add("error");
    StateManagement.setLoading(false);
}

/**
 * Registers Actions
 * @param {*} name 
 * @param {*} displayType 
 * @param {*} data 
 * @param {*} event 
 */
async function registerAction(name, displayType, data, event) {
    const root = document.querySelector("#pim-container");
    const template = document.getElementById("group-container");

    const clone = template.content.cloneNode(true);

    const target = clone.querySelector(".target");
    target.textContent = name;

    const type = clone.querySelector(".type");
    type.textContent = displayType;

    const grp = clone.querySelector('.dynamic-group');
    grp.addEventListener("click", () => event(data, grp), false);

    root.appendChild(clone);
}

/**
 * When the users clicks on a PIM related action
 * @param {string} container Container to attatch click event to 
 * @param {JSON} data Associated data
 */
async function addResource(data) {

    registerAction(data.name, data.displayType, data, async (input, grp) => {
        StateManagement.setLoading(true);
        const result = await loadPimResources(input, () => errorCallback(grp));            
        naviatePimResource(input, result);
    });
}


/**
 * Provided a listing of available groups, builds URL's to access the requested PIM resource 
 * @param {array} Array of groups
 */
 function addGroups(resp) {

    // For each gropu, grab the template, fill in the missing parts and output the UI
    var filter = (x) => true;
    if(settings.groupsFilter?.length > 0) {
        const regex = new RegExp(settings.groupsFilter, "i");
        filter = (x) => {
            const isMatch = regex.test(x.displayName);
            return isMatch;
        }
    }

    resp.filter(filter).forEach(data => {

        registerAction(data.displayName, data.objectType, data, (input, grp) => {
            StateManagement.setLoading(true);
            navigateToGroupPim(input);
        });        
    });
}

/**
 * Loads all available groups/roles for a given resource
 * @param {*} data 
 * @param {*} successCallback 
 * @param {*} errorCallback 
 */
async function loadGroupResources(data, successCallback, errorCallback) {

    try {
        // Get the generic portal token
        var portalToken = await TokenClient.getPortalToken();        
        // Get available role assignments
        const roleAssignments = await AzureApi.loadRoleAssignments(data, portalToken);
        const ids = roleAssignments.value.map(x => x.properties.principalId);
        
        if(ids?.length > 0) {
            // Loads data for each role
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

/**
 * Searches the PIM interface for a given resource
 * @param {*} resourceInfo 
 * @param {*} successCallback 
 * @param {*} errorCallback 
 * @returns 
 */
async function loadPimResources(resourceInfo, errorCallback) {

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


/**
 * Opens the Azure portal
 */
 function openAzure() {
    createNewTab("https://portal.azure.com");
}

/**
 * Creates a new tab
 * @param {*} url 
 */
function createNewTab(url) {    
    chrome.tabs.create({ active: true, url: url });
}

/**
 * Opesn the generic PIM search
 */
function navigateToGenericPim() {
    createNewTab("https://portal.azure.com/#view/Microsoft_Azure_PimCommon/CommonMenuBlade/~/quickStart");
}

/**
 * 
 * @param {*} data 
 */
function navigateToResourcePim(data) {
    const url = `https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/ResourceMenuBlade/~/MyActions/resourceId/${data.id}/resourceType/${encodeURIComponent(data.type)}/provider/azurerbac`;
    createNewTab(url);
}

/**
 * 
 * @param {*} data 
 */
function navigateToGroupPim(element) {
    const url = `https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/ResourceMenuBlade/~/MyActions/resourceId/${element.objectId}/resourceType/Security/provider/aadgroup/resourceDisplayName/${encodeURIComponent(element.displayName)}/resourceExternalId/${element.objectId}`;
    createNewTab(url);
}