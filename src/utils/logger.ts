import axios from 'axios';
import rTracer from 'cls-rtracer';
import { createLogger, format, transports } from 'winston';
import Transport from 'winston-transport';

export class OpenObserveTransport extends Transport {
  private url: string;

  private _buffer: any[] = [];

  private readonly batchSize: number;

  private isSending: boolean = false;

  private readonly maxRetries: number = 3;

  private retryCount: number = 0;

  constructor(
    private readonly opts: {
      node: string;
      organization: string;
      stream: string;
      batchSize?: number;
    },
  ) {
    super();
    this.url = `${this.opts.node}/api/${this.opts.organization}/${this.opts.stream}/_json`;
    this.batchSize = opts.batchSize || 50;
  }

  log(info: any, callback: any) {
    info._timestamp = info.timestamp;
    delete info.timestamp;
    info.trace_id = rTracer.id();
    delete info.traceId;
    this._buffer.push(info);
    if (!this.isSending && this._buffer.length >= this.batchSize) {
      this.isSending = true;
      this.flushBuffer(callback);
    } else {
      callback();
    }
  }

  private async sendLogs(logsToSend: any[]): Promise<void> {
    try {
      await axios.post(this.url, logsToSend, {
        headers: {
          'content-type': 'application/json',
          Authorization: `Basic ${process.env.OPENOBSERVE_TOKEN}`,
        },
      });

      this._buffer = this._buffer.slice(logsToSend.length); // Remove only the sent logs
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      console.log(error);
      console.error('Failed to send logs to OpenObserve:', this.url);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `Retrying... Attempt ${this.retryCount} of ${this.maxRetries}`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * this.retryCount),
        ); // Exponential backoff
        return this.sendLogs(logsToSend);
      }
      console.error('Max retries reached. Logs will be lost:', logsToSend);
      this._buffer = this._buffer.slice(logsToSend.length); // Still remove the logs to prevent infinite retry
    }
  }

  async flushBuffer(callback: any) {
    if (this._buffer.length === 0) {
      this.isSending = false;
      callback();
      return;
    }

    const logsToSend = [...this._buffer]; // Create a copy of the logs to send
    this.isSending = true;

    await this.sendLogs(logsToSend);

    this.isSending = false;
    if (this._buffer.length > 0) {
      this.flushBuffer(callback);
    } else {
      callback();
    }
  }
}

const { combine, timestamp, printf } = format;

const transport = new OpenObserveTransport({
  node: process.env.OPENOBSERVE_URL || '',
  organization: 'crobo',
  stream: `${process.env.NODE_ENV}-lunar`,
  batchSize: 10,
});

const myFormat = printf(({ level, message }) => {
  return `${rTracer.id() ? rTracer.id() : ''} ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(timestamp(), myFormat),
  transports: [new transports.Console(), transport],
});

export default logger;
