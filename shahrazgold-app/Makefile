.DEFAULT_GOAL := help

DOCKER_COMPOSE := docker compose
ARGS ?=

.PHONY: help build up down restart logs shell artisan composer migrate test queue clear key ps health db redis

help:
	@echo "ShahrazGold backend development commands"
	@echo "  make build                  Build application image"
	@echo "  make up                     Start all services"
	@echo "  make down                   Stop services (keeps data volumes)"
	@echo "  make restart                Restart all services"
	@echo "  make logs                   Follow service logs"
	@echo "  make shell                  Open a shell in app"
	@echo "  make artisan ARGS='about'   Run an Artisan command"
	@echo "  make composer ARGS='show'   Run a Composer command"
	@echo "  make migrate                Run migrations manually"
	@echo "  make test                   Run Laravel tests"
	@echo "  make queue                  Ensure queue worker is running"
	@echo "  make clear                  Clear Laravel caches"
	@echo "  make key                    Generate APP_KEY"
	@echo "  make health                 Show container health"

build:
	$(DOCKER_COMPOSE) build

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) restart

logs:
	$(DOCKER_COMPOSE) logs -f --tail=200

shell:
	$(DOCKER_COMPOSE) exec app sh

artisan:
	$(DOCKER_COMPOSE) exec app php artisan $(ARGS)

composer:
	$(DOCKER_COMPOSE) exec app composer $(ARGS)

migrate:
	$(DOCKER_COMPOSE) exec app php artisan migrate

test:
	$(DOCKER_COMPOSE) exec app php artisan test

queue:
	$(DOCKER_COMPOSE) up -d queue
	$(DOCKER_COMPOSE) ps queue

clear:
	$(DOCKER_COMPOSE) exec app php artisan optimize:clear

key:
	$(DOCKER_COMPOSE) exec app php artisan key:generate

ps:
	$(DOCKER_COMPOSE) ps

health: ps

db:
	$(DOCKER_COMPOSE) exec postgres psql -U shahrazgold -d shahrazgold

redis:
	$(DOCKER_COMPOSE) exec redis redis-cli ping
