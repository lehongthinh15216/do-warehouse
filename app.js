
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
let inventory = [];
let activityLog = [];

// Counter State
let counterTally = parseInt(localStorage.getItem('do_warehouse_counter_tally') || '0', 10);
let recentScans = JSON.parse(localStorage.getItem('do_warehouse_recent_scans') || '[]');
let soundEnabled = localStorage.getItem('do_warehouse_counter_sound') !== 'false';

// View State
let currentInventoryView = 'list';
let currentSampleView = 'list';
let currentSearchTerm = '';

// DOM Elements
const sidebarLinks = document.querySelectorAll('.nav-link[data-view], .bottom-nav-item[data-view]');
const views = document.querySelectorAll('.view');

// Inventory Elements
const inventoryTableBody = document.getElementById('inventoryTableBody');
const inventoryGrid = document.getElementById('inventoryGrid');
const tableContainer = document.querySelector('#inventoryView .table-container');

// Samples Elements
const samplesTableBody = document.getElementById('samplesTableBody');
const samplesGrid = document.getElementById('samplesGrid');
const samplesTableContainer = document.getElementById('samplesTableContainer');

// Controls
const btnListView = document.getElementById('btnListView');
const btnGridView = document.getElementById('btnGridView');
const filterType = document.getElementById('filterType');
const filterBrand = document.getElementById('filterBrand');
const filterLocation = document.getElementById('filterLocation');

const btnSampleListView = document.getElementById('btnSampleListView');
const btnSampleGridView = document.getElementById('btnSampleGridView');
const filterSampleStatus = document.getElementById('filterSampleStatus');
const filterSampleBrand = document.getElementById('filterSampleBrand');

// Modals
const itemModal = document.getElementById('itemModal');
const addItemBtn = document.getElementById('addItemBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const addItemForm = document.getElementById('addItemForm');

// Bulk Add Modal
const bulkAddBtn = document.getElementById('bulkAddBtn');
const bulkAddModal = document.getElementById('bulkAddModal');
const closeBulkModalBtn = document.getElementById('closeBulkModalBtn');
const cancelBulkModalBtn = document.getElementById('cancelBulkModalBtn');
const bulkAddForm = document.getElementById('bulkAddForm');
const bulkAddTableBody = document.getElementById('bulkAddTableBody');
const addBulkRowBtn = document.getElementById('addBulkRowBtn');

// Single Add Dynamic Form Elements
const inputItemType = document.getElementById('itemType');
const fieldSerialNumber = document.getElementById('fieldSerialNumber');
const fieldCondition = document.getElementById('fieldCondition');
const fieldQuantity = document.getElementById('fieldQuantity');

// Other Modals
const AssignModal = document.getElementById('assignModal');
const closeAssignModalBtn = document.getElementById('closeAssignModalBtn');
const cancelAssignModalBtn = document.getElementById('cancelAssignModalBtn');
const AssignForm = document.getElementById('assignForm');

const stockModal = document.getElementById('stockModal');
const closeStockModalBtn = document.getElementById('closeStockModalBtn');
const cancelStockModalBtn = document.getElementById('cancelStockModalBtn');
const stockForm = document.getElementById('stockForm');

// Sample Details Modal
const sampleDetailsModal = document.getElementById('sampleDetailsModal');
const closeSampleDetailsBtn = document.getElementById('closeSampleDetailsBtn');
const closeSampleDetailsFooterBtn = document.getElementById('closeSampleDetailsFooterBtn');
const sampleDetailsContent = document.getElementById('sampleDetailsContent');

// Transfer Modal
const transferModal = document.getElementById('transferModal');
const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
const cancelTransferModalBtn = document.getElementById('cancelTransferModalBtn');
const transferForm = document.getElementById('transferForm');
const transferItemSearch = document.getElementById('transferItemSearch');
const transferItemsList = document.getElementById('transferItemsList');
const transferAmountDisplay = document.getElementById('transferAmountDisplay');
const transferCurrentQtyDisplay = document.getElementById('transferCurrentQtyDisplay');


// Stats Elements
const activityList = document.getElementById('activityList');
const fullActivityTableBody = document.getElementById('fullActivityTableBody');

const physicsFacts = [
    "Fact: Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
    "Fact: Water can boil and freeze at the same time, known as the 'triple point'.",
    "Fact: A day on Venus is longer than a year on Venus.",
    "Fact: Sound travels about 4 times faster in water than in air.",
    "Fact: If you travelled at the speed of light, time would stop for you.",
    "Fact: The universe is expanding at an accelerating rate due to dark energy."
];

function updateWelcomeText() {
    const welcomeText = document.getElementById('welcomeText');
    if (welcomeText) {
        const randomFact = physicsFacts[Math.floor(Math.random() * physicsFacts.length)];
        welcomeText.textContent = randomFact;
    }
}

// Counter functions
function playBeep() {
    if (!soundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
        console.error('Failed to play beep:', e);
    }
}

function renderCounterView() {
    const tallyNumber = document.getElementById('tallyNumber');
    if (tallyNumber) {
        tallyNumber.textContent = counterTally;
    }

    const recentScansList = document.getElementById('recentScansList');
    if (recentScansList) {
        recentScansList.innerHTML = '';
        if (recentScans.length === 0) {
            recentScansList.innerHTML = `<li style="text-align: center; padding: 24px; color: var(--md-sys-color-on-surface-variant); opacity: 0.6; font-size: 14px;" data-i18n="no_scans_yet">No scans yet</li>`;
            
            // Translate the static fallback message if language is Vietnamese
            const noScansEl = recentScansList.querySelector('[data-i18n="no_scans_yet"]');
            if (noScansEl && typeof t === 'function') {
                noScansEl.textContent = t('no_scans_yet');
            }
        } else {
            recentScans.forEach((scan, index) => {
                const li = document.createElement('li');
                li.className = 'recent-scans-item';
                
                const timeStr = new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                const badge = document.createElement('span');
                badge.className = 'scan-index-badge';
                badge.textContent = `#${recentScans.length - index}`;

                const codeSpan = document.createElement('span');
                codeSpan.className = 'scan-code';
                codeSpan.textContent = scan.code;

                const wrapper = document.createElement('div');
                wrapper.className = 'scan-code-wrapper';
                wrapper.appendChild(badge);
                wrapper.appendChild(codeSpan);

                const timeSpan = document.createElement('span');
                timeSpan.className = 'scan-time';
                timeSpan.textContent = timeStr;

                li.appendChild(wrapper);
                li.appendChild(timeSpan);
                recentScansList.appendChild(li);
            });
        }
    }

    const btnToggleSound = document.getElementById('btnToggleSound');
    const soundIcon = document.getElementById('soundIcon');
    if (btnToggleSound && soundIcon) {
        if (soundEnabled) {
            btnToggleSound.classList.add('active');
            soundIcon.className = 'bx bx-volume-full';
        } else {
            btnToggleSound.classList.remove('active');
            soundIcon.className = 'bx bx-volume-mute';
        }
    }
}

function handleBarcodeScan(code) {
    if (!code) return;
    
    counterTally++;
    localStorage.setItem('do_warehouse_counter_tally', counterTally);
    
    recentScans.unshift({
        code: code,
        timestamp: Date.now()
    });
    if (recentScans.length > 10) {
        recentScans = recentScans.slice(0, 10);
    }
    localStorage.setItem('do_warehouse_recent_scans', JSON.stringify(recentScans));
    
    renderCounterView();
    playBeep();
    
    const tallyDisplayCircle = document.getElementById('tallyDisplayCircle');
    if (tallyDisplayCircle) {
        tallyDisplayCircle.classList.remove('pulse-active');
        void tallyDisplayCircle.offsetWidth; // trigger reflow
        tallyDisplayCircle.classList.add('pulse-active');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    initTheme();
    setupRipples();
    updateWelcomeText();
    setupEventListeners();
    renderCounterView();
    fetchInitialData();
});

async function checkSession() {
    // Initialize Google Drive sync (replaces PHP session check)
    const authenticated = await initDriveSync();
    if (authenticated) {
        await fetchInitialData();
    }
    // Sign Out button → Drive sign out
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Sign out of Google Drive sync?')) driveSignOut();
        });
    }
}

