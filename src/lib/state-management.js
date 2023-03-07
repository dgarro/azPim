"use strict"

const StateManagement = (function () {


    function setStateAvailable() {
        setPim(true);
        setLoading(false);
        setUnavailable(false);
        setError(false);
    }

    function setStateUnavailable(url) {
        setPim(false);
        setLoading(false);
        setUnavailable(true, url);
        setError(false);
    }

    function setStateError() {
        setPim(false);
        setLoading(false);
        setUnavailable(false);
        setError(true);
    }
    
    function setUnavailable(state, url) {
        setVisible('#unavailable-container', state);
    
        if (state) {
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


    function setError(state) {
        setVisible('#error-container', state);
    }

    function setOverlayMessage(message) {
        setStateAvailable();
        setLoading(true);
        document.querySelector('#loading-container .loading-box').innerHTML = (message);
    }
    
    function setLoading(state) {
        setVisible('#loading-container', state);
    }
    
    function setPim(state) {
        setVisible('#pim-container', state);
    }
    
    function setVisible(id, visible) {
    
        var display = '';
        if (visible == false) {
            display = 'none';
        }

        document.querySelector(id).style.display = display;
    }

    return {
        setStateAvailable: setStateAvailable,
        setStateUnavailable: setStateUnavailable,
        setError: setStateError,
        setLoading: setLoading,
        setVisible: setVisible,
        setOverlayMessage: setOverlayMessage
    };

})();