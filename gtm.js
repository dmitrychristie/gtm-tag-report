const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Directory paths
const exportsDir = path.join(__dirname, 'exports');
const outputDir = path.join(__dirname, 'output');
const defaultWorkspaceId = '1';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Read files from exports directory
fs.readdir(exportsDir, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    const workbook = XLSX.utils.book_new();

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            processFile(path.join(exportsDir, file), workbook);
        }
    });

    // Save the XLSX file
    const xlsxFilePath = path.join(outputDir, 'containers.xlsx');
    XLSX.writeFile(workbook, xlsxFilePath);
    console.log(`XLSX file generated and saved to ${xlsxFilePath}`);
});

function processFile(filePath, workbook) {
    console.log('Processing file:', filePath);

    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonData);
    const tags = data.containerVersion.tag;
    const folders = data.containerVersion.folder || [];
    const triggers = data.containerVersion.trigger || [];
    const accountId = data.containerVersion.accountId;
    const containerId = data.containerVersion.containerId;

    // Build folder ID to name map
    const folderMap = {};
    folders.forEach(folder => {
        folderMap[folder.folderId] = folder.name;
    });

    // Build trigger ID to name map
    const triggerMap = {};
    triggers.forEach(trigger => {
        triggerMap[trigger.triggerId] = trigger.name;
    });

    // Extract workspaceId from filename
    const workspaceMatch = filePath.match(/workspace(\d+)/);
    const workspaceId = workspaceMatch ? workspaceMatch[1] : defaultWorkspaceId;

    // Create a new sheet for the container
    const publicId = data.containerVersion.container.publicId;
    const sheetData = [];

    // Define CSV headers
    const headers = [
        'Tag Name', 'Tag Type', 'Triggering Conditions', 'Folder',
        'Last Edited', 'Status (Active/Paused)', 'Ad Network', 
        'Integration (CAPI/Pixel/Dual)', 'User ID', 
        'Segment Anonymous ID', 'City, State, Zip Code, Country', 
        'Order ID', 'Order Amount ($)', 'Product Details (Ecommerce)', 
        'URL'
    ];

    // Add headers to the sheet
    sheetData.push(headers);

    tags.forEach(tag => {
        const isMetaOrPinterest = tag.type && (tag.type.toLowerCase().includes('facebook') || tag.type.toLowerCase().includes('pinterest'));
        const integration = isMetaOrPinterest ? 'dual' : 'Pixel';

        const userID = containsVariable(tag, '{{DL - userId}}') ? 'TRUE' : 'FALSE';
        const anonymousId = containsVariable(tag, '{{DL - anonymousId}}') ? 'TRUE' : 'FALSE';
        const userGeolocation = integration === 'dual' || integration === 'CAPI' ? 'TRUE' : 'FALSE';

        // Get folder name from folder ID
        const folderName = tag.parentFolderId ? folderMap[tag.parentFolderId] || 'Unknown Folder' : '';
        
        // Get trigger names
        let firingConditions = tag.firingTriggerId ? tag.firingTriggerId.map(id => triggerMap[id] || `Unknown Trigger (${id})`).join(", ") : '';
        if (tag.blockingTriggerId && tag.blockingTriggerId.length > 0) {
            firingConditions += `\n**Exceptions:** ${tag.blockingTriggerId.map(id => triggerMap[id] || `Unknown Trigger (${id})`).join(", ")}`;
        }

        const tagTypeFormatted = tagTypeMapping[tag.type] || tag.type || 'Unknown';

        // URL for the tag
        const url = `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tag.tagId}`;

        // Add row to the sheet
        sheetData.push([
            tag.name || '',
            tagTypeFormatted,
            firingConditions,
            folderName,
            'a year ago',
            tag.paused ? 'Paused' : 'Active',
            determineAdNetwork(tag.type),
            integration,
            userID,
            anonymousId,
            userGeolocation,
            containsVariable(tag, 'DL - order_id') || containsVariable(tag, 'DL - orderID') ? 'TRUE' : 'FALSE',
            containsVariable(tag, '{{DL - total}}') ? 'TRUE' : 'FALSE',
            containsVariable(tag, '{{DL - product}}') || containsVariable(tag, '{{DL - product_id}}') || containsVariable(tag, '{{DL - productCategory}}') ? 'TRUE' : 'FALSE',
            url
        ]);
    });

    // Add sheet to workbook
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, publicId);
}

function containsVariable(tag, variable) {
    const checkInObject = obj => {
        if (typeof obj === 'string') {
            return obj.includes(variable);
        }
        if (typeof obj === 'object') {
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (checkInObject(obj[key])) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    return checkInObject(tag);
}

function determineAdNetwork(type) {
    if (type.toLowerCase().includes('facebook') || type.toLowerCase().includes('meta')) {
        return 'Meta';
    } else if (type.toLowerCase().includes('google') || type.toLowerCase().includes('adwords')) {
        return 'Google';
    } else if (type.toLowerCase().includes('tiktok')) {
        return 'TikTok';
    } else if (type.toLowerCase().includes('pinterest')) {
        return 'Pinterest';
    } else {
        return 'N/A';
    }
}

// Define tag type mappings
const tagTypeMapping = {
    'html': 'Custom HTML',
    'google_ads_remarketing': 'Google Ads Remarketing',
    'google_ads_conversion_tracking': 'Google Ads Conversion Tracking',
    'gaawe': 'Google Analytics 4',
    'ua': 'Google Analytics UA',
    'conversion_linker': 'Conversion Linker',
    'pinterest_tag': 'Pinterest Tag',
    'google_tag': 'Google Tag',
    'custom_image': 'Custom Image',
    'awct': 'Google Ads',
    'pntr': 'Pinterest Tag',
    'googtag': 'Google Tag'
    // Add any other specific mappings here if necessary
};