window.fetchInitialData = async function fetchInitialData() {
    try {
        [inventory, activityLog] = await Promise.all([
            driveRead('item-data.json'),
            driveRead('log-data.json')
        ]);
        
        // Auto-populate random data for testing if empty
        if (inventory.length === 0) {
            const brands = ['Sony', 'Apple', 'Samsung', 'Logitech', 'Dell', 'Asus'];
            const types = ['gift', 'sample', 'other'];
            const locations = ['DO', 'Gò Vấp'];
            for(let i=0; i<15; i++) {
                let t = types[Math.floor(Math.random()*types.length)];
                let item = {
                    id: generateId(),
                    name: `Test Item ${i+1}`,
                    brand: brands[Math.floor(Math.random()*brands.length)],
                    type: t,
                    location: locations[Math.floor(Math.random()*locations.length)],
                    description: 'Generated for testing'
                };
                if(t === 'sample') {
                    item.serial = `SN${Math.floor(Math.random()*100000)}`;
                    item.condition = 'FULLBOX';
                    item.quantity = 1;
                    item.sampleStatus = 'available';
                } else {
                    item.quantity = Math.floor(Math.random()*50) + 5;
                }
                inventory.push(item);
            }
            await driveWrite('item-data.json', inventory);
        }

        populateFilterDropdowns();
        updateDashboardStats();
        applyFiltersAndRender();
        applySampleFiltersAndRender(); updateDashboardStats();
        renderActivityLog();
        renderFullActivityLog();
    } catch (e) {
        console.error('Error fetching data:', e);
    }
}

