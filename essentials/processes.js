const {Queue, Worker, Job} = require('bullmq');
const fs = require("fs");
var config_file = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

class CombineQueue {
    constructor() {
        this.queue = new Queue('YoutubeProcessor', {
            connection: {
                host: config_file.redis.host,
                port: config_file.redis.port
            },
            limiter: {
                max: 2,
                duration: 2000
            }
        });
    }
    async addProcess(Ident, ...data){
        let existJob = await this.jobFind(Ident)
        if (existJob) {
            console.log("[CombineQueue] Job found:",Ident);
            if ((await existJob.getState()) == "failed") {
                console.log("[CombineQueue] Job found is failed, retry:", Ident);
                await existJob.remove()
                let Job = await this.queue.add("Video", {...data}, {jobId: Ident});
                return Job;
            }
            return existJob;
        } 
        //Add new Job
        let Job = await this.queue.add("Video", {...data}, {jobId: Ident});
        return Job;
    }
    async restartProcess(Ident, ...data){
        let existJob = await this.jobFind(Ident)
        if (existJob) {
            console.log("[CombineQueue] Job found, but will restart:", Ident);
            await existJob.remove()    
        }
        let Job = await this.queue.add("Video", {...data}, {jobId: Ident});
        return Job;
        
    }
    async jobFind(VideoID) {
        let Job = await this.queue.getJob(VideoID);
        return Job;
    }
};

module.exports = new CombineQueue()