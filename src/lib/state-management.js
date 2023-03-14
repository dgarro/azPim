"use strict"

/**
 * Utility class to manage the various UI states
 */
const StateManagement = (function () {

    /**
     * Sets the UI to an available state
     */
    function setStateAvailable() {
        setPim(true);
        setLoading(false);
        setUnavailable(false);
        setError(false);
    }

    /**
     * Sets the UI to an unavailable state
     * @param {string} url of the current tab
     */
    function setStateUnavailable(url) {
        setPim(false);
        setLoading(false);
        setUnavailable(true, url);
        setError(false);
    }

    /**
     * Sets the error state
     */
    function setStateError() {
        setPim(false);
        setLoading(false);
        setUnavailable(false);
        setError(true);
    }
    
    /**
     * Sets the Unavailable state.
     * Provided a URL, provides some contextually relevant information
     * @param {boolean} state Sets the unavailable state
     * @param {*} url URL to evaluate
     */
    function setUnavailable(state, url) {
        setVisible('#unavailable-container', state);
    
        if (state) {
            // If we are NOT viewing an Azure site, provide a link
            var isAzure = url.indexOf("portal.azure") >= 0;
            setVisible("#link-azure", !isAzure);
            setVisible("#viewing-azure", isAzure);
    
            if (!isAzure) {
                var clicker = document.getElementById('open-azure');
                clicker.addEventListener("click", () => {
                    openAzure();
                });
            }
        }
    }

    /**
     * Sets the error state
     */
    function setError(state) {
        setVisible('#error-container', state);
    }

    /**
     * Display an overlay message
     * @param {string} message Message to display 
     */
    function setOverlayMessage(message) {
        setStateAvailable();
        setLoading(true);
        document.querySelector('#loading-container .loading-box').innerHTML = (message);
    }
    
    /**
     * Sets the loading indicator state
     * @param {boolean} state  
     */
    function setLoading(state) {
        setVisible('#loading-container', state);
    }
    
    /**
     * Sets the PIM container state
     * @param {boolean} state 
     */
    function setPim(state) {
        setVisible('#pim-container', state);
    }
    
    /**
     * Displays/Hides a node
     * @param {string} id ID of the DOM element 
     * @param {boolean} visible 
     */
    function setVisible(id, visible) {
    
        var display = '';
        if (visible == false) {
            display = 'none';
        }

        document.querySelector(id).style.display = display;
    }

    // Revealing module pattern
    return {
        setStateAvailable: setStateAvailable,
        setStateUnavailable: setStateUnavailable,
        setError: setStateError,
        setLoading: setLoading,
        setVisible: setVisible,
        setOverlayMessage: setOverlayMessage
    };

})();