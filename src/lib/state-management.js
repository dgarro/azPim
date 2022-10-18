"use strict"

const StateManagement = (function () {


    function setStateAvailable() {
        setPim(true);
        setLoading(false);
        setUnavailable(false);
    }

    function setStateUnavailable(url) {
        setPim(false);
        setLoading(false);
        setUnavailable(true, url);
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
        setLoading: setLoading,
        setVisible: setVisible 
    };

})();