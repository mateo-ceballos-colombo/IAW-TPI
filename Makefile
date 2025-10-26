.PHONY: up up-build down down-delete

up:
	docker compose up -d

up-build:
	docker compose up -d --build

down:
	docker compose down

down-delete:
	docker compose down -v

