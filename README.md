# Run local

export BUCKET_NAME=some-test-bucket
npx tsx src/bin.ts

# Deploy

npx cdk --app "npx tsx src/cdk.ts" deploy --all


# Invoke

wget https://......lambda-url.us-east-1.on.aws/