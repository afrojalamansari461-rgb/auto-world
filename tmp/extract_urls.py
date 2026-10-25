import os
import re
import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = set()
url_pattern = re.compile(r'https?://[^\s"\'`<>]+', re.IGNORECASE)

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith((".tsx", ".ts", ".html")):
            with open(os.path.join(root, file), "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                for u in url_pattern.findall(content):
                    u = re.sub(r'[\)\}\]\,\;\>]+$', '', u)
                    urls.add(u)

for p in ["index.html", "public/robots.txt", "public/sitemap.xml"]:
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            for u in url_pattern.findall(f.read()):
                u = re.sub(r'[\)\}\]\,\;\>]+$', '', u)
                urls.add(u)

print(f"Total unique URLs found: {len(urls)}")
with open("urls_found.txt", "w") as out:
    for u in sorted(urls):
        out.write(u + "\n")
