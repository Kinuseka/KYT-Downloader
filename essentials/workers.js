const {Worker} = require('bullmq');
const ffmpeg = require('fluent-ffmpeg');
const {PerformisePiper, audioFetch, videoFetch} = require("./videoProcessor")
const config_file = require('../config.json')

async function WorkerHandler(Job) {
    function percentageCallback(resp) {
        let currprog = Job.progress;
        currprog.progress = resp.percentage;
        currprog.status = resp?.callmsg || currprog.status;
        Job.updateProgress(currprog);
    }
    var {'0': vsize, '1': asize, '2': VideoID, '3': itag, '4': audioItag, '5': fileDir, '6': filemp3, '7': fileDone } = Job.data;
    console.log(VideoID, itag, audioItag, fileDir, filemp3, fileDone)
    Job.updateProgress({status:'Collecting audio', progress: 0})
    console.log("[Worker] Downloading audio to server... ", Job.id);
    let audios = await PerformisePiper(audioFetch, callback=percentageCallback, size = asize, VideoID, audioItag, filemp3);
    Job.updateProgress({status:'Collecting video', progress: 0})
    console.log("[Worker] Downloading video to server... ", Job.id);
    let video = await PerformisePiper(videoFetch, callback=percentageCallback, size = vsize, VideoID, itag, fileDir);
    console.log("[Worker] Combining audio and video ", Job.id);
    let ffmpipe = ffmpeg()
    .input(fileDir)
    .input(filemp3)
    .videoCodec("copy")
    .audioCodec("copy")
    .output(fileDone)
    ffmpipe.run()
    Job.updateProgress({status: 'Processing', progress: 0});
    await PerformisePiper(()=>{return ffmpipe;}, callback=percentageCallback);
}

const WorkerProc = new Worker("YoutubeProcessor", WorkerHandler, {
    connection: {
        host: config_file.redis.host,
        port: config_file.redis.port,
        removeOnComplete: { count: 0 },
        removeOnFail: { count: 0 },
}})

WorkerProc.on('failed',(job, error) => {
    console.log(job, error)
});

module.exports = WorkerProc