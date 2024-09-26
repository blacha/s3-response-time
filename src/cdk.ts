import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';


export class S3BenchmarkStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)
    const bucket = new Bucket(this, 'S3BenchmarkBucket')
    const environment: Record<string, string> = {
      BUCKET_NAME: bucket.bucketName,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };
    const lf = new NodejsFunction(this, 'S3BenchmarkLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 2048,
      timeout: cdk.Duration.seconds(60),
      handler: 'index.handler',
      entry: './src/lambda.ts',
      architecture: lambda.Architecture.ARM_64,
      environment,
      logRetention: RetentionDays.ONE_MONTH,
    });

    bucket.grantReadWrite(lf)

    const functionUrl = new lambda.FunctionUrl(this, 'LambdaCogUrl', {
      function: lf,
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, 'Url', { value: functionUrl.url });
  }
}


const S3Benchmark = new cdk.App();

new S3BenchmarkStack(S3Benchmark, 'S3Benchmark', { env: { region: 'us-east-1' } })