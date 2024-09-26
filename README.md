# AWS s3 response time checker

Deploy a lambda function into each region and check lambda -> s3 response time when querying random 32KB and 64KB chunks from a 1MB file


##  Run local

export BUCKET_NAME=some-test-bucket
npx tsx src/bin.ts

##  Deploy

```
npx cdk --app "npx tsx src/cdk.ts" deploy --all
```

## Invoke

```
wget https://......lambda-url.us-east-1.on.aws/
```

Time in MS to read the chunk

```json
{
  "read64k": [
    37.75073700000007,
    38.114675000000034,
    40.41489200000001,
    39.406310000000076,
    41.25809299999992,
    37.39724299999989,
    39.03514999999993,
    37.4983380000001,
    39.8579450000002
  ],
  "read32k": [
    40.46360600000003,
    47.14444299999991,
    43.559106000000156,
    42.11566000000016,
    44.35907299999985,
    34.24642400000016,
    41.57755099999986,
    28.361887000000024,
    33.53279100000009
  ]
}
```