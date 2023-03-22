const options = [{
    id: 'resources',    
    type: 'bool',
    default: true
},{
    id: 'resourcegroups',
    type: 'bool',
    default: true
}, {
    id: 'groups',
    type: 'bool',
    default: true
},{
    id: 'groupsFilter',
    type: 'string',
    default: null
}, {
    id: 'otherRoles',
    type: 'bool',
    default: false
}, {
    id: 'otherRolesFilter',
    type: 'string',
    default: null
}];

function getUiSettings() {
    var settings = {};
    options.forEach(opt => {
        const element = document.getElementById(opt.id);
        let value = opt.default;
        if(opt.type === 'bool' ) {
            value = element.checked;
        } else {
            value = element.value;
        }
        settings[opt.id] = value;
    });
    return settings;
}

function setUiSettings(settings) {
    options.forEach(opt => {
        const element = document.getElementById(opt.id);        
        if(opt.type === 'bool' ) {
            element.checked = settings[opt.id];
        } else {
            element.value = settings[opt.id];
        }
    });
}

function getDefaultUiSettings() {
    var settings = {};
    options.forEach(opt => {        
        settings[opt.id] = opt.default;
    });
    return settings;
}

// Saves options to chrome.storage
function save_options() {
    chrome.storage.sync.set(getUiSettings(), function() {
      // Update status to let user know options were saved.
      var status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 750);
    });
  }
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  function restore_options() {
    chrome.storage.sync.get(getDefaultUiSettings(), function(items) {
        setUiSettings(items);
    });
  }
  document.addEventListener('DOMContentLoaded', restore_options);
  document.getElementById('save').addEventListener('click', save_options);