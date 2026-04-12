import os
from dotenv import load_dotenv

load_dotenv()

firebase_config = {
    "projectId": os.getenv("PROJECT_ID"),
    "appId": os.getenv("APP_ID"),
    "apiKey": os.getenv("API_KEY"),
    "authDomain": os.getenv("AUTH_DOMAIN"),
    "firestoreDatabaseId": os.getenv("FIRESTORE_DATABASE_ID") or os.getenv("FIRE_STORE_DATABASE_ID"),
    "storageBucket": os.getenv("STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("MESSAGING_SENDER_ID"),
    "measurementId": os.getenv("MEASUREMENT_ID", ""),
}
