import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomFill } from "node:crypto";
import { Buffer } from "node:buffer";
import assert from "node:assert";
const client = new S3Client();

async function write(name, buff) {
  let before = performance.now();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: name,
      Body: buff,
    }),
  );
  return performance.now() - before;
}

const OneMb = 1024 * 1024;
async function read(name, size) {
  const chunks = OneMb / size;
  const chunk = Math.floor(Math.random() * chunks);
  const range = `bytes=${chunk * size}-${(chunk + 1) * size}`;
  console.log("read", { chunk, range });

  let before = performance.now();
  const ret = await client.send(
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: name,
      Range: `bytes=${chunk * size}-${(chunk + 1) * size - 1}`,
    }),
  );
  assert.equal(ret.ContentLength, size);
  assert.equal(ret.$metadata.attempts, 1);

  const buf = await new Response(ret.Body).arrayBuffer();
  assert.equal(buf.byteLength, size);

  return performance.now() - before;
}

export async function handler() {
  const size = 10 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  await new Promise((r) => randomFill(buf, r));

  const fileName = "10m.bin";

  const metrics = {
    source: { name: fileName, size },
    warmup: [],
    read64k: [],
  };

  await write(fileName, buf);

  // Warmup
  for (let i = 0; i < 3; i++) {
    metrics.warmup.push(await read(fileName, 64 * 1024));
  }
  console.log("warmup:done", metrics);

  for (let i = 0; i < 20; i++) {
    metrics.read64k.push(await read(fileName, 64 * 1024));
  }
  console.log("read:done", metrics);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metrics),
    isBase64Encoded: false,
  };
}