// Navigation & Global Logic
function setupEventListeners() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    const settingsThemeToggleBtn = document.getElementById('settingsThemeToggleBtn');
    if (settingsThemeToggleBtn) {
        settingsThemeToggleBtn.addEventListener('click', toggleTheme);
    }

    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('open');
                if (sidebarBackdrop) {
                    if (sidebar.classList.contains('open')) {
                        sidebarBackdrop.classList.add('active');
                    } else {
                        sidebarBackdrop.classList.remove('active');
                    }
                }
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('active');
        });
    }

    // Close modals when clicking outside the modal content
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                const closeBtn = overlay.querySelector('.close-btn');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    overlay.classList.remove('active');
                }
            }
        });
    });

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetDataView = link.getAttribute('data-view');
            sidebarLinks.forEach(l => {
                l.classList.remove('active');
                if (l.getAttribute('data-view') === targetDataView) {
                    l.classList.add('active');
                }
            });
            
            const targetViewId = link.getAttribute('data-view') + 'View';
            views.forEach(view => {
                view.classList.remove('active');
                if(view.id === targetViewId) {
                    view.classList.add('active');
                }
            });
            
            if(targetViewId === 'inventoryView') applyFiltersAndRender();
            if(targetViewId === 'samplesView') applySampleFiltersAndRender(); updateDashboardStats();
            if(targetViewId === 'logsView') renderFullActivityLog();
            if(targetViewId === 'dashboardView') updateSearchBadge(null);
            
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
            }
        });
    });

    // View Toggles
    if(btnListView) {
        btnListView.addEventListener('click', () => {
            currentInventoryView = 'list';
            btnListView.classList.add('active');
            btnGridView.classList.remove('active');
            applyFiltersAndRender();
        });
    }

    if(btnGridView) {
        btnGridView.addEventListener('click', () => {
            currentInventoryView = 'grid';
            btnGridView.classList.add('active');
            btnListView.classList.remove('active');
            applyFiltersAndRender();
        });
    }

    if(btnSampleListView) {
        btnSampleListView.addEventListener('click', () => {
            currentSampleView = 'list';
            btnSampleListView.classList.add('active');
            btnSampleGridView.classList.remove('active');
            applySampleFiltersAndRender(); updateDashboardStats();
        });
    }

    if(btnSampleGridView) {
        btnSampleGridView.addEventListener('click', () => {
            currentSampleView = 'grid';
            btnSampleGridView.classList.add('active');
            btnSampleListView.classList.remove('active');
            applySampleFiltersAndRender(); updateDashboardStats();
        });
    }

    if(filterType) filterType.addEventListener('change', applyFiltersAndRender);
    if(filterBrand) filterBrand.addEventListener('change', applyFiltersAndRender);
    if(filterLocation) filterLocation.addEventListener('change', applyFiltersAndRender);
    if(filterSampleStatus) filterSampleStatus.addEventListener('change', applySampleFiltersAndRender);
    if(filterSampleBrand) filterSampleBrand.addEventListener('change', applySampleFiltersAndRender);

    // Global Search
    const globalSearch = document.getElementById('globalSearch');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const searchResultBadge = document.getElementById('searchResultBadge');

    if(globalSearch) {
        globalSearch.addEventListener('input', () => {
            currentSearchTerm = globalSearch.value.trim().toLowerCase();
            const hasSearch = currentSearchTerm.length > 0;
            if(searchClearBtn) searchClearBtn.style.display = hasSearch ? 'flex' : 'none';
            applyFiltersAndRender();
            applySampleFiltersAndRender(); updateDashboardStats();
            renderFullActivityLog();
        });
    }

    const mobileSearchToggleBtn = document.getElementById('mobileSearchToggleBtn');
    const searchBar = document.getElementById('searchBar');
    if (mobileSearchToggleBtn && searchBar) {
        mobileSearchToggleBtn.addEventListener('click', () => {
            searchBar.classList.add('active');
            globalSearch.focus();
        });
    }

    if(searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            globalSearch.value = '';
            currentSearchTerm = '';
            searchClearBtn.style.display = 'none';
            if(searchResultBadge) searchResultBadge.style.display = 'none';
            applyFiltersAndRender();
            applySampleFiltersAndRender(); updateDashboardStats();
            renderFullActivityLog();
            
            if (window.innerWidth <= 768) {
                searchBar.classList.remove('active');
            } else {
                globalSearch.focus();
            }
        });
    }

    // Mobile Filter Bottom Sheets
    const mobileFilterBtn = document.getElementById('mobileFilterBtn');
    const inventoryFilters = document.getElementById('inventoryFilters');
    if (mobileFilterBtn && inventoryFilters) {
        mobileFilterBtn.addEventListener('click', () => {
            inventoryFilters.classList.toggle('open');
        });
    }

    const mobileSampleFilterBtn = document.getElementById('mobileSampleFilterBtn');
    const sampleFilters = document.getElementById('sampleFilters');
    if (mobileSampleFilterBtn && sampleFilters) {
        mobileSampleFilterBtn.addEventListener('click', () => {
            sampleFilters.classList.toggle('open');
        });
    }

    // Close filters and search bar if clicked outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (inventoryFilters && inventoryFilters.classList.contains('open') && !inventoryFilters.contains(e.target) && !mobileFilterBtn.contains(e.target)) {
                inventoryFilters.classList.remove('open');
            }
            if (sampleFilters && sampleFilters.classList.contains('open') && !sampleFilters.contains(e.target) && !mobileSampleFilterBtn.contains(e.target)) {
                sampleFilters.classList.remove('open');
            }
            if (searchBar && searchBar.classList.contains('active') && !searchBar.contains(e.target) && !mobileSearchToggleBtn.contains(e.target)) {
                searchBar.classList.remove('active');
            }
        }
    });

    // Single Item Modal Logic
    if(addItemBtn) addItemBtn.addEventListener('click', () => {
        itemModal.classList.add('active');
        handleFormTypeChange();
    });

    const closeItemModal = () => {
        itemModal.classList.remove('active');
        addItemForm.reset();
        const EditIdEl = document.getElementById('EditItemId');
        if(EditIdEl) EditIdEl.value = '';
        const titleEl = document.getElementById('itemModalTitle');
        if(titleEl) titleEl.textContent = 'Add New Inventory Item';
        handleFormTypeChange();
    };

    if(closeModalBtn) closeModalBtn.addEventListener('click', closeItemModal);
    if(cancelModalBtn) cancelModalBtn.addEventListener('click', closeItemModal);
    if(inputItemType) inputItemType.addEventListener('change', handleFormTypeChange);

    if(addItemForm) addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const EditIdEl = document.getElementById('EditItemId');
        const EditId = EditIdEl ? EditIdEl.value : '';
        const type = inputItemType.value;
        
        const itemData = {
            type,
            name: document.getElementById('itemName').value,
            brand: document.getElementById('itemBrand').value,
            location: document.getElementById('itemLocation').value,
            description: document.getElementById('itemDesc').value,
        };

        if (type === 'sample') {
            itemData.serial = document.getElementById('itemSerial').value;
            itemData.condition = document.getElementById('itemCondition').value;
            itemData.quantity = 1;
            if (!EditId) itemData.sampleStatus = 'available';
        } else {
            itemData.quantity = parseInt(document.getElementById('itemQuantity').value) || 0;
        }

        try {
            if (EditId) {
                const index = inventory.findIndex(i => i.id === EditId);
                if (index !== -1) {
                    inventory[index] = { ...inventory[index], ...itemData };
                    await driveWrite('item-data.json', inventory);
                }
                logActivity('update', `Updated ${type} <strong>${itemData.name}</strong>`);
            } else {
                itemData.id = generateId();
                inventory.unshift(itemData);
                await driveWrite('item-data.json', inventory);
                logActivity('add', `Added new ${type} <strong>${itemData.name}</strong>`);
            }
            populateFilterDropdowns();
            updateDashboardStats();
            applyFiltersAndRender();
            applySampleFiltersAndRender(); updateDashboardStats();
            closeItemModal();
        } catch (error) {
            console.error("Error saving item: ", error);
            alert("Error saving item to database.");
        }
    });

    // Bulk Add Modal Logic
    if(bulkAddBtn) bulkAddBtn.addEventListener('click', () => {
        bulkAddTableBody.innerHTML = '';
        for(let i=0; i<10; i++) {
            addBulkRow();
        }
        bulkAddModal.classList.add('active');
    });

    const closeBulkModal = () => {
        bulkAddModal.classList.remove('active');
        bulkAddTableBody.innerHTML = '';
    };

    if(closeBulkModalBtn) closeBulkModalBtn.addEventListener('click', closeBulkModal);
    if(cancelBulkModalBtn) cancelBulkModalBtn.addEventListener('click', closeBulkModal);
    if(addBulkRowBtn) addBulkRowBtn.addEventListener('click', addBulkRow);

    if(bulkAddForm) bulkAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rows = document.querySelectorAll('.bulk-add-row');
        const itemsToSave = [];

        rows.forEach(row => {
            const type = row.querySelector('.bulk-type').value;
            const name = row.querySelector('.bulk-name').value;
            if(!name) return; // skip empty rows

            const itemData = {
                type,
                name: name,
                brand: row.querySelector('.bulk-brand').value,
                location: row.querySelector('.bulk-location').value,
                description: ''
            };

            const qtyOrSerial = row.querySelector('.bulk-qty-serial').value;
            if (type === 'sample') {
                itemData.serial = qtyOrSerial;
                itemData.quantity = 1;
                itemData.sampleStatus = 'available';
            } else {
                itemData.quantity = parseInt(qtyOrSerial) || 0;
            }
            itemsToSave.push(itemData);
        });

        if (itemsToSave.length === 0) return;

        try {
            itemsToSave.forEach(item => { item.id = generateId(); });
            const arrayAdded = itemsToSave;
            arrayAdded.forEach(ni => inventory.unshift(ni));
            await driveWrite('item-data.json', inventory);
            
            if (arrayAdded.length === 1) {
                logActivity('add', `Added new ${arrayAdded[0].type} <strong>${arrayAdded[0].name}</strong>`);
            } else {
                logActivity('add', `Bulk added <strong>${arrayAdded.length} new items</strong>`);
            }
            
            populateFilterDropdowns();
            updateDashboardStats();
            applyFiltersAndRender();
            applySampleFiltersAndRender(); updateDashboardStats();
            closeBulkModal();
        } catch (error) {
            console.error("Error bulk saving items: ", error);
            alert("Error saving items to database.");
        }
    });

    // Assign Modal Logic
    const closeAssignModal = () => {
        AssignModal.classList.remove('active');
        AssignForm.reset();
    };

    if(closeAssignModalBtn) closeAssignModalBtn.addEventListener('click', closeAssignModal);
    if(cancelAssignModalBtn) cancelAssignModalBtn.addEventListener('click', closeAssignModal);

    if(AssignForm) AssignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemId = document.getElementById('assignItemId').value;
        const item = inventory.find(i => i.id === itemId);
        
        if(item) {
            try {
                const updates = {
                    assignee: document.getElementById('assignName').value,
                    dateAssigned: document.getElementById('assignDateAssigned').value,
                    returnDate: document.getElementById('assignExpectedReturn').value || 'N/A',
                    notes: document.getElementById('assignNotes').value,
                    sampleStatus: 'Assigned'
                };
                const index = inventory.findIndex(i => i.id === itemId);
                if (index !== -1) {
                    inventory[index] = { ...inventory[index], ...updates };
                    await driveWrite('item-data.json', inventory);
                }

                logActivity('update', `Assigned <strong>${item.name}</strong>${item.serial ? ` (SN: ${item.serial})` : ''} to ${updates.assignee}`);
                
                applyFiltersAndRender();
                applySampleFiltersAndRender(); updateDashboardStats();
                closeAssignModal();
            } catch (error) {
                console.error("Error Assigning item: ", error);
            }
        }
    });

    // Stock Modal Logic
    const closeStockModal = () => {
        if(stockModal) stockModal.classList.remove('active');
        if(stockForm) stockForm.reset();
    };
    if(closeStockModalBtn) closeStockModalBtn.addEventListener('click', closeStockModal);
    if(cancelStockModalBtn) cancelStockModalBtn.addEventListener('click', closeStockModal);

    if(closeSampleDetailsBtn) closeSampleDetailsBtn.addEventListener('click', () => sampleDetailsModal.classList.remove('active'));
    if(closeSampleDetailsFooterBtn) closeSampleDetailsFooterBtn.addEventListener('click', () => sampleDetailsModal.classList.remove('active'));

    // Radio toggle for stock destination
    const stockActionRadios = document.querySelectorAll('input[name="stockAction"]');
    const stockDestinationGroup = document.getElementById('stockDestinationGroup');
    stockActionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'move' && stockDestinationGroup) {
                stockDestinationGroup.style.display = 'block';
            } else if (stockDestinationGroup) {
                stockDestinationGroup.style.display = 'none';
            }
        });
    });

    if(stockForm) stockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemId = document.getElementById('stockItemId').value;
        const item = inventory.find(i => i.id === itemId);
        
        if(item) {
            const action = document.querySelector('input[name="stockAction"]:checked').value;
            const amount = parseInt(document.getElementById('stockAmount').value) || 0;
            const description = document.getElementById('stockDescription').value;
            
            let newQty = item.quantity;
            let actionText = '';
            
            if (action === 'received') {
                newQty += amount;
                actionText = `Received ${amount}`;
            } else if (action === 'sent') {
                newQty = Math.max(0, newQty - amount);
                actionText = `Sent ${amount}`;
            } else if (action === 'adjust') {
                newQty = amount;
                actionText = `Adjusted Stock to ${amount}`;
            } else if (action === 'move') {
                if (newQty < amount) {
                    alert(t('insufficient_stock') || 'Insufficient stock to move.');
                    return;
                }
                const destLoc = document.getElementById('stockDestinationLocation').value;
                if (item.location === destLoc) {
                    alert('Item is already in this location.');
                    return;
                }
                newQty -= amount;
                actionText = `Moved ${amount} to ${destLoc}`;
                
                // Find or create target item
                const targetItemIndex = inventory.findIndex(i => 
                    i.name === item.name && 
                    i.brand === item.brand && 
                    i.type === item.type && 
                    i.location === destLoc
                );
                
                if (targetItemIndex !== -1) {
                    inventory[targetItemIndex].quantity = (inventory[targetItemIndex].quantity || 0) + amount;
                } else {
                    const newItem = { ...item, id: generateId(), location: destLoc, quantity: amount };
                    inventory.push(newItem);
                }
            }
            
            try {
                const index = inventory.findIndex(i => i.id === itemId);
                if (index !== -1) {
                    inventory[index] = { ...inventory[index], quantity: newQty };
                    await driveWrite('item-data.json', inventory);
                }

                logActivity('update', `${actionText} of <strong>${item.name}</strong>. Desc: ${description}`);
                
                applyFiltersAndRender();
                applySampleFiltersAndRender(); updateDashboardStats();
                updateDashboardStats();
                closeStockModal();
            } catch (error) {
                console.error("Error updating Stock: ", error);
            }
        }
    });

    // --- Barcode Counter Event Listeners ---
    const btnDecrement = document.getElementById('btnDecrement');
    if (btnDecrement) {
        btnDecrement.addEventListener('click', () => {
            if (counterTally > 0) {
                counterTally--;
                localStorage.setItem('do_warehouse_counter_tally', counterTally);
                renderCounterView();
            }
        });
    }

    const btnIncrement = document.getElementById('btnIncrement');
    if (btnIncrement) {
        btnIncrement.addEventListener('click', () => {
            counterTally++;
            localStorage.setItem('do_warehouse_counter_tally', counterTally);
            renderCounterView();
            
            // Visual pulse
            const tallyDisplayCircle = document.getElementById('tallyDisplayCircle');
            if (tallyDisplayCircle) {
                tallyDisplayCircle.classList.remove('pulse-active');
                void tallyDisplayCircle.offsetWidth; // trigger reflow
                tallyDisplayCircle.classList.add('pulse-active');
            }
        });
    }

    const btnResetCounter = document.getElementById('btnResetCounter');
    if (btnResetCounter) {
        btnResetCounter.addEventListener('click', () => {
            const msg = (typeof t === 'function' && t('confirm_reset') !== 'confirm_reset')
                ? t('confirm_reset')
                : (currentLang === 'vi' ? 'Bạn có chắc chắn muốn đặt lại bộ đếm không?' : 'Are you sure you want to reset the tally?');
            if (confirm(msg)) {
                counterTally = 0;
                localStorage.setItem('do_warehouse_counter_tally', counterTally);
                renderCounterView();
            }
        });
    }

    const btnTransferCounter = document.getElementById('btnTransferCounter');
    if (btnTransferCounter) {
        btnTransferCounter.addEventListener('click', () => {
            if (counterTally === 0) {
                alert(t('transfer_no_item') || 'Counter is 0, nothing to transfer.');
                return;
            }
            if (transferAmountDisplay) transferAmountDisplay.textContent = counterTally;
            if (transferItemSearch) transferItemSearch.value = '';
            
            if (transferItemsList) {
                transferItemsList.innerHTML = '';
                inventory.forEach(item => {
                    const option = document.createElement('option');
                    const displayName = `${item.brand ? `[${item.brand}] ` : ''}${item.name}`;
                    option.value = displayName;
                    option.dataset.id = item.id;
                    transferItemsList.appendChild(option);
                });
            }
            if (transferCurrentQtyDisplay) transferCurrentQtyDisplay.style.display = 'none';
            if (transferModal) transferModal.classList.add('active');
        });
    }

    if (transferItemSearch) {
        transferItemSearch.addEventListener('input', () => {
            if (!transferCurrentQtyDisplay) return;
            const searchInput = transferItemSearch.value;
            const item = inventory.find(i => `${i.brand ? `[${i.brand}] ` : ''}${i.name}` === searchInput);
            if (item) {
                transferCurrentQtyDisplay.textContent = `Current Qty: ${item.quantity || 0}`;
                transferCurrentQtyDisplay.style.display = 'inline-block';
            } else {
                transferCurrentQtyDisplay.style.display = 'none';
            }
        });
    }

    const closeTransferModal = () => { if (transferModal) transferModal.classList.remove('active'); };
    if (closeTransferModalBtn) closeTransferModalBtn.addEventListener('click', closeTransferModal);
    if (cancelTransferModalBtn) cancelTransferModalBtn.addEventListener('click', closeTransferModal);

    // Radio toggle for transfer destination
    const transferActionRadios = document.querySelectorAll('input[name="transferAction"]');
    const transferDestinationGroup = document.getElementById('transferDestinationGroup');
    transferActionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'move' && transferDestinationGroup) {
                transferDestinationGroup.style.display = 'block';
            } else if (transferDestinationGroup) {
                transferDestinationGroup.style.display = 'none';
            }
        });
    });

    if (transferForm) {
        transferForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const searchInput = transferItemSearch.value;
            const item = inventory.find(i => `${i.brand ? `[${i.brand}] ` : ''}${i.name}` === searchInput);
            
            if (item) {
                const action = document.querySelector('input[name="transferAction"]:checked').value;
                const amount = counterTally;
                const description = document.getElementById('transferDescription').value || 'Counter transfer';

                try {
                    const index = inventory.findIndex(i => i.id === item.id);
                    if (index !== -1) {
                        let newQty = inventory[index].quantity || 0;
                        let actionText = '';
                        
                        if (action === 'received') {
                            newQty += amount;
                            actionText = `Received ${amount}`;
                        } else if (action === 'sent') {
                            if (newQty < amount) {
                                alert(t('insufficient_stock') || 'Insufficient stock for this action.');
                                return;
                            }
                            newQty -= amount;
                            actionText = `Sent ${amount}`;
                        } else if (action === 'adjust') {
                            newQty = amount;
                            actionText = `Adjusted Stock to ${amount}`;
                        } else if (action === 'move') {
                            if (newQty < amount) {
                                alert(t('insufficient_stock') || 'Insufficient stock to move.');
                                return;
                            }
                            const destLoc = document.getElementById('transferDestinationLocation').value;
                            if (item.location === destLoc) {
                                alert('Item is already in this location.');
                                return;
                            }
                            newQty -= amount;
                            actionText = `Moved ${amount} to ${destLoc}`;
                            
                            const targetItemIndex = inventory.findIndex(i => 
                                i.name === item.name && 
                                i.brand === item.brand && 
                                i.type === item.type && 
                                i.location === destLoc
                            );
                            
                            if (targetItemIndex !== -1) {
                                inventory[targetItemIndex].quantity = (inventory[targetItemIndex].quantity || 0) + amount;
                            } else {
                                const newItem = { ...item, id: generateId(), location: destLoc, quantity: amount };
                                inventory.push(newItem);
                            }
                        }

                        inventory[index] = { ...inventory[index], quantity: newQty };
                        await driveWrite('item-data.json', inventory);
                        
                        logActivity('update', `${actionText} of <strong>${item.name}</strong> from Counter. Desc: ${description}`);
                    }
                    
                    applyFiltersAndRender();
                    applySampleFiltersAndRender(); 
                    updateDashboardStats();
                    
                    counterTally = 0;
                    localStorage.setItem('do_warehouse_counter_tally', counterTally);
                    renderCounterView();
                    closeTransferModal();
                    alert(t('transfer_success') || 'Transfer successful!');
                } catch (error) {
                    console.error("Error transferring tally: ", error);
                }
            } else {
                alert(t('transfer_no_item') || 'Please select a valid item.');
            }
        });
    }

    const btnToggleSound = document.getElementById('btnToggleSound');
    if (btnToggleSound) {
        btnToggleSound.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            localStorage.setItem('do_warehouse_counter_sound', soundEnabled);
            renderCounterView();
        });
    }

    const btnClearHistory = document.getElementById('btnClearHistory');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', () => {
            recentScans = [];
            localStorage.setItem('do_warehouse_recent_scans', JSON.stringify(recentScans));
            renderCounterView();
        });
    }

    const manualBarcodeForm = document.getElementById('manualBarcodeForm');
    const manualBarcodeValue = document.getElementById('manualBarcodeValue');
    if (manualBarcodeForm && manualBarcodeValue) {
        manualBarcodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = manualBarcodeValue.value.trim();
            if (val) {
                handleBarcodeScan(val);
                manualBarcodeValue.value = '';
            }
        });
    }

    // Global keydown listener for barcode scanning
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    window.addEventListener('keydown', (e) => {
        const counterView = document.getElementById('counterView');
        if (!counterView || !counterView.classList.contains('active')) {
            barcodeBuffer = '';
            return;
        }

        const activeTag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
            return;
        }

        const now = Date.now();
        if (now - lastKeyTime > 1500) {
            barcodeBuffer = '';
        }
        lastKeyTime = now;

        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = barcodeBuffer.trim();
            if (trimmed) {
                handleBarcodeScan(trimmed);
            }
            barcodeBuffer = '';
        } else if (e.key.length === 1) {
            barcodeBuffer += e.key;
        }
    });

    window.addEventListener('languageChanged', () => {
        renderCounterView();
    });
}

