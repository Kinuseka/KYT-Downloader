const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

const config_file = require('../config.json')
const {dir} = require('../constant');
const CombineQueue = require("./processes");

const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));
const MAX_CACHE = config_file.Cache_size_GB/*gb*/ * (1024 * 1024 * 1024);

function getFileBytes(filename) {
  try {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats.size;
    return fileSizeInBytes;
  }catch(e) {
    console.log('cant find file')
    return 0;
  }
}

async function cleanCache(newFileSize, cacheDirectory) {
    var maxCacheSize = MAX_CACHE;
    const files = await fs.promises.readdir(cacheDirectory);
    let cacheSize = 0;
  
    // Calculate the total size of files in the cache
    for (const file of files) {
      const filePath = path.join(cacheDirectory, file);
      const stats = await fs.promises.stat(filePath);
      cacheSize += stats.size;
    }
    // Check if the cache size exceeds the maximum allowed size
    if (cacheSize + newFileSize > maxCacheSize) {
        console.log(maxCacheSize)
      // Sort the files in the cache by their access time (oldest first)
      const filesToClean = files
        .map((file) => ({
          filePath: path.join(cacheDirectory, file),
          accessTime: fs.statSync(path.join(cacheDirectory, file)).birthtimeMs,
        }))
        .sort((a, b) => a.accessTime - b.accessTime);
  
      let cleanedSize = 0;
      let i = 0;
  
      // Remove the oldest files until the cache size is within the limit
      while (cleanedSize < cacheSize + newFileSize - maxCacheSize && i < filesToClean.length) {
        const { filePath } = filesToClean[i];
        const stats = await fs.promises.stat(filePath);
  
        // Delete the file from the cache
        await fs.promises.unlink(filePath);

        cleanedSize += stats.size;
        i++;
      }
      if (cleanedSize !== 0){
        return cleanedSize / (1024 * 1024);
      }
    }
    return false
}

async function VideoProcess(VideoID, itag, meta, audio){
    var FinalID = itag+VideoID;
    var assumedFile = `${FinalID}_audified.mp4`;
    var assumedMP4 = `${FinalID}.mp4`;
    var assumedMP3 = `${FinalID}.mp3`;
    fileDone = path.join(dir, assumedFile);
    fileDir = path.join(dir,assumedMP4);
    filemp3 = path.join(dir,assumedMP3);
    //If file exists then check if the size of the file matches on what the api says
    //if not redownload the file, if it matches then keep using the file
    let job = await CombineQueue.jobFind(FinalID);
    let jobstate = await job?.getState() || null;
    if (jobstate == "active") {
      console.log('[KYT-VideoProcessor] Existing job found but still active', FinalID);
      let state = {assumedProgress: job.progress, jobQueue: jobstate};
      return {result: 2, status: state, fileDir: fileDir, filemp3: filemp3, fileDone: fileDone};
    } else if (jobstate == "failed") {
      console.log('[KYT-VideoProcessor] Existing job found but had failed', FinalID);
      let job = await CombineQueue.addProcess(Ident=FinalID, vsize=meta.contentLength, asize=audio.contentLength, VideoID, itag, audio.highestPossible, fileDir, filemp3, fileDone);
      return {result: 1, fileDir: fileDir, filemp3: filemp3, fileDone: fileDone};
    } else if (jobstate == "waiting") {
      console.log('[KYT-VideoProcessor] Job is on queue', FinalID);
      return {result: 1, fileDir: fileDir, filemp3: filemp3, fileDone: fileDone};
    }
    console.log('[KYT-VideoProcessor] File cache found for:', FinalID);
    var fileBytes = getFileBytes(fileDir) + getFileBytes(filemp3);
    if (fileBytes == meta.contentLength + audio.contentLength){
      return {result: 3, fileDir: fileDir, filemp3: filemp3, fileDone: fileDone}
    } else {
      console.log("[KYT-VideoProcessor] File cache incomplete/not found, downloading")
      ffmpipe = CombineQueue.restartProcess(Ident=FinalID, VideoID, itag, audio.highestPossible, fileDir, filemp3, fileDone);
      return {result: 1, fileDir: fileDir, filemp3: filemp3, fileDone: fileDone};
    }
}

async function VideoFileIfAvail(FilePath){
  if (await fileExists(FilePath)) {
    return FilePath;
  } 
  return false;
  
}

function GetJobFromID(VideoID){
  let job = CombineQueue.getJob(VideoID);
  return job
}

function videoFetch(VideoID, itag, saveto){
    let fileStream = fs.createWriteStream(saveto);
    let videoPipe = ytdl(VideoID, {quality: parseInt(itag)});
    videoPipe.pipe(fileStream);
    return videoPipe
    
}
function audioFetch(VideoID, itag, saveto){
    let fileStream = fs.createWriteStream(saveto);
    let audioPipe = ytdl(VideoID, {quality: parseInt(itag)});
    audioPipe.pipe(fileStream)
    return audioPipe
}

function PerformisePiper(target, callback, size=null, ...args) {
  return new Promise((resolve,reject)=>{
        const pipe = target(...args);
        var totalSize = size || 0;
        var dataRead = 0;
        var totalTime;
        pipe.on('response', resp=>{
          resp.on('data', function(data) {
            dataRead += data.length;
            var percent = parseFloat(((dataRead / totalSize)*100).toFixed(2));
            callback({percentage: percent});
          });
        })
        pipe.on('codecData', data => {
          totalTime = parseInt(data.duration.replace(/:/g, ''));
       })
        pipe.on('progress', resp=> {
          if (resp?.timemark){
            const time = parseInt(resp.timemark.replace(/:/g, ''))
             // AND HERE IS THE CALCULATION
            var percentage = ((time / totalTime) * 100).toFixed(2)
            callback({percentage: percentage});
          }
        });
        pipe.on('end', ()=>{
          resolve(true);
        })
        pipe.on('error', (error)=>{
          reject(error)
        })
      })
    }
module.exports = {VideoProcess, cleanCache, PerformisePiper, videoFetch, audioFetch, GetJobFromID, VideoFileIfAvail}