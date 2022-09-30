
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {

        var parts = ResourceBuilder.build(tab.url);

        if (ResourceBuilder.valid(parts)) {
            registerAction("#resource-info", parts?.resource);
            registerAction("#group-info", parts?.group);

            StateManagement.setStateAvailable();
        } else {
            StateManagement.setStateUnavailable(tab.url);
        }
    });

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

    function registerAction(container, data) {
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
        //chrome.tabs.create({ active: true, url: "https://portal.azure.com" });
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
            var filter = "type eq 'resourcegroup'";
            type = fixedEncodeURIComponent(filter);
        } else {
            var filter = "type ne 'resourcegroup' and type ne 'managementgroup' and type ne 'subscription'";
            type = fixedEncodeURIComponent(filter);
        }
    let url = `https://api.azrbac.mspim.azure.com/api/v2/privilegedAccess/azureResources/resources?$select=id,displayName,type,externalId&$expand=parent&$filter=((${type})%20and%20(originTenantId%20ne%20%2700000000-0000-0000-0000-000000000000%27)%20and%20(contains(tolower(displayName),%20%27${resourceInfo.name.toLocaleLowerCase()}%27)))&$top=10`;

        return url;
    }

    function loadPimResources(resourceInfo, successCallback, errorCallback) {

        chrome.storage.local.get('tokenObj', function (res) {
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