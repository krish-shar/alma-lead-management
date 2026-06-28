# Convenience targets for the local Docker Compose stack.
# `make up` then `make seed` is the full local bring-up. See docs/RUNNING.md.

.PHONY: up up-d build down down-v logs ps health seed test fmt

up: ## Build + start the whole stack (foreground)
	docker compose up --build

up-d: ## Build + start in the background
	docker compose up --build -d

build: ## Build images only
	docker compose build

down: ## Stop the stack
	docker compose down

down-v: ## Stop the stack AND wipe volumes (fresh DB + storage)
	docker compose down -v

logs: ## Tail logs from all services
	docker compose logs -f

ps: ## Show service status
	docker compose ps

health: ## Curl the backend health endpoint
	curl -s http://localhost:8000/api/health | python3 -m json.tool

migrate: ## Run database migrations (Alembic + Better Auth)
	docker compose exec -T backend alembic upgrade head
	docker compose exec -T frontend npx @better-auth/cli@latest migrate -y

# Full local bootstrap: app schema + auth schema + storage bucket + attorney account.
seed: ## Run all migrations, create the storage bucket, and seed the attorney
	docker compose exec -T backend alembic upgrade head
	docker compose exec -T backend python -c "from app.services.storage import get_storage; get_storage().ensure_bucket(); print('storage bucket ready')"
	docker compose exec -T frontend npx @better-auth/cli@latest migrate -y
	bash scripts/seed-attorney.sh

demo: ## Reset to a realistic demo dataset (sample leads + real resumes) and clear Mailpit
	docker compose cp scripts/sample-resumes backend:/tmp/sample-resumes
	docker compose exec -T backend python -m app.seed_demo /tmp/sample-resumes
	-curl -s -X DELETE http://localhost:8025/api/v1/messages >/dev/null
	@echo "Demo data seeded → http://localhost:3000  (login: maya.okafor@alma.law / almademo2026)"

test: ## Run all tests (backend pytest + frontend vitest)
	docker compose exec -T backend pytest
	docker compose exec -T frontend npm test

test-backend: ## Backend tests only
	docker compose exec -T backend pytest

test-frontend: ## Frontend tests only
	docker compose exec -T frontend npm test

fmt: ## Format/lint backend
	docker compose exec -T backend ruff check --fix app tests
