.PHONY: dev backend frontend test test-backend lint format seed clean

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

test: test-backend

test-backend:
	cd backend && python -m pytest tests/ -v

lint:
	cd backend && ruff check .

format:
	cd backend && ruff format .

seed:
	cd backend && python -m scripts.seed_data

clean:
	rm -f backend/database/*.duckdb backend/database/*.duckdb.wal
	rm -f backend/database/*.sqlite backend/database/*.sqlite-wal backend/database/*.sqlite-shm

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) backend & $(MAKE) frontend
