.PHONY: build run dev

build:
	cd web && npm ci && npm run build
	go build -o server .

run: build
	./server

dev:
	cd web && npm run dev &
	go run main.go
