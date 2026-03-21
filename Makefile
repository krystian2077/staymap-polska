.PHONY: dev down migrate migrations superuser shell test lint

dev:
	docker compose up --build

down:
	docker compose down -v

migrate:
	docker compose exec backend python manage.py migrate

migrations:
	docker compose exec backend python manage.py makemigrations

superuser:
	docker compose exec backend python manage.py createsuperuser

shell:
	docker compose exec backend python manage.py shell_plus --ipython

test:
	docker compose exec backend pytest -q --no-cov

seed:
	docker compose exec backend python manage.py seed_db

lint:
	docker compose exec backend ruff check apps config
