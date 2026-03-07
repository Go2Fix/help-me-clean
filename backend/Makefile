.PHONY: help install generate migrate-up migrate-down migrate-new run test clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	go mod download
	go install github.com/99designs/gqlgen@latest
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

generate: ## Generate sqlc and gqlgen code
	@echo "Generating gqlgen..."
	go run github.com/99designs/gqlgen generate

migrate-up: ## Run database migrations up (both DATABASE_URL and DATABASE_URL_2)
	migrate -path internal/db/migrations -database "$${DATABASE_URL}" up
	@if [ -n "$${DATABASE_URL_2}" ]; then \
		echo "Running migrations on DATABASE_URL_2..."; \
		migrate -path internal/db/migrations -database "$${DATABASE_URL_2}" up; \
	fi

migrate-down: ## Run database migrations down (both DATABASE_URL and DATABASE_URL_2)
	migrate -path internal/db/migrations -database "$${DATABASE_URL}" down
	@if [ -n "$${DATABASE_URL_2}" ]; then \
		echo "Running down migrations on DATABASE_URL_2..."; \
		migrate -path internal/db/migrations -database "$${DATABASE_URL_2}" down; \
	fi

migrate-new: ## Create a new migration (usage: make migrate-new NAME=description)
	@test -n "$(NAME)" || (echo "NAME is required. Usage: make migrate-new NAME=description" && exit 1)
	migrate create -ext sql -dir internal/db/migrations -seq $(NAME)

run: ## Start the server
	go run cmd/server/main.go

test: ## Run tests
	go test -v ./...

clean: ## Clean generated files
	rm -rf internal/graph/generated.go
	rm -rf internal/graph/model/models_gen.go

.DEFAULT_GOAL := help
