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
    }

    /**
     * Sets the UI to an unavailable state
     * @param {string} url of the current tab
     */
    function setStateUnavailable(message) {
        setPim(false);
        setLoading(false);
        setUnavailable(true, message);
    }

    /**
     * Sets the error state
     */
    function setStateError(message) {
        setPim(false);
        setLoading(false);
        setUnavailable(true, message ?? "Error While Processing");
    }
    
    /**
     * Sets the Unavailable state.
     * Provided a URL, provides some contextually relevant information
     * @param {boolean} state Sets the unavailable state
     * @param {*} url URL to evaluate
     */
    function setUnavailable(state, message) {
        setVisible('#unavailable-container', state);
    
        if (state) {            
            if(message) {
                document.querySelector('#unavailable-container > div').innerHTML = (message);
            }                
        }
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
        setError: setStateError,
        setLoading: setLoading,
        setOverlayMessage: setOverlayMessage
    };

})();