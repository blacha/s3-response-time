import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomFill } from 'node:crypto'
import { Buffer } from 'node:buffer'
const client = new S3Client()

async function write(name, buff) {
  let before = performance.now();
  await client.send(new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: name,
    Body: buff
  }))
  return performance.now() - before;
}

async function read(name) {
  let before = performance.now();
  const ret = await client.send(new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: name,
  }))
  return performance.now() - before;
}

export async function handler() {

  const iterCount = 10;

  const metrics = {
    write1M: [],
    read1M: [],

    write64k: [],
    read64k: [],

    write32k: [],
    read32k: []
  }

  const buf1M = Buffer.alloc(1024 * 1024);
  await new Promise(r => randomFill(buf1M, r));

  const buf64 = buf1M.subarray(0, 64 * 1024)
  const buf32 = buf1M.subarray(0, 32 * 1024)
  // Warmup
  for (let i = 0; i < 5; i++) {
    await write('1m.bin', buf1M)
    await write('64k.bin', buf64)
    await write('32k.bin', buf32)
    await read('1m.bin')
    await read('64k.bin')
    await read('32k.bin')
  }

  for (let i = 0; i < iterCount; i++) {
    metrics.write1M.push(await write('1m.bin', buf1M))
    metrics.write1M.push(await write('1m.bin', buf1M))
    metrics.write1M.push(await write('1m.bin', buf1M))

    metrics.write64k.push(await write('64k.bin', buf64))
    metrics.write64k.push(await write('64k.bin', buf64))
    metrics.write64k.push(await write('64k.bin', buf64))

    metrics.write32k.push(await write('32k.bin', buf32))
    metrics.write32k.push(await write('32k.bin', buf32))
    metrics.write32k.push(await write('32k.bin', buf32))
  }

  for (let i = 0; i < iterCount; i++) {
    metrics.read1M.push(await read('1m.bin'))
    metrics.read1M.push(await read('1m.bin'))
    metrics.read1M.push(await read('1m.bin'))

    metrics.read64k.push(await read('64k.bin'))
    metrics.read64k.push(await read('64k.bin'))
    metrics.read64k.push(await read('64k.bin'))

    metrics.read32k.push(await read('32k.bin'))
    metrics.read32k.push(await read('32k.bin'))
    metrics.read32k.push(await read('32k.bin'))
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': "application/json",
    },
    body: JSON.stringify(metrics)
  }
}

