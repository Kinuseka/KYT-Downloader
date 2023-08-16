const express = require('express');
const router = express.Router();
var session = require('express-session');

const ytdl = require("ytdl-core");
const path = require("path");
const fs = require('fs');
const contentDisposition = require('content-disposition');

const config_file = require('./config.json')
const response = require("./essentials/responses").Responses;
const { fetchYouTubeVideoId, Sortvideo, SortAudio, FetchtoBase, formatTime} = require("./essentials/parser");
const { verifyToken, createToken } = require("./essentials/authentication");
const { VideoProcess, cleanCache, VideoFileIfAvail } = require("./essentials/videoProcessor");

//Constant variables
const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));
const MAX_CACHE = config_file.Cache_size_GB/*gb*/ * (1024 * 1024 * 1024);
const MAX_FILE = config_file.Maximum_size_GB/*gb*/ * (1024 * 1024 * 1024);
const MAX_LENGTH = config_file.Longest_time_HR  /*HR*/ * (60*60);
const fileKey = "ThisIsFile"; //Does not require secure string
const {dir} = require('./constant')

var expressSession = session({
    name: 'KYTDownloader',
    secret: config_file.SECRET_SESSION,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 /*Hours*/* 60 * 60 * 1000
    }
    // store:  MongoStore.create({
    //   mongoUrl: `mongodb+srv://${config.DB_USER}:${config.DB_PASSWORD}@${config.ENDPOINT}/${config.DATABASE}?retryWrites=true&w=majority`,
    //   dbName: config.DATABASE
    // })
});
//simple conversion functions
var toHours = seconds => {return seconds / (60*60)}
var toMB = bytes => {return bytes / (1024 * 1024)}
//Routers=======

router.use("/static",express.static(path.join(__dirname,"public")));

router.get("/",(req,res)=>{
    res.redirect("/video");
})

router.get("/video", (req,res)=>{
    res.render(path.join(__dirname,'templates','downloader'));
});

router.get("/video/dllink", verifyToken, async (req,res)=>{
    if (!fs.existsSync(dir)){fs.mkdirSync(dir);}
    var quality = req.payload.quality;
    var videoID= req.payload.video;
    var videoTitle = req.payload.meta.videoTitle;
    //parse what's needed
    var contentLength = parseInt(req.payload.meta.contentLength);
    var audio = req.payload.audio;
    audio.contentLength = parseInt(audio.contentLength)
    //Files
    var fileName = quality+videoID+'_audified.mp4'
    var fileDir = path.join(dir, fileName)
    //Send Video, reject if not
    console.log(`[KYT Downloader] We got ${quality} for ${videoID}`);
    let videoFile = await VideoFileIfAvail(fileDir);
    if (videoFile){
        res.setHeader('Content-Disposition', contentDisposition(`${videoTitle}.mp4`))
        res.sendFile(videoFile,maxAge=3600);
    } else {
        res.json({code: 'Video was cleared from our servers, please make a new download link'})
    }

});// finish this !!!!

router.post("/fetch_token", expressSession, async (req,res)=>{
    if (!fs.existsSync(dir)){fs.mkdirSync(dir);}
    const formData = req.body;
    var itag = parseInt(formData.itag);
    var videoID = formData.videoID;
    if (!req.session?.allowed){
        response.AccessDenied(res, msg={code: "You are not authorized"});
        return;
    } else if (req.session?.current_video !== formData.videoID) {
        response.AccessDenied(res, msg={code: "An internal conflict was detected, refresh your browser"});
        return;
    }
    let selectedVideo = req.session.video_format.filter((element)=>{
        return element.itag === itag; 
    })[0];
    if (!selectedVideo){ response.AccessDenied(res, msg={code: "An internal conflict was detected, refresh your browser"}); return;}
    else if (parseInt(selectedVideo.contentLength)+ parseInt(req.session.audio.contentLength) > MAX_FILE){
        response.AccessDenied(res, msg={code: `Video too big ${toMB(parseInt(selectedVideo.contentLength)).toFixed(2)}MB/${toMB(MAX_FILE).toFixed(2)}MB`});
        return;
    }
    //Video Promise based response
    await (async (cleaned)=>{if (cleaned){console.log(`[KYT Downloader] Cleaned ${cleaned.toFixed(2)}MB from cache`)}})(await cleanCache(parseInt(selectedVideo.contentLength), path.resolve(dir)));
    var tokenData = {quality: itag, video: videoID, meta: {videoTitle: req.session.info.videoDetails.title, contentLength: parseInt(selectedVideo.contentLength)}, audio: req.session.audio}
    VideoProcess(videoID, itag, {contentLength: parseInt(selectedVideo.contentLength)}, req.session.audio).then(succ=>{
        if (succ?.result === 1){
            console.log('[KYT Downloader] The video is now on queue');
            res.json({"code": "queued"})
        } else if (succ?.result === 2){
            res.json({"code": "processing", status: succ.status})
        } else if (succ?.result === 3){
            console.log('[KYT Downloader] Job done successfully, send token');
            let token = createToken(tokenData,"4h");
            res.json({token:token})
        } else {
            res.json({"code": "Unknown response, this might be a bug"})
        }
    }).catch(err => {
        console.log(err)
        response.InternalError(res, msg={code: "Something went wrong (Prom_err)"});
    });
});

router.post("/fetch_video", expressSession, async (req,res)=>{
    if (!fs.existsSync(dir)){fs.mkdirSync(dir);}
    const formData = req.body; // Access the submitted form data
    var video_id = fetchYouTubeVideoId(formData.videoid);
    req.session.allowed = false;
    req.session.current_video = video_id;
    if (!video_id) {
        response.SendNotFound(res,msg={code: "ID not found/invalid"});
        return;
    } else if (video_id?.message) {
        response.SendNotFound(res,msg={code: video_id.message});
        return;
    }
    try {
        let info = await ytdl.getInfo(video_id);
        let video_format = Sortvideo(ytdl.filterFormats(info.formats, "video"));
        let audio_format = SortAudio(ytdl.filterFormats(info.formats, "audioonly"))[0]; // get the highest possible
        let video_details = info.videoDetails;
        let thumbnail = video_details.thumbnails.reverse()[0];
        let thumbnailb64 = await FetchtoBase(thumbnail.url);
        if(thumbnailb64.done) {response.InternalError(res, msg={code:'Error fetching details (code: th_f)'}); console.log(thumbnailb64.code); return;}
        if(parseInt(video_details.lengthSeconds) > MAX_LENGTH){response.AccessDenied(res, msg={code:`Video too long ${formatTime(parseInt(video_details.lengthSeconds))}/${formatTime(MAX_LENGTH)}`}); return;}
        // console.log(video_format);
        req.session.info = info;
        req.session.video_format = video_format;
        req.session.allowed = true;
        req.session.audio = {
            highestPossible: audio_format.itag,
            contentLength: parseInt(audio_format.contentLength)
        }
        res.render(path.join(__dirname,'templates','respondant'), {thumbnail_b64: thumbnailb64, video_details: video_details, video_format: video_format, audio_format: audio_format});
    } catch(err) {
        var error_message = err.message;
        var default_msg = 'Something went wrong (General err)';
        if (error_message.includes('No video id found')) {
            default_msg = error_message;
            response.SendNotFound(res, msg={code: default_msg});
            return;
        }
        console.log(err);
        response.InternalError(res, msg={code: default_msg});
    }
});

router.all(("*"),(req,res)=>{
    if (!fs.existsSync(dir)){fs.mkdirSync(dir);}
    response.SendNotFound(res);
});


module.exports = router;