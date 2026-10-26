export interface Job<T> {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'queued' | 'running' | 'succeeded';
  result?: T;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobs = new Map<string, Job<any>>();

export const jobQueue = {
  create<T>(): Job<T> {
    const id = require('crypto').randomUUID();
    const job: Job<T> = {
      id,
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    jobs.set(id, job);
    return job;
  },

  get<T>(id: string): Job<T> | undefined {
    return jobs.get(id) as Job<T> | undefined;
  },

  update<T>(id: string, updates: Partial<Job<T>>) {
    const job = jobs.get(id);
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date() });
      jobs.set(id, job);
    }
  },

  async run<T>(id: string, task: () => Promise<T>) {
    this.update(id, { status: 'running' });
    try {
      const result = await task();
      this.update(id, { status: 'succeeded', result });
    } catch (error: any) {
      this.update(id, { status: 'failed', error: error.message || 'Unknown error' });
    }
  },
};
