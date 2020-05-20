rdb -c json ./dump.rdb | jq '.[0] | with_entries(select(.key|match("movie:annotations:v3:.*";"i"))) | map_values(keys|map(fromjson))'
