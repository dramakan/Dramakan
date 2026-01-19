import os
import re
from playwright.sync_api import sync_playwright

# --- CONFIGURATION ---
# "os.getcwd()" automatically finds the folder you are running the script from.
PROJECT_FOLDER = os.getcwd() 

def run_sanity_check():
    print(f"📂 Current Working Directory: {PROJECT_FOLDER}")
    print("-" * 30)

    # 1. SCAN FOR HTML FILES
    html_files = []
    for root, dirs, files in os.walk(PROJECT_FOLDER):
        for file in files:
            if file.endswith(".html"):
                full_path = os.path.join(root, file)
                html_files.append(full_path)
                print(f"📄 Found File: {file}")

    if not html_files:
        print("\n❌ ERROR: No .html files found in this folder!")
        print("   -> Make sure you saved this script INSIDE your website folder.")
        return

    # 2. SCAN FOR JS LINKS
    print("-" * 30)
    print("⛏️  Mining for 'url:' patterns...")
    
    links_to_check = []
    # Regex: Matches url: 'http...' OR url: "http..."
    url_pattern = re.compile(r"url\s*:\s*['\"](https?://[^'\"]+)['\"]")

    for path in html_files:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = url_pattern.findall(content)
                if matches:
                    print(f"   ✅ Found {len(matches)} links in {os.path.basename(path)}")
                    # Save just the first link of each file to test
                    links_to_check.append(matches[0]) 
                else:
                    print(f"   ⚠️ No links found in {os.path.basename(path)} (Check your spelling of 'url:')")
        except Exception as e:
            print(f"   ❌ Read Error: {e}")

    if not links_to_check:
        print("\n❌ ERROR: No links found in any file.")
        print("   -> Check if your HTML files actually have 'const episodeData = ...' inside them.")
        return

    # 3. TEST BROWSER & SCREENSHOT
    print("-" * 30)
    print(f"📸 Attempting to screenshot the first link: {links_to_check[0]}")
    
    try:
        with sync_playwright() as p:
            print("   -> Launching Browser...")
            browser = p.chromium.launch(headless=False) # You should see a window open
            page = browser.new_page()
            
            print(f"   -> Visiting {links_to_check[0]}...")
            page.goto(links_to_check[0], timeout=15000)
            
            # Wait 2 seconds
            page.wait_for_timeout(2000)
            
            # Save Screenshot
            output_file = os.path.join(PROJECT_FOLDER, "TEST_EVIDENCE.png")
            page.screenshot(path=output_file)
            
            print(f"   ✅ SUCCESS! Saved screenshot to: {output_file}")
            browser.close()

    except Exception as e:
        print(f"\n❌ BROWSER CRASHED: {e}")
        print("   -> Try running 'playwright install' in your terminal again.")

if __name__ == "__main__":
    run_sanity_check()