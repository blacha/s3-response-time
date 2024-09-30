// main.go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"os"
	"sort"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

func get_range() string {
	current_chunk := rand.Intn(160) // 10MB source file split into 64kb chunks = 160 chunks

	chunk_start := current_chunk * 64 * 1024
	chunk_end := ((current_chunk + 1) * 64 * 1024) - 1
	req_range := fmt.Sprintf("bytes=%d-%d", chunk_start, chunk_end)
	return req_range
}

func read(svc *s3.S3, bucket_name string) (float64, error) {
	req_range := get_range()
	start := time.Now()
	rawObject, err := svc.GetObject(
		&s3.GetObjectInput{
			Bucket: aws.String(bucket_name),
			Key:    aws.String("10m.bin"),
			Range:  aws.String(req_range),
		})
	if err != nil {
		return 0, err
	}

	buf := new(bytes.Buffer)
	buf.ReadFrom(rawObject.Body)
	total_time := float64(time.Since(start).Nanoseconds()) / 1e6

	log.Println("total_time:", total_time, " range:", req_range)
	return total_time, nil
}

func do_request() (string, error) {

	bucket_name := os.Getenv("BUCKET_NAME")
	if bucket_name == "" {
		return "", errors.New("No bucket")
	}

	sess, _ := session.NewSession(&aws.Config{})
	svc := s3.New(sess)

	var read_64 []float64
	var warmup []float64
	for i := 0; i < 3; i++ {
		total_time, err := read(svc, bucket_name)
		if err != nil {
			return "", err
		}
		warmup = append(warmup, total_time)
	}

	for i := 0; i < 50; i++ {
		total_time, err := read(svc, bucket_name)
		if err != nil {
			return "", err
		}
		read_64 = append(read_64, total_time)
	}
	sort.Float64s(read_64)

	output := map[string][]float64{"warmup": warmup[:], "read64k": read_64[:]}
	out_bytes, err := json.Marshal(output)

	return string(out_bytes), err

}

func lambda_request(ctx context.Context, request events.LambdaFunctionURLRequest) (events.LambdaFunctionURLResponse, error) {
	out_str, err := do_request()
	return events.LambdaFunctionURLResponse{Body: out_str, StatusCode: 200}, err
}

func main() {
	runtime_api := os.Getenv("AWS_LAMBDA_RUNTIME_API")
	if runtime_api != "" {
		lambda.Start(lambda_request)
	} else {
		print(do_request())
	}
}
