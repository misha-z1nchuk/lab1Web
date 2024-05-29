/* eslint-disable more/no-duplicated-chains */
import fs                from 'fs';
import { Queue, Worker } from 'bullmq';

import fetch    from 'node-fetch';
import Job      from '../domain-model/Job.js';
import Contact  from '../domain-model/Contact.js';
import { Base } from './Base.js';

export class ImportContactsJob extends Base {
    constructor() {
        super();
    }

    static getQueue() {
        if (ImportContactsJob.queue) return ImportContactsJob.queue;

        ImportContactsJob.queue = new Queue('IMPORT_CONTACTS', {
            connection : ImportContactsJob.connection
        });

        return ImportContactsJob.queue;
    }

    initialize() {
        this.worker = new Worker(
            'IMPORT_CONTACTS', this.execute,
            {
                connection       : ImportContactsJob.connection,
                autorun          : true,
                concurrency      : 5,
                removeOnComplete : {
                    age   : 0,
                    count : 0
                },
                removeOnFail : {
                    age   : 0,
                    count : 0
                }
            }
        );
    }

    async execute(job) {
        try {} catch (e) {
            console.log(e);
        }

        const { jobId, userId, id } = job.data;

        let data;

        try {
            const file = await fs.promises.readFile(`./tmp/${id}.json`);

            data = JSON.parse(file);
        } catch (e) {
            console.log(e);
        }

        const jobFromDb = await Job.findById(jobId);

        try {
            await Contact.bulkCreate(data.map(c => ({ ...c, userId })));
            jobFromDb.update({ status: 'SUCCESS', result: { success: true } });
            await fs.promises.unlink(`./tmp/${id}.json`);

            fetch('http://localhost:8080/v1/jobs/notify', {
                method  : 'POST',
                headers : {   'Content-Type': 'application/json' },
                body    : JSON.stringify({})
            });
        } catch (e) {
            jobFromDb.update({ status: 'FAILED' });
            fetch('http://localhost:8080/v1/jobs/notify', {
                method  : 'POST',
                headers : {   'Content-Type': 'application/json' },
                body    : JSON.stringify({})
            });

            throw e;
        }
    }
}
