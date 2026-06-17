import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('DATABASE_URL')
conn = psycopg2.connect(url)
cur = conn.cursor()

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'saanidhyam_leads';")
columns = [row[0] for row in cur.fetchall()]
print("Actual Columns in DB:", columns)

if 'user_name' in columns:
    print("SUCCESS: user_name exists in this connection!")
else:
    print("FAILURE: user_name is MISSING in this connection.")
cur.close()
conn.close()