# GTM Tag Report Generator

## Overview

This Node.js script processes JSON files exported from Google Tag Manager (GTM) and generates a spreadsheet with tabs summarizing tag information. The generated tables are saved in an `output` folder, with filenames based on the `publicId` of each GTM container.

## Features

- Extracts and formats tag data from JSON files.
- Generates a spreadsheet with a tab for each GTM container.
- Supports dynamic URL generation if `accountId`, `containerId`, and `workspaceId` are present.

## Prerequisites

- **Node.js**: Ensure Node.js is installed on your machine. If not, follow the installation instructions below.

## Installation

### Install Node.js

1. **Download and Install Node.js**:
   - **Windows/Mac**: Go to the [Node.js official website](https://nodejs.org/), download the installer for your operating system, and run it.
   - **Linux**: Use a package manager. For example, on Ubuntu:
     ```bash
     sudo apt update
     sudo apt install nodejs npm
     ```

2. **Verify Installation**:
   Open a terminal or command prompt and check the installed versions:
   ```bash
   node -v
   npm -v


## Usage

1. **Prepare Your Files**:
   - Place your GTM JSON export files in the `exports` folder.
   - Ensure the `exports` folder is in the project root directory.

2. **Ensure Default Workspace**:
   - The script assumes that the exported JSON files are from the default workspace. Ensure that your GTM export is set to include data from the default workspace or adjust the script accordingly.

3. **Run the Script**:
   - Open a terminal or command prompt.
   - Navigate to the folder containing the script (`gtm.js`):
     ```bash
     cd <project-directory>
     ```
   - Execute the script with the following command:
     ```bash
     node gtm.js
     ```

4. **Check the Output**:
   - After running the script, HTML files will be generated in the `output` folder.
   - Each file is named using the `publicId` of the GTM container.


   - If these arguments are not provided, the tag names in the HTML will be displayed as plain text.
