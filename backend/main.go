package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/yayayahei/language-learning/backend/db"
	"github.com/yayayahei/language-learning/backend/handler"
	"github.com/yayayahei/language-learning/backend/transcript"
)

func main() {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "root:password@tcp(127.0.0.1:3306)/language_learning?parseTime=true"
	}

	conn, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Printf("WARNING: failed to open database: %v (running without DB)", err)
		conn = nil
	}

	if conn != nil {
		if err := conn.Ping(); err != nil {
			log.Printf("WARNING: failed to ping database: %v (running without DB)", err)
			conn.Close()
			conn = nil
		}
	}
	if conn != nil {
		fmt.Println("connected to MySQL")
	} else {
		fmt.Println("running without MySQL — API endpoints will return 503")
	}

	database := db.New(conn)
	if conn != nil {
		if err := database.InitSchema(); err != nil {
			log.Fatalf("failed to init schema: %v", err)
		}
		fmt.Println("schema initialized")
	}

	fetcher := transcript.NewFetcher()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)
	r.Use(dbGuardMiddleware(database))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if conn != nil {
			w.Write([]byte(`{"status":"ok","db":"connected"}`))
		} else {
			w.Write([]byte(`{"status":"ok","db":"disconnected"}`))
		}
	})

	handler.NewTranscriptHandler(database, fetcher).Register(r)
	handler.NewVideoHandler(database).Register(r)
	handler.NewInteractionHandler(database).Register(r)
	handler.NewWeakPointHandler(database).Register(r)
	handler.NewTrainingHandler(database).Register(r)
	handler.NewRewatchHandler(database).Register(r)
	handler.NewPDFHandler(database).Register(r)
	handler.NewPreciousUsageHandler(database).Register(r)

	// Serve React production build
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../frontend/dist"
	}
	serveStatic(r, staticDir)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func serveStatic(r chi.Router, staticDir string) {
	fs := http.FileServer(http.Dir(staticDir))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) >= 4 && r.URL.Path[:4] == "/api" {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		path := r.URL.Path
		fullPath := staticDir + path

		if _, err := os.Stat(fullPath); err == nil {
			fs.ServeHTTP(w, r)
			return
		}

		http.ServeFile(w, r, staticDir+"/index.html")
	})
}

func dbGuardMiddleware(d *db.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !d.Ready() && r.URL.Path != "/api/health" && len(r.URL.Path) >= 5 && r.URL.Path[:5] == "/api/" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusServiceUnavailable)
				w.Write([]byte(`{"error":"database unavailable"}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
