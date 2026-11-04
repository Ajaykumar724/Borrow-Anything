import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultFile = resolve(here, "../db/data.json");
const queues = new Map();

// Keep JSON details behind this replaceable repository interface.
export function createDbService(filePath = process.env.DATA_FILE || defaultFile) {
  const file = resolve(filePath);
  if (!queues.has(file)) queues.set(file, Promise.resolve());

  async function load() {
    return JSON.parse(await readFile(file, "utf8"));
  }
  async function save(data) {
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temp, file);
  }
  function serialize(operation) {
    const result = queues.get(file).then(operation);
    queues.set(file, result.catch(() => {}));
    return result;
  }

  return {
    async getAll(collection) {
      const data = await load();
      return Array.isArray(data[collection]) ? data[collection] : [];
    },
    async getById(collection, id) {
      return (await this.getAll(collection)).find((record) => record.id === id) ?? null;
    },
    async create(collection, record) {
      return serialize(async () => {
        const data = await load();
        data[collection] ??= [];
        data[collection].push(record);
        await save(data);
        return record;
      });
    },
    async update(collection, id, updates) {
      return serialize(async () => {
        const data = await load();
        const index = (data[collection] ?? []).findIndex((record) => record.id === id);
        if (index < 0) return null;
        data[collection][index] = { ...data[collection][index], ...updates };
        await save(data);
        return data[collection][index];
      });
    },
    async delete(collection, id) {
      return serialize(async () => {
        const data = await load();
        const index = (data[collection] ?? []).findIndex((record) => record.id === id);
        if (index < 0) return null;
        const [deleted] = data[collection].splice(index, 1);
        await save(data);
        return deleted;
      });
    }
  };
}

export const dbService = createDbService();
