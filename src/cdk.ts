import * as cdk from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as go from "@aws-cdk/aws-lambda-go-alpha";

export class S3BenchmarkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "S3BenchmarkBucket");
    const environment: Record<string, string> = {
      BUCKET_NAME: bucket.bucketName,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
    };

    const lf = new NodejsFunction(this, "S3BenchmarkLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 2048,
      timeout: cdk.Duration.seconds(60),
      handler: "index.handler",
      entry: "./src/lambda.ts",
      architecture: lambda.Architecture.X86_64,
      environment,
      logRetention: RetentionDays.ONE_MONTH,
    });
    bucket.grantReadWrite(lf);

    const lfGo = new go.GoFunction(this, "S3BenchmarkLambdaGo", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      memorySize: 2048,
      timeout: cdk.Duration.seconds(60),
      entry: "main.go",
      architecture: lambda.Architecture.X86_64,
      environment,
      logRetention: RetentionDays.ONE_MONTH,
    });

    bucket.grantRead(lfGo);

    const vpcId = scope.node.tryGetContext("vpc-id");
    if (vpcId) {
      const vpc = Vpc.fromLookup(this, "Vpc", { vpcId });

      const lf = new NodejsFunction(this, "S3BenchmarkLambdaVpc", {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 2048,
        timeout: cdk.Duration.seconds(60),
        handler: "index.handler",
        entry: "./src/lambda.ts",
        vpc,
        architecture: lambda.Architecture.X86_64,
        environment,
        logRetention: RetentionDays.ONE_MONTH,
      });
      bucket.grantReadWrite(lf);

      const lfGo = new go.GoFunction(this, "S3BenchmarkLambdaGoVpc", {
        runtime: lambda.Runtime.PROVIDED_AL2023,
        memorySize: 2048,
        timeout: cdk.Duration.seconds(60),
        entry: "main.go",
        vpc,
        architecture: lambda.Architecture.X86_64,
        environment,
        logRetention: RetentionDays.ONE_MONTH,
      });
      bucket.grantRead(lfGo);
    }

    // const functionUrlNode = new lambda.FunctionUrl(this, 'LambdaUrlNode', {
    //   function: lf,
    //   authType: lambda.FunctionUrlAuthType.NONE,
    // });
    // new cdk.CfnOutput(this, 'UrlNode', { value: functionUrlNode.url });

    // const functionUrlGo = new lambda.FunctionUrl(this, 'LambdaUrlGo', {
    //   function: lfGo,
    //   authType: lambda.FunctionUrlAuthType.NONE,
    // });
    // new cdk.CfnOutput(this, 'UrlGo', { value: functionUrlGo.url });
  }
}

const S3Benchmark = new cdk.App();

// new S3BenchmarkStack(S3Benchmark, 'S3Benchmark', { env: { region: 'us-east-1' } })
// new S3BenchmarkStack(S3Benchmark, 'S3Benchmark', { env: { region: 'us-west-2' } })

// new S3BenchmarkStack(S3Benchmark, 'S3BenchmarkApSe2', { env: { region: 'ap-southeast-2', account: process.env.CDK_DEFAULT_ACCOUNT } })
new S3BenchmarkStack(S3Benchmark, "S3BenchmarkApSe4", {
  env: { region: "ap-southeast-4", account: process.env.CDK_DEFAULT_ACCOUNT },
});
