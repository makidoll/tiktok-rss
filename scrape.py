from TikTokApi import TikTokApi
import json
import sys

if len(sys.argv) < 2:
    print("Please provide username")
    exit(1)

username = sys.argv[1]

api = TikTokApi.get_instance()
result = api.by_username(username, count=10)

print(json.dumps(result))