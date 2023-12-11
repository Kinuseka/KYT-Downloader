//FUNctions ;)
const querystring = require('querystring');
const axios = require('axios')

function fetchYouTubeVideoId(url) {
    if (!(/(www\.)?youtube\.com|youtu\.be/).test(url)) {
        return false;
    }
    var parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch(error) {
        return error;
    }
    let videoId = null;
  
    const hostname = parsedUrl.hostname.replace('www.', ''); // Remove "www" subdomain if present
    
    if (hostname === 'youtube.com') {
        if (/\/shorts\//.test(url)) {
            videoId = parsedUrl.pathname.split('/').pop();
        } else {
            const queryParams = querystring.parse(parsedUrl.search.substring(1));
            videoId = queryParams.v;
        }
    } else if (hostname === 'youtu.be') {
        const pathname = parsedUrl.pathname.substring(1); // Remove leading slash
        videoId = pathname;
    }
    console.log(videoId, url)
    return videoId || false;
}
function Sortvideo(videos = []){
    uniqueQualityIdentifier = {};
    let preferredVideos = videos.filter((element)=>{
        if (element.videoCodec === "vp9" || element.videoCodec.startsWith("avc1")){
            let key = `${element.width}x${element.height}`;
            if (!uniqueQualityIdentifier[key]){
                uniqueQualityIdentifier[key] = true;
                return true;
            }
        }
        return false;
    });
    let arrangedVideos = preferredVideos.sort((a,b)=>{
        let qualityA = a.height;
        let qualityB = b.height;
        return qualityB - qualityA;
    })
    return arrangedVideos;
}
function SortAudio(audios = []){
    let preferredAudio = audios.filter(element=>{
        return element.audioCodec === "mp4a.40.2";
    });
    return preferredAudio;
}
async function FetchtoBase(url) {
    try {
        var response = await axios.get(url,{responseType: 'arraybuffer'})
        var base64Image = Buffer.from(response.data, 'binary').toString('base64');
        return base64Image;
    } catch (e) {
        return {code: e, done: true}
    }
}

function formatTime(time) {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
  
    if (time >= 3600) {
      hours = Math.floor(time / 3600);
      time -= hours * 3600;
    }
  
    if (time >= 60) {
      minutes = Math.floor(time / 60);
      time -= minutes * 60;
    }
  
    seconds = Math.floor(time);
  
    const formattedTime = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    return formattedTime;
  }
  
  function padZero(number) {
    return number.toString().padStart(2, '0');
  }
  

module.exports = {fetchYouTubeVideoId, Sortvideo, FetchtoBase, formatTime, SortAudio}