function handleFormTypeChange() {
    if(!inputItemType) return;
    const type = inputItemType.value;
    if (type === 'sample') {
        fieldSerialNumber.style.display = 'flex';
        if (fieldCondition) fieldCondition.style.display = 'flex';
        fieldQuantity.style.display = 'none';
        document.getElementById('itemSerial').required = true;
        document.getElementById('itemQuantity').required = false;
    } else {
        fieldSerialNumber.style.display = 'none';
        if (fieldCondition) fieldCondition.style.display = 'none';
        fieldQuantity.style.display = 'flex';
        document.getElementById('itemSerial').required = false;
        document.getElementById('itemQuantity').required = true;
    }
}

function addBulkRow() {
    if(!bulkAddTableBody) return;
    
    const tr = document.createElement('tr');
    tr.className = 'bulk-add-row';
    tr.innerHTML = `
        <td>
            <select class="bulk-type" required>
                <option value="sample">Sample</option>
                <option value="gift">Gift</option>
                <option value="other">Other</option>
            </select>
        </td>
        <td>
            <input type="text" class="bulk-name" required placeholder="Name">
        </td>
        <td>
            <input type="text" class="bulk-brand" required placeholder="${t('label_brand')}">
        </td>
        <td>
            <input type="text" class="bulk-location" required placeholder="Loc">
        </td>
        <td>
            <input type="text" class="bulk-qty-serial" required placeholder="SN / Qty">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn-icon Delete remove-bulk-row" title="Remove"><i class='bx bx-trash'></i></button>
        </td>
    `;
    
    const typeSelect = tr.querySelector('.bulk-type');
    const qsInput = tr.querySelector('.bulk-qty-serial');
    typeSelect.addEventListener('change', () => {
        if(typeSelect.value === 'sample') qsInput.placeholder = 'Serial Number';
        else qsInput.placeholder = 'Quantity';
    });

    const removeBtn = tr.querySelector('.remove-bulk-row');
    removeBtn.addEventListener('click', () => {
        if(bulkAddTableBody.children.length > 1) {
            tr.remove();
        } else {
            // If it's the last row, just clear it
            tr.querySelectorAll('input').forEach(inp => inp.value = '');
        }
    });

    bulkAddTableBody.appendChild(tr);
}

