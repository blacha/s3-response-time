
# Read all the requests and merge them into single csv files
for size in '32' '64' '128' '256' '512' '1024' '2048'; 
do
    cat req_*.json | jq ".reads[\"${size}\"]" | jq -s -r "flatten(1) | @csv" > read_${size}.csv
done
