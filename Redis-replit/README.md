# Redis for replit
This replit will download source code then build it after that it will move all binaries to bin file.  
After that feels free to remove anything but bin folder.  
Enjoy :)  
## Side notes
I recommend you build it but if you don't want to waste your time, you can grab one in bin folder instead but still recommend build it though.  
## How do I update my redis?
1. Go to the redis website and grab the url
2. curl it like
```bash
curl https://github.com/redis/redis/archive/7.0-rc1.tar.gz
```
You should see something like this
```html
<html><body>You are being <a href="https://codeload.github.com/redis/redis/tar.gz/refs/tags/7.0-rc1">redirected</a>.</body></html>
```
Grab the codeload url then edit the main.sh to something like this
```bash
curl <url> -o file.tar.gz
```
Then delete every folder then start new again.
## How to start the redis server
just run
```bash
./bin/redis-server --port 80
```
you may need to do chmod