// --- Material 3 Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    updateThemeIcon();
}

function toggleTheme() {
    const isDark = document.documentElement.hasAttribute('data-theme');
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = document.documentElement.hasAttribute('data-theme');
    
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = isDark ? 'bx bx-sun' : 'bx bx-moon';
    
    const settingsIcon = document.querySelector('#settingsThemeToggleBtn i');
    if (settingsIcon) settingsIcon.className = isDark ? 'bx bx-sun' : 'bx bx-moon';
}

function setupRipples() {
    document.addEventListener('mousedown', function(e) {
        const target = e.target.closest('.primary-btn, .secondary-btn, .icon-btn, .nav-link, .clickable, .item-card');
        if (!target) return;
        
        const computed = window.getComputedStyle(target);
        if (computed.position === 'static') {
            target.style.position = 'relative';
        }
        
        const circle = document.createElement('span');
        const diameter = Math.max(target.clientWidth, target.clientHeight);
        const radius = diameter / 2;
        
        const rect = target.getBoundingClientRect();
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');
        
        const existingRipple = target.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }
        
        target.appendChild(circle);
        
        setTimeout(() => {
            circle.remove();
        }, 600);
    });
}

function populateFilterDropdowns() {
    if(!filterBrand || !filterLocation) return;
    
    const brands = [...new Set(inventory.map(i => i.brand))].filter(Boolean).sort();
    const locations = ['DO', 'Gò Vấp'];

    const currentBrand = filterBrand.value;
    const currentLocation = filterLocation.value;

    filterBrand.innerHTML = `<option value="all">${t('filter_all_brands')}</option>`;
    brands.forEach(b => {
        filterBrand.innerHTML += `<option value="${b}">${b}</option>`;
    });

    filterLocation.innerHTML = `<option value="all">${t('filter_all_locations')}</option>`;
    locations.forEach(l => {
        filterLocation.innerHTML += `<option value="${l}">${l}</option>`;
    });

    if(filterSampleBrand) {
        const sampleBrands = [...new Set(inventory.filter(i => i.type === 'sample').map(i => i.brand))].filter(Boolean).sort();
        const currentSampleBrand = filterSampleBrand.value;
        filterSampleBrand.innerHTML = `<option value="all">${t('filter_all_brands')}</option>`;
        sampleBrands.forEach(b => {
            filterSampleBrand.innerHTML += `<option value="${b}">${b}</option>`;
        });
        filterSampleBrand.value = sampleBrands.includes(currentSampleBrand) ? currentSampleBrand : 'all';
    }

    filterBrand.value = brands.includes(currentBrand) ? currentBrand : 'all';
    filterLocation.value = locations.includes(currentLocation) ? currentLocation : 'all';
}

function applyFiltersAndRender() {
    if(!filterType) return;
    const typeVal = filterType.value;
    const brandVal = filterBrand.value;
    const locVal = filterLocation.value;

    let filtered = inventory.filter(item => {
        const matchType = typeVal === 'all' || item.type === typeVal;
        const matchBrand = brandVal === 'all' || item.brand === brandVal;
        const matchLoc = locVal === 'all' || item.location === locVal;
        const matchSearch = !currentSearchTerm ||
            (item.name && item.name.toLowerCase().includes(currentSearchTerm)) ||
            (item.serial && item.serial.toLowerCase().includes(currentSearchTerm)) ||
            (item.brand && item.brand.toLowerCase().includes(currentSearchTerm));
        return matchType && matchBrand && matchLoc && matchSearch;
    });

    if (document.getElementById('inventoryView') && document.getElementById('inventoryView').classList.contains('active')) {
        updateSearchBadge(filtered.length);
    }

    if (currentInventoryView === 'list') {
        tableContainer.style.display = 'block';
        inventoryGrid.style.display = 'none';
        renderInventoryTable(filtered);
    } else {
        tableContainer.style.display = 'none';
        inventoryGrid.style.display = 'grid';
        renderInventoryGrid(filtered);
    }
}

function applySampleFiltersAndRender() {
    if(!filterSampleStatus) return;
    const statusVal = filterSampleStatus.value;

    let filtered = inventory.filter(item => {
        if(item.type !== 'sample') return false;
        
        const brandVal = filterSampleBrand ? filterSampleBrand.value : 'all';
        const matchBrand = brandVal === 'all' || item.brand === brandVal;
        const matchStatus = statusVal === 'all' || (item.sampleStatus && item.sampleStatus.toLowerCase() === statusVal.toLowerCase());
        
        const matchSearch = !currentSearchTerm ||
            (item.name && item.name.toLowerCase().includes(currentSearchTerm)) ||
            (item.serial && item.serial.toLowerCase().includes(currentSearchTerm)) ||
            (item.assignee && item.assignee.toLowerCase().includes(currentSearchTerm));
            
        return matchStatus && matchBrand && matchSearch;
    });

    if (document.getElementById('samplesView') && document.getElementById('samplesView').classList.contains('active')) {
        updateSearchBadge(filtered.length);
    }

    if (currentSampleView === 'list') {
        samplesTableContainer.style.display = 'block';
        samplesGrid.style.display = 'none';
        renderSamplesTable(filtered);
    } else {
        samplesTableContainer.style.display = 'none';
        samplesGrid.style.display = 'grid';
        renderSamplesGrid(filtered);
    }
}

