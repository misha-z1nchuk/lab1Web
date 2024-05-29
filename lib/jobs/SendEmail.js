/* eslint-disable more/no-duplicated-chains */
import { Queue, Worker } from 'bullmq';

import fetch       from 'node-fetch';
import EmailSender from '../infrastructure/notificator/Mail.js';
import config      from '../config.cjs';

import Job      from '../domain-model/Job.js';
import { Base } from './Base.js';

const notificator = new EmailSender({ mailOptions: config.mail });

export class SendEmail extends Base {
    constructor() {
        super();
    }

    static getQueue() {
        if (SendEmail.queue) return SendEmail.queue;

        SendEmail.queue = new Queue('SEND_EMAIL', {
            connection : SendEmail.connection
        });

        return SendEmail.queue;
    }

    initialize() {
        this.worker = new Worker(
            'SEND_EMAIL', this.execute,
            {
                connection       : SendEmail.connection,
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
        const { jobId, emails, subject, body } = job.data;

        const jobFromDb = await Job.findById(jobId);

        try {
            const result = await notificator.notifyUsers(subject, emails.map(e => ({ email: e })), body);

            jobFromDb.update({ status: 'SUCCESS', result });

            fetch('http://localhost:8080/v1/jobs/notify', {
                method  : 'POST',
                headers : {   'Content-Type': 'application/json' },
                body    : JSON.stringify({})
            });
        } catch (e) {
            console.log(e);
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
