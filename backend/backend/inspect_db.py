import sqlite3
import os

db_path = "db.sqlite3"
if not os.path.exists(db_path):
    # Sprawdź też w backend/
    db_path = "backend/db.sqlite3"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    # Lista plików w bieżącym katalogu
    print(f"Current files: {os.listdir('.')}")
    exit(1)

print(f"Opening DB at {db_path}")
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Sprawdź tabele
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%listing%'")
    tables = cursor.fetchall()
    print(f"Listing tables found: {tables}")
    
    listing_table = None
    for t in tables:
        if t[0] == 'listings_listing':
            listing_table = t[0]
            break
            
    if listing_table:
        # 2. Count
        cursor.execute(f"SELECT COUNT(*) FROM {listing_table}")
        count = cursor.fetchone()[0]
        print(f"Total listings: {count}")
        
        # 3. Statuses
        cursor.execute(f"SELECT status, COUNT(*) FROM {listing_table} GROUP BY status")
        statuses = cursor.fetchall()
        print(f"Statuses: {statuses}")
        
        # 4. First 3 slugs and titles
        cursor.execute(f"SELECT id, slug, title, status FROM {listing_table} LIMIT 3")
        rows = cursor.fetchall()
        for r in rows:
            print(f"Listing: {r}")
    else:
        print("Table listings_listing NOT found")
        
    conn.close()
except Exception as e:
    print(f"SQLite error: {e}")
