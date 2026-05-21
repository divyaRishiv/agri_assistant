import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

key = os.environ.get("GROQ_API_KEY")
print(f"Using GROQ_API_KEY: {key}")

client = OpenAI(
    api_key=key,
    base_url="https://api.groq.com/openai/v1"
)

try:
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "user", "content": "Hello! List 3 crops suitable for dry lands in India."}
        ],
        temperature=0.5,
    )
    print("Success!")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")
