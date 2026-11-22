# Local Development Guide

To ensure the website functions correctly and performs optimally, it must be served via a local web server.

## Why a server is needed
The site uses the `fetch()` API to load animation frames for the background. For security reasons, modern browsers block `fetch()` requests to local files (`file://` protocol) due to CORS (Cross-Origin Resource Sharing) policies.

When opened as a file, you will see numerous CORS errors in the console, and the animation will fall back to a slower loading method.

## How to run the project

### Option 1: VS Code Live Server (Recommended)
1. Install the **Live Server** extension by Ritwick Dey.
2. Right-click `index.html` and select **Open with Live Server**.

### Option 2: Node.js / npx
Run the following command in the project root:
```sh
npx serve .
```

### Option 3: Python
Run the following command in the project root:
```sh
python3 -m http.server 8000
```

Once the server is running, access the site via `http://localhost:5500` (or the port provided by your server).
