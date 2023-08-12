# KYT-Downloader
KYT-Downloader is a super simple self-hosted youtube downloader designed for small-scale usage.

Live Instance: https://kinuseka.us/video

# Installation

## Clone repo and install packages:
```
git clone https://github.com/Kinuseka/KYT-Downloader.git
npm i
```
## Install dependencies:
```
sudo apt update
sudo apt install -y ffmpeg redis-server
```
## Setup config.json
Generate your secret using `openssl rand -hex 32`
and paste on the config.json. Use different secrets on each of them.

Feel free to increase/decrease the maximum values on the config.json depending on your hardware specification. 
(Fast I/O speed and Internet speed is recommended for stable operation)

## Run the webserver
**Start with:** 
`npm run prod` 

**To run it on a different port:**
`PORT=XXXX npm run prod` 

# Notes and Disclaimer:
* It is highly recommended to run this under a reverse proxy like *NGINX*.
* The speed of the downloader is dependent on the specifications of your server or the device which are used to host this service on.
* This project was made with an intention to learn the intricacies of this programming language, any malicious activties that is somehow related to the usage of this project is not of an intent to the author and should solely be the responsibility of the user.
