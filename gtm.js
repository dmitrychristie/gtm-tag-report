const fs = require('fs');
const path = require('path');

// Path to the exports folder
const exportsFolderPath = path.join(__dirname, 'exports');
const outputFolderPath = path.join(__dirname, 'output');

// Create the output directory if it does not exist
if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath);
}

// Read all JSON files in the exports folder
fs.readdir(exportsFolderPath, (err, files) => {
    if (err) {
        console.error('Error reading exports folder:', err);
        return;
    }

    // Filter for JSON files
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    jsonFiles.forEach(file => {
        // Extract workspaceId from file name if present
        const workspaceIdMatch = file.match(/workspace(\d+)/);
        const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : '1';

        // Path to the current JSON file
        const jsonFilePath = path.join(exportsFolderPath, file);
        const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
        const data = JSON.parse(jsonData);

        // Log data for debugging
        console.log(`Processing file: ${file}`);
        console.log(`Data:`, data);

        // Extract accountId and containerId from the JSON data
        const accountId = data.containerVersion?.accountId;
        const containerId = data.containerVersion?.containerId;
        const publicId = data.containerVersion?.container?.publicId;

        if (!accountId || !containerId || !publicId) {
            console.error(`Missing accountId, containerId, or publicId in file: ${file}`);
            return;
        }

        // Extract tags, folders, and triggers from the JSON
        const tags = data.containerVersion?.tag || [];
        const folders = data.containerVersion?.container?.folders || {};
        const triggers = data.containerVersion?.trigger || [];

        // Create a mapping of folder IDs to folder names
        const folderIdToName = {};
        Object.values(folders).forEach(folder => {
            if (folder.name && folder.folderId) {
                folderIdToName[folder.folderId] = folder.name;
            }
        });

        // Create a mapping of trigger IDs to trigger names
        const triggerIdToName = {};
        triggers.forEach(trigger => {
            if (trigger.name && trigger.triggerId) {
                triggerIdToName[trigger.triggerId] = trigger.name;
            }
        });

        // Define the columns
        const columns = [
            'Tag Name',
            'Tag Type',
            'Triggering Conditions',
            'Folder',
            'Last Edited',
            'Status (Active/Paused)',
            'Ad Network',
            'Integration (CAPI/Pixel/Dual)',
            'User ID',
            'Segment Anonymous ID',
            'City, State, Zip Code, Country',
            'IP Address',
            'Order ID',
            'Order Amount ($)',
            'Product Details (Ecommerce)'
        ];

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

        // Define ad network mappings
        const adNetworkMapping = {
            'meta': 'Meta',
            'facebook': 'Meta',
            'google ads': 'Google',
            'adwords': 'Google',
            'tiktok': 'TikTok',
            'pinterest': 'Pinterest'
        };

        // Define integration mappings
        const integrationMapping = {
            'meta': 'dual',
            'facebook': 'dual',
            'pinterest': 'dual',
            'default': 'Pixel'
        };

        // Helper function to determine if a tag contains a variable
        const containsVariable = (tag, variable) => {
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
        };

        // Helper function to determine the ad network
        const determineAdNetwork = (tagName) => {
            tagName = tagName.toLowerCase();
            for (let keyword in adNetworkMapping) {
                if (tagName.includes(keyword)) {
                    return adNetworkMapping[keyword];
                }
            }
            return 'N/A'; // Default value if no match is found
        };

        // Helper function to determine the integration type
        const determineIntegration = (adNetwork) => {
            return integrationMapping[adNetwork.toLowerCase()] || integrationMapping['default'];
        };

        // Helper function to determine the order ID
        const determineOrderID = (tag) => {
            const hasOrderId = containsVariable(tag, '{{DL - order_id}}') || containsVariable(tag, '{{DL - orderID}}');
            return hasOrderId ? 'TRUE' : 'FALSE';
        };

        // Helper function to determine the order amount
        const determineOrderAmount = (tag) => {
            const hasTotal = containsVariable(tag, '{{DL - total}}');
            return hasTotal ? 'TRUE' : 'FALSE';
        };

        // Helper function to determine the product details
        const determineProductDetails = (tag) => {
            const hasProduct = containsVariable(tag, '{{DL - product}}') ||
                               containsVariable(tag, '{{DL - product_id}}') ||
                               containsVariable(tag, '{{DL - productCategory}}');
            return hasProduct ? 'TRUE' : 'FALSE';
        };

        // Generate the table
        let html = '<!DOCTYPE html><html><head><title>Tags Table</title></head><body>';
        html += '<table border="1"><tr>';

        // Table headers
        columns.forEach(column => {
            html += `<th>${column}</th>`;
        });
        html += '</tr>';

        // Iterate through each tag and fill in the data
        tags.forEach(tag => {
            // Determine if the tag is for Meta/Facebook or Pinterest
            const adNetwork = tag.name ? determineAdNetwork(tag.name) : 'N/A';

            // Define integration based on the ad network
            const integration = determineIntegration(adNetwork);

            // Determine User ID and Segment Anonymous ID values
            const userID = containsVariable(tag, '{{DL - userId}}') ? 'TRUE' : 'FALSE';
            const anonymousId = containsVariable(tag, '{{DL - anonymousId}}') ? 'TRUE' : 'FALSE';
            
            // Set 'City, State, Zip Code, Country' to TRUE for dual and CAPI setups
            const cityStateZipCountry = integration === 'dual' || integration === 'CAPI' ? 'TRUE' : 'FALSE';

            // Determine Order ID value
            const orderID = determineOrderID(tag);

            // Determine Order Amount value
            const orderAmount = determineOrderAmount(tag);

            // Determine Product Details value
            const productDetails = determineProductDetails(tag);

            // Get folder name from folder ID using the mapping
            const folderName = tag.parentFolderId ? folderIdToName[tag.parentFolderId] || tag.parentFolderId : '';

            // Map tag type to the defined formats
            const tagTypeFormatted = tagTypeMapping[tag.type] || tag.type || 'Unknown';

            // Create a link to the tag in the GTM interface if accountId, containerId, and workspaceId are available
            const tagLink = accountId && containerId && workspaceId && tag.tagId
                ? `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tag.tagId}`
                : '';

            // Triggering Conditions
            let firingConditions = '';
            if (tag.firingTriggerId && tag.firingTriggerId.length > 0) {
                firingConditions = tag.firingTriggerId.map(id => triggerIdToName[id] || id).join(", ");
            }
            if (tag.blockingTriggerId && tag.blockingTriggerId.length > 0) {
                const exceptions = tag.blockingTriggerId.map(id => triggerIdToName[id] || id).join(", ");
                firingConditions += firingConditions ? `<br><strong>Exceptions:</strong><br>${exceptions}` : `<strong>Exceptions:</strong><br>${exceptions}`;
            }

            html += '<tr>';
            html += tagLink
                ? `<td><a href="${tagLink}" target="_blank">${tag.name || ''}</a></td>` // Tag Name with link
                : `<td>${tag.name || ''}</td>`; // Tag Name without link
            html += `<td>${tagTypeFormatted}</td>`; // Tag Type
            html += `<td>${firingConditions}</td>`; // Triggering Conditions
            html += `<td>${folderName}</td>`; // Folder
            html += '<td>a year ago</td>'; // Last Edited
            html += `<td>${tag.paused ? 'Paused' : 'Active'}</td>`; // Status
            html += `<td>${adNetwork}</td>`; // Ad Network
            html += `<td>${integration}</td>`; // Integration
            html += `<td>${userID}</td>`; // User ID
            html += `<td>${anonymousId}</td>`; // Segment Anonymous ID
            html += `<td>${cityStateZipCountry}</td>`; // City, State, Zip Code, Country
            html += '<td>TRUE</td>'; // IP Address
            html += `<td>${orderID}</td>`; // Order ID
            html += `<td>${orderAmount}</td>`; // Order Amount
            html += `<td>${productDetails}</td>`; // Product Details
            html += '</tr>';
        });

        html += '</table></body></html>';

        // Write the HTML to a file named after the publicId
        const outputFileName = `${publicId}.html`;
        const outputFilePath = path.join(outputFolderPath, outputFileName);
        fs.writeFileSync(outputFilePath, html, 'utf-8');

        console.log(`Table generated and saved to ${outputFilePath}`);
    });
});
