import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomFill } from "node:crypto";
import { Buffer } from "node:buffer";
import assert from "node:assert";
const client = new S3Client();

const SourceFileSizeMb = 100;
const ReadSizeKb = [32, 64, 128, 256, 512, 768, 1024, 2048];

async function write(name: string, buff: Buffer): Promise<number> {
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

function shuffle<T>(array: T[]): void {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

async function head(name: string): Promise<boolean> {
  const ret = await client.send(
    new HeadObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: name })
  ).catch(_e => null)
  return (ret?.ContentLength ?? 0) > 0
}

const OneMb = 1024 * 1024;
async function read(name: string, size: number): Promise<number> {
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

  const buf = await new Response(ret.Body as BodyInit).arrayBuffer();
  assert.equal(buf.byteLength, size);

  return performance.now() - before;
}

export async function randomFile(): Promise<{ fileName: string, size: number }> {
  const size = SourceFileSizeMb * 1024 * 1024;
  const fileName = `${SourceFileSizeMb}m.bin`;

  const ex = await head(fileName)
  if (ex) return { fileName, size }
  const buf = Buffer.alloc(size);
  await new Promise((r) => randomFill(buf, r));

  await write(fileName, buf);
  return { fileName, size }
}

export async function handler() {
  const source = await randomFile();

  const metrics = {
    source,
    warmup: [] as number[],
    reads: {} as Record<string, number[]>,
    readOrder: [] as number[]
  };

  for (const r of ReadSizeKb) metrics.reads[r] = [];

  // Warmup
  for (let i = 0; i < 3; i++) {
    metrics.warmup.push(await read(source.fileName, 64 * 1024));
  }
  console.log("warmup:done", metrics);

  const readOrder = [...ReadSizeKb];
  shuffle(readOrder);

  for (const amount of readOrder) {
    metrics.reads[amount] = [];
    metrics.readOrder.push(amount);
    for (let i = 0; i < 50; i++) {
      metrics.reads[amount].push(await read(source.fileName, amount * 1024));
    }
    metrics.reads[amount].sort();
    console.log("read:done:" + amount, metrics.reads[amount]);
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metrics),
    isBase64Encoded: false,
  };
}