function updateSearchBadge(count) {
    const badge = document.getElementById('searchResultBadge');
    if(!badge) return;
    if(currentSearchTerm) {
        badge.textContent = `${count} result${count !== 1 ? 's' : ''}`;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

// Format ISO date (yyyy-mm-dd) → dd/mm/yyyy for display
function toDisplayDate(val) {
    if (!val || val === 'N/A') return val || '-';
    // Already in dd/mm/yyyy?
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    // yyyy-mm-dd
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
}

// --- Render Inventory ---
function renderInventoryTable(data) {
    if(!inventoryTableBody) return;
    inventoryTableBody.innerHTML = '';
    
    data.forEach(item => {
        const { statusClass, statusText } = getInventoryStatusInfo(item);
        const details = item.type === 'sample' ? `SN: ${item.serial} (${item.condition || 'FULLBOX'})` : `Qty: ${item.quantity}`;

        const tr = document.createElement('tr');
        tr.className = 'clickable';
        tr.onclick = () => openEditModal(item.id);
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><span class="tag-badge tag-brand">${item.brand || 'N/A'}</span></td>
            <td><span class="tag-badge tag-type">${item.type}</span></td>
            <td>${item.location}</td>
            <td>${details}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon Delete" title="${t('delete')}" onclick="event.stopPropagation(); deleteItem('${item.id}')"><i class='bx bx-trash'></i></button>
                </div>
            </td>
        `;
        inventoryTableBody.appendChild(tr);
    });
}

function renderInventoryGrid(data) {
    if(!inventoryGrid) return;
    inventoryGrid.innerHTML = '';
    
    data.forEach(item => {
        const { statusClass, statusText } = getInventoryStatusInfo(item);
        const details = item.type === 'sample' ? `SN: ${item.serial} (${item.condition || 'FULLBOX'})` : `Qty: ${item.quantity}`;

        const card = document.createElement('div');
        card.className = 'item-card clickable';
        card.onclick = () => openEditModal(item.id);
        card.innerHTML = `
            <div class="item-card-header">
                <div>
                    <h4 class="item-card-title">${item.name}</h4>
                    <div class="item-card-tags">
                        <span class="tag-badge tag-brand">${item.brand || 'N/A'}</span>
                        <span class="tag-badge tag-type">${item.type}</span>
                    </div>
                </div>
                <button class="btn-icon Delete" title="${t('delete')}" onclick="event.stopPropagation(); deleteItem('${item.id}')"><i class='bx bx-trash'></i></button>
            </div>
            <div class="item-card-info">
                <span><strong>${t('label_location')}:</strong> ${item.location}</span>
                <span><strong>${t('th_details')}:</strong> ${details}</span>
                ${item.description ? `<span><strong>${t('label_desc')}:</strong> ${item.description}</span>` : ''}
            </div>
            <div class="item-card-footer">
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        `;
        inventoryGrid.appendChild(card);
    });
}

// --- Render Samples ---
function renderSamplesTable(data) {
    if(!samplesTableBody) return;
    samplesTableBody.innerHTML = '';
    
    data.forEach(item => {
        const isAssigned = (item.sampleStatus && item.sampleStatus.toLowerCase() === 'assigned');
        const statusClass = isAssigned ? 'status-assigned' : 'status-in-stock';
        const statusText = isAssigned ? t('assigned') : t('available');

        let actionBtn = isAssigned 
            ? `<button class="secondary-btn" style="padding: 4px 10px; font-size: 12px;" onclick="event.stopPropagation(); returnSample('${item.id}')">${t('return')}</button>`
            : `<button class="primary-btn" style="padding: 4px 10px; font-size: 12px;" onclick="event.stopPropagation(); openAssignModal('${item.id}')">${t('assign')}</button>`;

        const tr = document.createElement('tr');
        tr.className = 'clickable';
        tr.onclick = () => openSampleDetailsModal(item.id);
        tr.innerHTML = `
            <td>
                <strong>${item.name}</strong><br>
                <small style="color: var(--text-secondary)">SN: ${item.serial} | ${item.condition || 'FULLBOX'}</small>
            </td>
            <td>${item.assignee || '-'}</td>
            <td>${toDisplayDate(item.dateAssigned)}</td>
            <td>${toDisplayDate(item.returnDate)}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${actionBtn}</td>
        `;
        samplesTableBody.appendChild(tr);
    });
}

function renderSamplesGrid(data) {
    if(!samplesGrid) return;
    samplesGrid.innerHTML = '';
    
    data.forEach(item => {
        const isAssigned = (item.sampleStatus && item.sampleStatus.toLowerCase() === 'assigned');
        const statusClass = isAssigned ? 'status-assigned' : 'status-in-stock';
        const statusText = isAssigned ? t('assigned') : t('available');

        let actionBtn = isAssigned 
            ? `<button class="secondary-btn" style="width: 100%" onclick="event.stopPropagation(); returnSample('${item.id}')">${t('return')}</button>`
            : `<button class="primary-btn" style="width: 100%; justify-content: center;" onclick="event.stopPropagation(); openAssignModal('${item.id}')">${t('assign')}</button>`;

        const card = document.createElement('div');
        card.className = 'item-card clickable';
        card.onclick = () => openSampleDetailsModal(item.id);
        card.innerHTML = `
            <div class="item-card-header">
                <div>
                    <h4 class="item-card-title">${item.name}</h4>
                    <div class="item-card-tags">
                        <span class="tag-badge tag-brand">${item.brand || 'N/A'}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
            </div>
            <div class="item-card-info">
                <span><strong>${t('label_serial')}:</strong> ${item.serial}</span>
                <span><strong>${t('label_condition')}:</strong> ${item.condition || 'FULLBOX'}</span>
                <span><strong>assignee:</strong> ${item.assignee || 'None'}</span>
                ${isAssigned ? `<span><strong>${t('th_date_assigned')}:</strong> ${toDisplayDate(item.dateAssigned)}</span>` : ''}
                ${isAssigned ? `<span><strong>${t('th_return_date')}:</strong> ${toDisplayDate(item.returnDate)}</span>` : ''}
                ${item.notes ? `<span><strong>${t('label_notes')}:</strong> ${item.notes.substring(0, 30)}${item.notes.length > 30 ? '...' : ''}</span>` : ''}
            </div>
            <div class="item-card-footer" style="padding-top: 12px; border-top: 0;">
                ${actionBtn}
            </div>
        `;
        samplesGrid.appendChild(card);
    });
}

function getInventoryStatusInfo(item) {
    if (item.type === 'sample') {
        if((item.sampleStatus && item.sampleStatus.toLowerCase() === 'assigned')) return { statusClass: 'status-assigned', statusText: t('assigned') };
        return { statusClass: 'status-in-stock', statusText: t('available') };
    }

    let statusClass = 'status-in-stock';
    let statusText = t('in_stock');
    
    if (item.quantity === 0) {
        statusClass = 'status-out-of-stock';
        statusText = t('out_of_stock');
    } else if (item.quantity > 0 && item.quantity < 10) {
        statusClass = 'status-low-stock';
        statusText = 'Low Stock';
    }
    
    return { statusClass, statusText };
}

// Global Actions
window.openEditModal = function(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const EditIdEl = document.getElementById('EditItemId');
    if(EditIdEl) EditIdEl.value = item.id;
    
    const titleEl = document.getElementById('itemModalTitle');
    if(titleEl) titleEl.textContent = 'Edit Inventory Item';

    document.getElementById('itemType').value = item.type;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemBrand').value = item.brand;
    document.getElementById('itemLocation').value = item.location;
    document.getElementById('itemDesc').value = item.description || '';

    handleFormTypeChange();

    const btnManageStock = document.getElementById('btnManageStockModal');

    if (item.type === 'sample') {
        document.getElementById('itemSerial').value = item.serial || '';
        const condEl = document.getElementById('itemCondition');
        if (condEl) condEl.value = item.condition || 'FULLBOX';
        if (btnManageStock) btnManageStock.style.display = 'none';
    } else {
        document.getElementById('itemQuantity').value = item.quantity || 0;
        if (btnManageStock) {
            btnManageStock.style.display = 'flex';
            btnManageStock.onclick = () => {
                const modal = document.getElementById('itemModal');
                if (modal) modal.classList.remove('active');
                
                document.getElementById('stockItemId').value = item.id;
                document.getElementById('stockItemNameDisplay').textContent = item.name;
                document.getElementById('stockCurrentQtyDisplay').textContent = `Current Qty: ${item.quantity}`;
                document.getElementById('stockAmount').value = '';
                document.getElementById('stockDescription').value = '';
                document.querySelector('input[name="stockAction"][value="received"]').checked = true;
                
                const sModal = document.getElementById('stockModal');
                if (sModal) sModal.classList.add('active');
            };
        }
    }

    itemModal.classList.add('active');
};

window.openSampleDetailsModal = function(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const isAssigned = (item.sampleStatus && item.sampleStatus.toLowerCase() === 'assigned');
    const statusBadge = isAssigned
        ? `<span class="status-badge status-assigned">Assigned</span>`
        : `<span class="status-badge status-in-stock">Available</span>`;

    // --- Info Section (always Editable) ---
    const infoSection = `
        <div class="sample-detail-section">
            <h4 class="sample-detail-section-title"><i class='bx bx-info-circle'></i> ${t('label_item_info')}</h4>
            <div class="form-row">
                <div class="form-group half">
                    <label for="sdName">${t('label_name')}</label>
                    <input type="text" id="sdName" value="${item.name || ''}" placeholder="${t('label_name')}">
                </div>
                <div class="form-group half">
                    <label for="sdBrand">${t('label_brand')}</label>
                    <input type="text" id="sdBrand" value="${item.brand || ''}" placeholder="${t('label_brand')}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group half">
                    <label for="sdSerial">${t('label_serial')}</label>
                    <input type="text" id="sdSerial" value="${item.serial || ''}" placeholder="${t('label_serial')}">
                </div>
                <div class="form-group half">
                    <label for="sdCondition">${t('label_condition')}</label>
                    <select id="sdCondition">
                        <option value="FULLBOX" ${(!item.condition || item.condition === 'FULLBOX') ? 'selected' : ''}>FULLBOX</option>
                        <option value="NOBOX" ${item.condition === 'NOBOX' ? 'selected' : ''}>NOBOX</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group half">
                    <label for="sdLocation">${t('label_location')}</label>
                    <input type="text" id="sdLocation" value="${item.location || ''}" placeholder="${t('label_location')}">
                </div>
                <div class="form-group half">
                    <label for="sdDesc">${t('label_desc')}</label>
                    <input type="text" id="sdDesc" value="${item.description || ''}" placeholder="${t('placeholder_item_desc')}">
                </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                <div>${statusBadge}</div>
                <div style="display: flex; gap: 12px;">
                    <button class="secondary-btn" style="color: var(--accent-red); border-color: var(--accent-red);" onclick="sendSampleBack('${item.id}')">
                        <i class='bx bx-archive-out'></i> Send to Brand
                    </button>
                    <button class="primary-btn" id="sdSaveInfoBtn" onclick="saveSampleInfo('${item.id}')">
                        <i class='bx bx-save'></i> ${t('btn_save_info')}
                    </button>
                </div>
            </div>
        </div>`;

    // --- Assignment Section ---
    let AssignSection = '';
    if (isAssigned) {
        // Show current Assignment with Editable notes + return button
        AssignSection = `
            <div class="sample-detail-section" style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                <h4 class="sample-detail-section-title"><i class='bx bx-user-check'></i> ${t('current_assignment')}</h4>
                <div class="form-row">
                    <div class="form-group half">
                        <label>${t('th_assignee')}</label>
                        <div class="sd-readonly">${item.assignee || '-'}</div>
                    </div>
                    <div class="form-group half">
                        <label>${t('th_date_assigned')}</label>
                        <div class="sd-readonly">${toDisplayDate(item.dateAssigned)}</div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label>${t('label_expected_return')}</label>
                        <div class="sd-readonly">${toDisplayDate(item.returnDate)}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="sdNotes">${t('label_notes')}</label>
                    <textarea id="sdNotes" style="width:100%; height:72px; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:var(--text-primary); padding:8px; border-radius:8px; font-family:inherit; resize:vertical; font-size:14px;">${item.notes || ''}</textarea>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 4px;">
                    <button class="secondary-btn" onclick="saveSampleNotes('${item.id}')"><i class='bx bx-save'></i> ${t('btn_save_notes')}</button>
                    <button class="secondary-btn" style="color: var(--accent-red); border-color: var(--accent-red);" onclick="sampleDetailsModal.classList.remove('active'); returnSample('${item.id}')"><i class='bx bx-undo'></i> ${t('btn_return_sample')}</button>
                </div>
            </div>`;
    } else {
        // Show Assign form inline
        const todayISO = new Date().toISOString().split('T')[0];
        AssignSection = `
            <div class="sample-detail-section" style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                <h4 class="sample-detail-section-title"><i class='bx bx-user-plus'></i> ${t('modal_assign_title')}</h4>
                <div class="form-group">
                    <label for="sdAssigneeName">${t('label_assignee')}</label>
                    <input type="text" id="sdAssigneeName" placeholder="${t('placeholder_assignee')}">
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label for="sdDateAssigned">${t('label_date_assigned')}</label>
                        <input type="date" id="sdDateAssigned" value="${todayISO}">
                    </div>
                    <div class="form-group half">
                        <label for="sdReturnDate">${t('label_expected_return')}</label>
                        <input type="date" id="sdReturnDate">
                    </div>
                </div>
                <div class="form-group">
                    <label for="sdAssignNotes">${t('label_notes')}</label>
                    <input type="text" id="sdAssignNotes" placeholder="${t('placeholder_notes')}">
                </div>
                <div style="margin-top: 4px;">
                    <button class="primary-btn" style="width:100%; justify-content:center;" onclick="AssignFromDetailsModal('${item.id}')">
                        <i class='bx bx-user-check'></i> ${t('btn_confirm_assign')}
                    </button>
                </div>
            </div>`;
    }

    if (sampleDetailsContent) sampleDetailsContent.innerHTML = infoSection + AssignSection;
    if (sampleDetailsModal) sampleDetailsModal.classList.add('active');
};

window.saveSampleInfo = async function(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const updates = {
        name: document.getElementById('sdName').value.trim(),
        brand: document.getElementById('sdBrand').value.trim(),
        serial: document.getElementById('sdSerial').value.trim(),
        condition: document.getElementById('sdCondition') ? document.getElementById('sdCondition').value : 'FULLBOX',
        location: document.getElementById('sdLocation').value.trim(),
        description: document.getElementById('sdDesc') ? document.getElementById('sdDesc').value.trim() : '',
    };

    if (!updates.name) { alert('Name is required.'); return; }

    try {
        const index = inventory.findIndex(i => i.id === id);
        if (index !== -1) {
            inventory[index] = { ...inventory[index], ...updates };
            await driveWrite('item-data.json', inventory);
        }

        logActivity('update', `Updated info for <strong>${updates.name}</strong>${updates.serial ? ` (SN: ${updates.serial})` : ''}`);
        applyFiltersAndRender();
        applySampleFiltersAndRender(); updateDashboardStats();
        populateFilterDropdowns();

        const btn = document.getElementById('sdSaveInfoBtn');
        if (btn) {
            btn.innerHTML = `<i class='bx bx-check'></i> Saved!`;
            btn.style.background = 'var(--accent-green)';
            setTimeout(() => {
                btn.innerHTML = `<i class='bx bx-save'></i> ${t('btn_save_info')}`;
                btn.style.background = '';
            }, 2000);
        }
    } catch (err) {
        console.error('Error saving sample info:', err);
        alert('Failed to save item info.');
    }
};

window.AssignFromDetailsModal = async function(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const assignee = document.getElementById('sdAssigneeName').value.trim();
    if (!assignee) { alert('Please enter an assignee name.'); return; }

    const updates = {
        assignee,
        dateAssigned: document.getElementById('sdDateAssigned').value,
        returnDate: document.getElementById('sdReturnDate').value || 'N/A',
        notes: document.getElementById('sdAssignNotes').value.trim(),
        sampleStatus: 'Assigned'
    };

    try {
        const index = inventory.findIndex(i => i.id === id);
        if (index !== -1) {
            inventory[index] = { ...inventory[index], ...updates };
            await driveWrite('item-data.json', inventory);
        }

        logActivity('update', `Assigned <strong>${item.name}</strong>${item.serial ? ` (SN: ${item.serial})` : ''} to ${assignee}`);

        applyFiltersAndRender();
        applySampleFiltersAndRender(); updateDashboardStats();

        // Refresh the modal to show Assigned state
        sampleDetailsModal.classList.remove('active');
        setTimeout(() => openSampleDetailsModal(id), 100);
    } catch (err) {
        console.error('Error Assigning sample:', err);
        alert('Failed to Assign sample. Error: ' + err.message);
    }
};

window.saveSampleNotes = async function(id) {
    const input = document.getElementById('sdNotes');
    if(!input) return;
    const newNotes = input.value;
    const item = inventory.find(i => i.id === id);
    if(!item) return;
    try {
        const index = inventory.findIndex(i => i.id === id);
        if (index !== -1) {
            inventory[index] = { ...inventory[index], notes: newNotes };
            await driveWrite('item-data.json', inventory);
        }
        logActivity('update', `Updated notes for sample <strong>${item.name}</strong>`);
        applyFiltersAndRender();
        applySampleFiltersAndRender(); updateDashboardStats();
        const btn = input.nextElementSibling;
        if(btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = `<i class='bx bx-check'></i> Saved!`;
            btn.style.color = 'var(--accent-green)';
            setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
        }
    } catch (error) {
        console.error("Error saving notes: ", error);
        alert("Failed to save notes.");
    }
};

window.deleteItem = async function(id) {
    if(confirm('Are you sure you want to Delete this item?')) {
        const item = inventory.find(i => i.id === id);
        if(item) {
            try {
                const index = inventory.findIndex(i => i.id === id);
                if (index !== -1) {
                    inventory.splice(index, 1);
                    await driveWrite('item-data.json', inventory);
                }
                
                logActivity('remove', `Deleted <strong>${item.name}</strong>`);
                
                populateFilterDropdowns();
                applyFiltersAndRender();
                applySampleFiltersAndRender(); updateDashboardStats();
                updateDashboardStats();
            } catch (error) {
                console.error("Error deleting item: ", error);
            }
        }
    }
};

window.sendSampleBack = async function(id) {
    if(confirm('Are you sure you want to send this sample back to the brand? This will permanently remove it from inventory.')) {
        const item = inventory.find(i => i.id === id);
        if(item) {
            try {
                const index = inventory.findIndex(i => i.id === id);
                if (index !== -1) {
                    inventory.splice(index, 1);
                    await driveWrite('item-data.json', inventory);
                }
                
                logActivity('remove', `Sent Sample <strong>${item.name}</strong>${item.serial ? ` (SN: ${item.serial})` : ''} back to Brand (${item.brand || 'Unknown'})`);
                
                const modal = document.getElementById('sampleDetailsModal');
                if (modal) modal.classList.remove('active');

                populateFilterDropdowns();
                applyFiltersAndRender();
                applySampleFiltersAndRender(); 
                updateDashboardStats();
            } catch (error) {
                console.error("Error sending sample back: ", error);
            }
        }
    }
};

window.openAssignModal = function(id) {
    document.getElementById('assignItemId').value = id;
    // Pre-fill Date Assigned to today
    const todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('assignDateAssigned').value = todayISO;
    AssignModal.classList.add('active');
};

window.returnSample = async function(id) {
    if(confirm('Mark this sample as Returned?')) {
        const item = inventory.find(i => i.id === id);
        if(item) {
            try {
                const updates = {
                    assignee: null,
                    dateAssigned: null,
                    returnDate: null,
                    notes: null,
                    sampleStatus: 'available'
                };
                const index = inventory.findIndex(i => i.id === id);
                if (index !== -1) {
                    inventory[index] = { ...inventory[index], ...updates };
                    await driveWrite('item-data.json', inventory);
                }

                logActivity('update', `Returned <strong>${item.name}</strong>${item.serial ? ` (SN: ${item.serial})` : ''} from ${item.assignee}`);
                
                applyFiltersAndRender();
                applySampleFiltersAndRender(); updateDashboardStats();
            } catch (error) {
                console.error("Error Returning sample: ", error);
            }
        }
    }
};

async function logActivity(type, text) {
    try {
        const newLog = {
            id: generateId(),
            type: type,
            text: text,
            time: new Date().toLocaleString()
        };
        
        activityLog.unshift(newLog);
        if (activityLog.length > 50) activityLog.pop();
        
        await driveWrite('log-data.json', activityLog);
        
        renderActivityLog();
        if(typeof renderFullActivityLog === 'function') renderFullActivityLog();
    } catch (e) {
        console.error("Error logging activity: ", e);
    }
}

function updateDashboardStats() {
    const dashboardBrandCards = document.getElementById('dashboardBrandCards');
    if(!dashboardBrandCards) return;

    // 1. Group samples by Brand
    const samples = inventory.filter(i => i.type === 'sample');
    const brandStats = {};

    samples.forEach(s => {
        const brand = s.brand || 'Unbranded';
        if (!brandStats[brand]) {
            brandStats[brand] = { total: 0, Assigned: 0, available: 0 };
        }
        brandStats[brand].total++;
        if ((s.sampleStatus && s.sampleStatus.toLowerCase() === 'assigned')) {
            brandStats[brand].Assigned++;
        } else {
            brandStats[brand].available++;
        }
    });

    // Generate HTML for Brand Cards
    dashboardBrandCards.innerHTML = '';
    const sortedBrands = Object.keys(brandStats).sort();
    
    if (sortedBrands.length === 0) {
        dashboardBrandCards.innerHTML = '<p style="color: var(--md-sys-color-on-surface-variant)">No samples found in inventory.</p>';
    } else {
        sortedBrands.forEach(b => {
            const stats = brandStats[b];
            const cardHTML = `
                <div class="brand-stat-card glass-panel clickable" onclick="navigateToSampleBrand('${b}')">
                    <div class="brand-stat-header">
                        <span class="brand-stat-title">${b}</span>
                        <div class="brand-stat-icon">
                            <i class='bx bx-user-pin'></i>
                        </div>
                    </div>
                    <div class="brand-stat-metrics">
                        <div class="brand-metric total">
                            <span>${t('total_samples')}</span>
                            <span class="value">${stats.total}</span>
                        </div>
                        <div class="brand-metric">
                            <span>${t('assigned')}</span>
                            <span class="value" style="color: var(--md-sys-color-primary)">${stats.Assigned}</span>
                        </div>
                        <div class="brand-metric">
                            <span>${t('available')}</span>
                            <span class="value" style="color: var(--accent-green)">${stats.available}</span>
                        </div>
                    </div>
                </div>
            `;
            dashboardBrandCards.insertAdjacentHTML('beforeend', cardHTML);
        });
    }
}

window.navigateToSampleBrand = function(brand) {
    // 1. Highlight the samples link in the sidebar
    sidebarLinks.forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-view') === 'samples') {
            l.classList.add('active');
        }
    });
    
    // 2. Switch to samples view
    views.forEach(view => {
        view.classList.remove('active');
        if(view.id === 'samplesView') {
            view.classList.add('active');
        }
    });

    // 3. Set the filter and render
    if(filterSampleBrand) {
        filterSampleBrand.value = brand;
    }
    applySampleFiltersAndRender(); updateDashboardStats();
};

function renderActivityLog() {
    if(!activityList) return;
    activityList.innerHTML = '';
    activityLog.forEach(log => {
        let iconClass = 'bx-plus';
        if(log.type === 'remove') iconClass = 'bx-trash';
        if(log.type === 'update') iconClass = 'bx-refresh';

        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `
            <div class="activity-icon ${log.type}">
                <i class='bx ${iconClass}'></i>
            </div>
            <div class="activity-details">
                <p>${log.text}</p>
                <div class="activity-time">${log.time}</div>
            </div>
        `;
        activityList.appendChild(li);
    });
}

function renderFullActivityLog() {
    if(!fullActivityTableBody) return;
    fullActivityTableBody.innerHTML = '';
    
    const filteredLogs = activityLog.filter(log => {
        if (!currentSearchTerm) return true;
        return log.text.toLowerCase().includes(currentSearchTerm) || 
               log.type.toLowerCase().includes(currentSearchTerm) ||
               log.time.toLowerCase().includes(currentSearchTerm);
    });

    if (document.getElementById('logsView') && document.getElementById('logsView').classList.contains('active')) {
        updateSearchBadge(filteredLogs.length);
    }

    filteredLogs.forEach(log => {
        let iconClass = 'bx-plus';
        let actionLabel = 'Added';
        let statusClass = 'status-in-stock';
        
        if(log.type === 'remove') {
            iconClass = 'bx-trash';
            actionLabel = 'Removed';
            statusClass = 'status-out-of-stock';
        }
        if(log.type === 'update') {
            iconClass = 'bx-refresh';
            actionLabel = 'Updated';
            statusClass = 'status-assigned';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="status-badge ${statusClass}" style="display: inline-flex; align-items: center; gap: 4px;">
                    <i class='bx ${iconClass}'></i> ${actionLabel}
                </span>
            </td>
            <td>${log.text}</td>
            <td>${log.time}</td>
        `;
        fullActivityTableBody.appendChild(tr);
    });
}

window.addEventListener('languageChanged', () => {
    populateFilterDropdowns();
    updateDashboardStats();
    applyFiltersAndRender();
    applySampleFiltersAndRender(); updateDashboardStats();
    renderActivityLog();
    if(typeof renderFullActivityLog === 'function') renderFullActivityLog();
});



