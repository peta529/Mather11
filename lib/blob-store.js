const { put, head } = require('@vercel/blob');

const DATA_PATH = 'data.json';

async function readData() {
  try {
    const meta = await head(DATA_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    // Файла ещё нет — каталог только предстоит создать
    return null;
  }
}

async function writeData(data) {
  await put(DATA_PATH, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
}

module.exports = { readData, writeData };
