"use strict"

/**
 * Utility class to evaluate a given Azure URL and pull out the various resources
 */
const ResourceBuilder = (function () {

    /**
     * Pulls resource group infomation from a given Azure portal URL
     * @param {string} url 
     * @returns resource group object
     */
    function buildResourceGroup(url) {
        var groupParts = /resource\/subscriptions\/[[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/resourceGroups\/([^\/]*)/i;
        if (groupParts.test(url)) {
            var parts = groupParts.exec(url);
            return {
                name: parts[1],
                type: 'resourcegroup',
                subtype: 'resourcegroup'
            };
        }
        return null;
    }

    /**
     * Pulls subscription infomation from a given Azure portal URL
     * @param {string} url 
     * @returns subscription group object
     */
    function buildSubscription(url) {

        var subsPattern = /resource\/subscriptions\/([[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;
        if (subsPattern.test(url)) {
            var parts = subsPattern.exec(url);
            return {
                name: parts[1],
                type: 'subscription',
                subtype: 'subscription'
            };
        }
        return null;
    }

    /**
     * Pulls resource infomation from a given Azure portal URL
     * @param {string} url 
     * @returns resource object
     */
    function buildResource(url) {
        var groupParts = /resource\/subscriptions\/[[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/resourceGroups\/[^\/]*\/providers\/([^\/]*)\/([^\/]*)\/([^\/]*)/i;
        if (groupParts.test(url)) {
            var parts = groupParts.exec(url);
            return {
                name: parts[3],
                type: 'resource',
                subtype: `${parts[1]}/${parts[2]}`
            };
        }
        return null;
    }

    /**
     * Provied an object, pulls out the subscription, resource group and resource
     * @param {string} url 
     * @returns fully loaded resource object from the URL
     */
    var buildResult = function (url) {
        if (url.indexOf("portal.azure.com") >= 0) {
            var resource = buildResource(url);
            var group = buildResourceGroup(url);
            var subscription = buildSubscription(url);;

            return {
                resource: resource,
                group: group,
                subscription: subscription
            };

        } else {
            return null;
        }
    }

    /**
     * Ensure minimal valid information
     * @param {object} parts 
     * @returns 
     */
    var partsValid = function(parts) {
        return parts?.resource || parts?.group;
    }
    
    // Revealing module pattern
    return {
        build: buildResult,
        valid: partsValid
    };

})();